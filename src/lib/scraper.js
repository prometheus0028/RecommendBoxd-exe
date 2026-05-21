import * as cheerio from 'cheerio';

const BASE_URL = 'https://letterboxd.com';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export async function scrapeWatchedMovies(username, pages = 1) {
  const movies = [];
  
  for (let p = 1; p <= pages; p++) {
    try {
      const urlSuffix = p === 1 ? '' : `page/${p}/`;
      const response = await fetch(`${BASE_URL}/${username}/films/${urlSuffix}`, { headers: HEADERS });
      if (response.status === 404) {
        throw new Error("User not found");
      }
      if (!response.ok) break;

      const html = await response.text();
      const $ = cheerio.load(html);
      
      const posters = $('[data-target-link*="/film/"]');
      if (posters.length === 0) break;
      
      posters.each((i, el) => {
        const link = $(el).attr('data-target-link');
        if (!link) return;
        const slug = link.replace('/film/', '').replace('/', '');
        
        let title = slug;
        const img = $(el).find('img');
        if (img.length > 0) {
          title = img.attr('alt') || slug;
        }
        
        // Rating is often on a sibling or child. Let's look up to the parent li and search for rating
        let rating = 0;
        const ratingSpan = $(el).closest('li').find('.rating');
        if (ratingSpan.length > 0) {
          const classStr = ratingSpan.attr('class');
          if (classStr) {
            const match = classStr.match(/rated-(\d+)/);
            if (match) {
              rating = parseInt(match[1], 10) / 2;
            }
          }
        }

        if (slug) {
          movies.push({
            slug,
            title,
            rating,
            watchCount: 1
          });
        }
      });
    } catch (e) {
      console.warn(`Failed to scrape watched page ${p}:`, e.message);
      if (e.message === "User not found") throw e;
      break;
    }
  }
  
  return movies;
}

export async function scrapeLikedMovies(username, pages = 1) {
  const slugs = new Set();
  
  for (let p = 1; p <= pages; p++) {
    try {
      const urlSuffix = p === 1 ? '' : `page/${p}/`;
      const response = await fetch(`${BASE_URL}/${username}/likes/films/${urlSuffix}`, { headers: HEADERS });
      if (!response.ok) break;

      const html = await response.text();
      const $ = cheerio.load(html);
      
      const posters = $('[data-target-link*="/film/"]');
      if (posters.length === 0) break;
      
      posters.each((i, el) => {
        const link = $(el).attr('data-target-link');
        if (link) {
          slugs.add(link.replace('/film/', '').replace('/', ''));
        }
      });
    } catch (e) {
      console.warn(`Failed to scrape likes page ${p}:`, e.message);
      break;
    }
  }
  
  return slugs;
}

export async function scrapeWatchlist(username, pages = 1) {
  const movies = [];
  
  for (let p = 1; p <= pages; p++) {
    try {
      const urlSuffix = p === 1 ? '' : `page/${p}/`;
      const response = await fetch(`${BASE_URL}/${username}/watchlist/${urlSuffix}`, { headers: HEADERS });
      if (!response.ok) break;

      const html = await response.text();
      const $ = cheerio.load(html);
      
      const posters = $('[data-target-link*="/film/"]');
      if (posters.length === 0) break;
      
      posters.each((i, el) => {
        const link = $(el).attr('data-target-link');
        if (!link) return;
        const slug = link.replace('/film/', '').replace('/', '');
        
        let title = slug;
        const img = $(el).find('img');
        if (img.length > 0) {
          title = img.attr('alt') || slug;
        }
        
        if (slug) {
          movies.push({
            slug,
            title
          });
        }
      });
    } catch (e) {
      console.warn(`Failed to scrape watchlist page ${p}:`, e.message);
      break;
    }
  }
  
  return movies;
}
