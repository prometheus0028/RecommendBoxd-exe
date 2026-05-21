import { scrapeWatchedMovies, scrapeLikedMovies, scrapeWatchlist } from '../../../lib/scraper';
import { combineCsvData } from '../../../lib/csv';
import { fetchLetterboxdRss } from '../../../lib/rss';
import { searchMovie, getMovieDetails, getRecommendations, discoverMovies, sleep } from '../../../lib/tmdb';
import { buildUserProfile, scoreAndRankCandidates, getTopGenre } from '../../../lib/ml';
import { checkRateLimit } from '../../../lib/rateLimit';

export async function POST(request) {
  try {
    // Secure Rate Limiting (10 requests per minute per IP)
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const rateLimitResult = checkRateLimit(ip, 10, 60 * 1000);
    
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded. Please wait a minute before requesting again.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit,
            'X-RateLimit-Remaining': rateLimitResult.remaining,
            'X-RateLimit-Reset': rateLimitResult.reset
          }
        }
      );
    }

    const formData = await request.formData();
    let username = formData.get('username');
    if (typeof username === 'string') username = username.trim();
    
    // Get CSV files if uploaded
    const watchedFile = formData.get('watchedCsv');
    const ratingsFile = formData.get('ratingsCsv');
    const watchlistFile = formData.get('watchlistCsv');

    // --- INPUT SANITIZATION & SECURITY ---
    
    // 1. Username validation
    if (username) {
      const usernameRegex = /^[a-zA-Z0-9_]{1,20}$/;
      if (!usernameRegex.test(username)) {
        return Response.json({ error: 'Invalid username format. Only letters, numbers, and underscores are allowed (max 20 characters).' }, { status: 400 });
      }
    }

    // 2. File size and extension validation (Max 500KB per file)
    const MAX_FILE_SIZE = 500 * 1024; // 500KB
    const filesToValidate = [watchedFile, ratingsFile, watchlistFile];
    
    for (const file of filesToValidate) {
      if (file && typeof file === 'object' && file.name) {
        if (file.size > MAX_FILE_SIZE) {
          return Response.json({ error: `File "${file.name}" exceeds the maximum allowed size of 500KB.` }, { status: 400 });
        }
        const fileNameLower = file.name.toLowerCase();
        if (!fileNameLower.endsWith('.csv') && !fileNameLower.endsWith('.txt')) {
          return Response.json({ error: `File "${file.name}" is not a valid CSV or TXT file.` }, { status: 400 });
        }
      }
    }

    // 3. Reject completely empty requests
    if (!username && !watchedFile && !ratingsFile && !watchlistFile) {
      return Response.json({ error: 'No valid input provided. Please enter a username or upload CSV files.' }, { status: 400 });
    }

    let watchedData = [];
    let watchlistData = [];
    let likedSlugs = new Set(); 

    if (!process.env.TMDB_API_KEY) {
      return Response.json({ error: 'TMDB_API_KEY is not configured on the server.' }, { status: 500 });
    }

    // --- HYBRID ARCHITECTURE ---
    if (ratingsFile || watchedFile || watchlistFile) {
      // 1. CSV IMPORT PATH (Override)
      const watchedCsv = watchedFile ? await watchedFile.text() : "";
      const ratingsCsv = ratingsFile ? await ratingsFile.text() : "";
      const watchlistCsv = watchlistFile ? await watchlistFile.text() : "";
      
      const combined = combineCsvData(ratingsCsv, watchedCsv, watchlistCsv);
      watchedData = combined.watched;
      watchlistData = combined.watchlist;
      
    } else if (username) {
      // 2. LIVE SCRAPING PATH
      try {
        console.log(`Attempting Live Scrape for ${username}...`);
        const [scrapedWatched, scrapedLikes, scrapedWatchlist] = await Promise.all([
          scrapeWatchedMovies(username, 1), 
          scrapeLikedMovies(username, 1),   
          scrapeWatchlist(username, 1)      
        ]);
        
        if (scrapedWatched && scrapedWatched.length > 0) {
          watchedData = scrapedWatched;
          likedSlugs = scrapedLikes;
          watchlistData = scrapedWatchlist;
        } else {
          throw new Error("Scraper returned 0 movies.");
        }
      } catch (scrapeError) {
        // 3. RSS FALLBACK PATH
        console.warn(`Live scrape failed. Falling back to RSS...`);
        const rssData = await fetchLetterboxdRss(username);
        
        watchedData = rssData.watchedMovies;
        likedSlugs = rssData.likedSlugs;
        // RSS doesn't give watchlist. We will try a lightweight fetch for watchlist just in case
        try {
          watchlistData = await scrapeWatchlist(username, 1);
        } catch (e) {
          watchlistData = [];
        }
        
        if (watchedData.length === 0) {
           return Response.json({ error: `Could not fetch data for ${username} via Scraper or RSS. Please use CSV Import.` }, { status: 404 });
        }
      }
    } else {
      return Response.json({ error: 'Please provide either a Username or upload CSV files.' }, { status: 400 });
    }

    if (watchedData.length === 0) {
      return Response.json({ error: 'No watched movies found in the provided data.' }, { status: 404 });
    }

    // Process top 40 watched for profile to stay within limits
    // SORT by highest rated first so the ML profile and Top Genre are based on ALL-TIME FAVORITES!
    const watchedMovies = [...watchedData].sort((a, b) => {
      if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
      // Fallback to recent if ratings are the same
      if (a.date && b.date) return new Date(b.date) - new Date(a.date);
      return 0;
    }).map(m => ({
      ...m,
      liked: m.liked !== undefined ? m.liked : likedSlugs.has(m.slug)
    })).slice(0, 40); // Restored to 40 for max accuracy

    const watchlist = watchlistData.slice(0, 30); // Restored to 30

    // Helper: Map LB items to TMDB details using chunked concurrency
    // This perfectly balances raw speed with ISP safety!
    async function enrichWithTmdb(items) {
      const enriched = [];
      const CHUNK_SIZE = 15; 
      
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(async (item) => {
          const tmdbSearch = await searchMovie(item.title);
          if (tmdbSearch) {
            const details = await getMovieDetails(tmdbSearch.id);
            if (details) return { ...item, details };
          }
          return null;
        });
        
        const results = await Promise.all(promises);
        results.forEach(r => { if (r) enriched.push(r); });
        
        if (i + CHUNK_SIZE < items.length) {
          await sleep(250); // Tiny pause between chunks
        }
      }
      return enriched;
    }

    // Enrich Watched and Watchlist
    const [enrichedWatched, enrichedWatchlist] = await Promise.all([
      enrichWithTmdb(watchedMovies),
      enrichWithTmdb(watchlist)
    ]);

    // Build User Profile
    const profileVector = buildUserProfile(enrichedWatched);

    // Exclude both watched AND watchlist movies from the discovery sections!
    let excludeData = watchedData.concat(watchlistData);

    // CATEGORY 1: Watchlist Recommendations
    let watchlistRecommendations = scoreAndRankCandidates(
      enrichedWatchlist.map(w => w.details), 
      profileVector, 
      enrichedWatched, 
      12,
      false, // Do not filter quality for user's explicit watchlist
      watchedData // Only exclude watched from watchlist section
    );
    
    // Explicitly label the reason so users don't get confused
    watchlistRecommendations = watchlistRecommendations.map(m => ({
      ...m,
      reason: m.reason && m.reason !== "Based on your overall watch history." 
        ? `From your Watchlist: ${m.reason}` 
        : 'On your Watchlist'
    }));

    // CATEGORY 2: Based on Liked
    const likedSeeds = [...enrichedWatched]
      .filter(m => m.liked || m.rating >= 4)
      .slice(0, 40); // Take top 40 liked
    
    let likedCandidatesRaw = [];
    const likedChunks = [];
    for (let i = 0; i < likedSeeds.length; i += 15) likedChunks.push(likedSeeds.slice(i, i + 15));
    
    for (const chunk of likedChunks) {
      const promises = chunk.map(async (seed) => {
        if (seed.details) {
          const recs = await getRecommendations(seed.details.id);
          return recs.map(r => ({ ...r, reason: `Similar to ${seed.title} which you liked.` }));
        }
        return [];
      });
      const results = await Promise.all(promises);
      results.forEach(recs => likedCandidatesRaw.push(...recs));
      await sleep(250);
    }
    const likedRecommendations = scoreAndRankCandidates(likedCandidatesRaw, profileVector, enrichedWatched, 12, true, excludeData);
    
    // Prevent these exact movies from showing up in other categories
    excludeData = excludeData.concat(likedRecommendations);

    // CATEGORY 3: Based on Recently Watched (Top 50)
    // We must grab the actual recent movies from watchedData, since enrichedWatched is now sorted by rating!
    const trueRecentSeeds = await enrichWithTmdb([...watchedData].slice(0, 50));
    let recentCandidatesRaw = [];
    const recentChunks = [];
    for (let i = 0; i < trueRecentSeeds.length; i += 15) recentChunks.push(trueRecentSeeds.slice(i, i + 15));
    
    for (const chunk of recentChunks) {
      const promises = chunk.map(async (seed) => {
        if (seed && seed.details) {
          const recs = await getRecommendations(seed.details.id);
          return recs.map(r => ({ ...r, reason: `Because you recently watched ${seed.title}.` }));
        }
        return [];
      });
      const results = await Promise.all(promises);
      results.forEach(recs => recentCandidatesRaw.push(...recs));
      await sleep(250);
    }
    const recentRecommendations = scoreAndRankCandidates(recentCandidatesRaw, profileVector, enrichedWatched, 12, true, excludeData);
    
    // Prevent these exact movies from showing up in Top Genre
    excludeData = excludeData.concat(recentRecommendations);

    // CATEGORY 4: Top Genre
    const topGenre = getTopGenre(enrichedWatched);
    let genreRecommendations = [];
    if (topGenre.id) {
      const genreCandidatesRaw = await discoverMovies(topGenre.id);
      genreRecommendations = scoreAndRankCandidates(genreCandidatesRaw, profileVector, enrichedWatched, 12, true, excludeData);
      // Give them a specific reason
      genreRecommendations = genreRecommendations.map(m => ({
        ...m,
        reason: `Popular in your most watched genre: ${topGenre.name}`
      }));
    }

    // Send response
    return Response.json({
      topGenreName: topGenre.name || 'Unknown',
      watchlist: watchlistRecommendations,
      liked: likedRecommendations,
      recent: recentRecommendations,
      genre: genreRecommendations
    });

  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
