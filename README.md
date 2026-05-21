# Recommendboxd.exe 💽

A nostalgic, Windows XP-themed recommendation engine for Letterboxd. It analyzes your watched movies, liked films, and watchlist to provide highly accurate, genre-aware movie recommendations—wrapped in a beautiful, retro aesthetic!

## Features 🚀
- **Live Scraping & CSV Support:** Connect directly via your Letterboxd username or upload your data exports (Watched, Ratings, Watchlist).
- **Advanced Machine Learning Engine:** Utilizes TF-IDF algorithms and Cosine Similarity to score movies based on your personal 19-dimensional genre profile.
- **TMDB Enrichment:** Pulls high-quality movie posters, ratings, and backend metadata live from The Movie Database.
- **Retro Windows XP Aesthetic:** Features draggable "windows", classic Start button styling, a "Bliss" wallpaper background, CRT scanlines, and 8-bit exploding pixel animations for managing your buffer!
- **Fully Responsive & Secure:** Scales perfectly on mobile devices. Features built-in API rate limiting, username sanitization, and file size protection to guard against scraping abuse.

## Tech Stack 🛠
- **Frontend:** React, Next.js (App Router), Custom CSS
- **Backend:** Node.js, Next.js Edge APIs
- **Scraping:** Cheerio
- **Data Enrichment:** TMDB API

## Getting Started 💻

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory and add your TMDB API Key:
```env
TMDB_API_KEY=your_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result!

## Creator 👨‍💻
Developed by [prometheus0028](https://github.com/prometheus0028).
