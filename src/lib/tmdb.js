const TMDB_BASE_URL = 'https://api.tmdb.org/3';

// Add a tiny delay helper to prevent spamming
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchTmdb(endpoint, params = {}, retries = 5) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY is not set in environment variables.');
  }

  const queryParams = new URLSearchParams({
    api_key: apiKey,
    ...params
  });

  const directUrl = `${TMDB_BASE_URL}${endpoint}?${queryParams.toString()}`;

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(directUrl, {
        cache: 'no-store',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!res.ok) {
        throw new Error(`TMDB API Error: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (e) {
      if (i === retries - 1) {
        throw new Error(`Failed after ${retries} retries. ${e.message}`);
      }
      // Wait before retrying (exponential backoff)
      await sleep(1000 + (i * 1000));
    }
  }
}

export async function searchMovie(title) {
  try {
    const data = await fetchTmdb('/search/movie', {
      query: title,
      page: 1,
      include_adult: false
    });
    
    if (data && data.results && data.results.length > 0) {
      // Find exact match or first result
      const exactMatch = data.results.find(m => m.title.toLowerCase() === title.toLowerCase());
      return exactMatch || data.results[0];
    }
    return null;
  } catch (e) {
    console.error("TMDB Search Error for", title, e.message);
    return null;
  }
}

export async function getMovieDetails(tmdbId) {
  try {
    return await fetchTmdb(`/movie/${tmdbId}`);
  } catch (e) {
    console.error("TMDB Details Error for", tmdbId, e.message);
    return null;
  }
}

export async function getRecommendations(tmdbId) {
  try {
    const data = await fetchTmdb(`/movie/${tmdbId}/recommendations`);
    return data && data.results ? data.results : [];
  } catch (e) {
    console.error("TMDB Recommendations Error for", tmdbId, e.message);
    return [];
  }
}

export async function discoverMovies(genreId) {
  try {
    const data = await fetchTmdb('/discover/movie', {
      with_genres: genreId,
      sort_by: 'popularity.desc',
      'vote_count.gte': 1500,
      'vote_average.gte': 6.5,
      include_adult: false,
      page: 1
    });
    return data && data.results ? data.results : [];
  } catch (e) {
    console.error("TMDB Discover Error for genre", genreId, e.message);
    return [];
  }
}
