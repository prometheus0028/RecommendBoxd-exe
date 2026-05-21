import Parser from 'rss-parser';

const parser = new Parser();

export async function fetchLetterboxdRss(username) {
  try {
    const feed = await parser.parseURL(`https://letterboxd.com/${username}/rss/`);
    
    const watchedMovies = [];
    const likedSlugs = new Set();
    const watchlistMovies = []; // RSS doesn't give watchlist, but we keep format uniform

    feed.items.forEach(item => {
      // The link usually looks like: https://letterboxd.com/username/film/the-godfather/
      const match = item.link.match(/\/film\/([^\/]+)\/?/);
      if (!match) return;
      const slug = match[1];

      // Title usually looks like: "The Godfather, 1972 - ★★★★★" or "Watched The Godfather"
      let title = item.title;
      let rating = 0;

      // Extract Rating if present (count the stars)
      if (title.includes('★')) {
        const starsMatch = title.match(/([★½]+)/);
        if (starsMatch) {
          const stars = starsMatch[1];
          rating = (stars.match(/★/g) || []).length;
          if (stars.includes('½')) rating += 0.5;
        }
      }

      // Clean Title
      // Remove rating and year from title string e.g. "The Godfather, 1972 - ★★★★★"
      title = title.split(',')[0].replace(/^Watched: /, '').trim();

      // We can infer a 'like' if rating is high (>=4) since RSS doesn't explicitly mark likes
      const liked = rating >= 4;
      if (liked) likedSlugs.add(slug);

      // Check if already added (user might log the same movie multiple times)
      const existing = watchedMovies.find(m => m.slug === slug);
      if (existing) {
        existing.watchCount += 1;
        if (rating > existing.rating) existing.rating = rating; // keep highest rating
      } else {
        watchedMovies.push({
          title,
          slug,
          rating,
          liked,
          watchCount: 1
        });
      }
    });

    return { watchedMovies, likedSlugs, watchlistMovies };
  } catch (error) {
    console.error("RSS Fetch Error:", error.message);
    throw new Error("Failed to fetch Letterboxd RSS feed.");
  }
}
