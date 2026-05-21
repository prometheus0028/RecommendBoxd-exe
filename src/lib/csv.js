import { parse } from 'csv-parse/sync';

/**
 * Extracts a movie slug from a Letterboxd URI
 * e.g. "https://letterboxd.com/film/the-godfather/" -> "the-godfather"
 */
function extractSlug(uri) {
  if (!uri) return '';
  const match = uri.match(/\/film\/([^\/]+)\/?/);
  return match ? match[1] : '';
}

/**
 * Parses Letterboxd CSV contents and returns structured data
 */
export function parseLetterboxdCsv(csvContent, type) {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true // Support Byte Order Mark if present
    });

    const parsedData = [];

    for (const record of records) {
      // Be lenient with header names
      const uriStr = record['Letterboxd URI'] || record['letterboxd uri'] || record['URI'] || record['URL'];
      const nameStr = record['Name'] || record['name'] || record['Title'] || record['title'];
      const dateStr = record['Watched Date'] || record['Date'] || record['date'] || '';
      
      if (!nameStr) continue;

      let slug = extractSlug(uriStr);
      // If it's a boxd.it shortlink or missing, generate a standard slug from the title
      if (!slug) {
        slug = nameStr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }

      let item = {
        title: nameStr,
        year: record['Year'] || record['year'],
        slug: slug,
        date: dateStr
      };

      if (type === 'ratings') {
        item.rating = parseFloat(record['Rating'] || record['rating']) || 0;
        item.watched = true;
      } else if (type === 'watched') {
        item.watched = true;
      } else if (type === 'watchlist') {
        item.watchlist = true;
      }

      parsedData.push(item);
    }
    
    if (parsedData.length === 0 && records.length > 0) {
       const foundHeaders = Object.keys(records[0]).join(', ');
       console.error(`CSV parsing issue: Found ${records.length} rows but 0 valid movie URLs. Headers found:`, foundHeaders);
       throw new Error(`Failed to extract movies. First row looks like this: ${JSON.stringify(records[0])}. Please send this to me!`);
    }

    return parsedData;
  } catch (error) {
    console.error(`Error parsing ${type} CSV:`, error);
    throw new Error(error.message);
  }
}

/**
 * Combines parsed CSVs into unified arrays for watched/liked and watchlist
 */
export function combineCsvData(ratingsCsv = "", watchedCsv = "", watchlistCsv = "") {
  const movieMap = new Map();

  function merge(dataArray, defaultProps) {
    for (const item of dataArray) {
      if (movieMap.has(item.slug)) {
        movieMap.set(item.slug, { ...movieMap.get(item.slug), ...item, ...defaultProps });
      } else {
        movieMap.set(item.slug, { ...item, ...defaultProps });
      }
    }
  }

  if (watchedCsv) merge(parseLetterboxdCsv(watchedCsv, 'watched'), {});
  if (ratingsCsv) merge(parseLetterboxdCsv(ratingsCsv, 'ratings'), { watched: true });
  if (watchlistCsv) merge(parseLetterboxdCsv(watchlistCsv, 'watchlist'), {});

  const allMovies = Array.from(movieMap.values());

  const watched = allMovies.filter(m => m.watched).map(m => ({
    title: m.title,
    slug: m.slug,
    rating: m.rating || 0,
    liked: m.rating && m.rating >= 4 ? true : false,
    watchCount: 1,
    date: m.date
  }));

  // Sort descending by date so the most recent is at index 0
  watched.sort((a, b) => {
    if (a.date && b.date) {
      return new Date(b.date) - new Date(a.date);
    }
    return 0;
  });

  const watchlist = allMovies.filter(m => m.watchlist && !m.watched).map(m => ({
    title: m.title,
    slug: m.slug
  }));

  return { watched, watchlist };
}
