async function test() {
  const csvModule = await import('./src/lib/csv.js');
  
  const watchedCsv = `Date,Name,Year,Letterboxd URI
2023-10-25,The Godfather,1972,https://letterboxd.com/film/the-godfather/
2023-10-26,Interstellar,2014,https://letterboxd.com/film/interstellar/`;

  const ratingsCsv = `Date,Name,Year,Letterboxd URI,Rating
2023-10-25,The Godfather,1972,https://letterboxd.com/film/the-godfather/,5
2023-10-26,Interstellar,2014,https://letterboxd.com/film/interstellar/,4`;

  const watchlistCsv = `Date,Name,Year,Letterboxd URI
2023-10-27,Dune,2021,https://letterboxd.com/film/dune-2021/`;

  const combined = csvModule.combineCsvData(ratingsCsv, watchedCsv, watchlistCsv);
  console.log(JSON.stringify(combined, null, 2));
}

test().catch(console.error);
