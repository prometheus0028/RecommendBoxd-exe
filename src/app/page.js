/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/static-components */
'use client';

import { useState, useEffect } from 'react';
import { Film, Minus, X, Square } from 'lucide-react';

export default function Home() {
  const [username, setUsername] = useState('');
  const [watchedFile, setWatchedFile] = useState(null);
  const [ratingsFile, setRatingsFile] = useState(null);
  const [watchlistFile, setWatchlistFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [loadingJoke, setLoadingJoke] = useState('');
  const [homeJoke, setHomeJoke] = useState('');

  useEffect(() => {
    setMounted(true);
    const homeJokes = [
      'Ready to discover your next 5-star obsession?',
      'Warning: May cause intense urges to buy expensive popcorn.',
      'The Matrix has you... but we have your movie recommendations.',
      "Do you like scary movies? Or maybe rom-coms? Let's find out.",
      "Get in loser, we're going movie shopping.",
      'First rule of Fight Club: You do not talk about your guilty pleasure movies.',
      "Here's looking at your watchlist, kid.",
    ];
    setHomeJoke(homeJokes[Math.floor(Math.random() * homeJokes.length)]);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username && !watchedFile && !ratingsFile && !watchlistFile) {
      setError('Please provide a username OR upload CSV files.');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    const movieJokes = [
      'Asking HAL 9000 for movie recommendations...',
      'Reticulating splines... and finding good movies...',
      'Hold onto your butts...',
      "Where we're going, we don't need roads... just popcorn.",
      "I'll be back... with your recommendations.",
      'May the Force be with this ML algorithm...',
      'To infinity and beyond the TMDB API limits!',
      'Frankly, my dear, I do give a damn about your taste in movies.',
      'I feel the need... the need for speed (but API limits apply).',
      "We're gonna need a bigger popcorn bucket...",
      'Houston, we have a recommendation.',
      'Just keep swimming... through the Letterboxd database...',
      "I am serious... and don't call me Shirley while I load these.",
    ];
    setLoadingJoke(movieJokes[Math.floor(Math.random() * movieJokes.length)]);

    const formData = new FormData();
    if (username) formData.append('username', username);
    if (watchedFile) formData.append('watchedCsv', watchedFile);
    if (ratingsFile) formData.append('ratingsCsv', ratingsFile);
    if (watchlistFile) formData.append('watchlistCsv', watchlistFile);

    try {
      const res = await fetch(`/api/recommend`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch recommendations');
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const MovieGrid = ({ movies, fallbackMsg }) => {
    const [visibleCount, setVisibleCount] = useState(5);
    const [explodingId, setExplodingId] = useState(null);
    const [hiddenIds, setHiddenIds] = useState(new Set());

    // Pick a joke ONCE when the component mounts so it's always random per category and doesn't flash
    const [emptyJoke] = useState(() => {
      const jokes = [
        '*Woof* you watch a lot of movies! We are completely out of recommendations for this category.',
        "Holy popcorn! You've literally watched every backup recommendation we had in the vault.",
        "Error 404: Social life not found. You've cleared out this entire category!",
        "Are you secretly Martin Scorsese? Because you've seen literally everything we have to offer here.",
        'Algorithm status: Defeated. You have officially watched more movies than this computer can comprehend.',
        "We tried to find you a new movie, but you've already seen them all. Time to touch some grass!",
        "Congratulations! You've beaten the final boss of Letterboxd. Please wait for the sequel.",
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    });

    if (!movies || movies.length === 0) {
      return <p style={{ color: '#aaa', fontSize: '16px' }}>{fallbackMsg}</p>;
    }

    const availableMovies = movies.filter((m) => !hiddenIds.has(m.id));
    const visibleMovies = availableMovies.slice(0, visibleCount);

    if (visibleMovies.length === 0) {
      return (
        <p
          style={{
            color: 'var(--lb-orange)',
            fontSize: '16px',
            fontStyle: 'italic',
            padding: '10px',
            border: '1px dashed var(--lb-orange)',
          }}
        >
          {emptyJoke}
        </p>
      );
    }

    const handleWatchedIt = (e, id) => {
      e.preventDefault();
      e.stopPropagation();
      setExplodingId(id);
      setTimeout(() => {
        setHiddenIds((prev) => new Set(prev).add(id));
        setExplodingId(null);
      }, 500); // Wait for explosion animation to finish
    };

    return (
      <div className="movie-grid">
        {visibleMovies.map((movie) => {
          const isExploding = explodingId === movie.id;
          return (
            <a
              key={movie.id}
              href={`https://letterboxd.com/tmdb/${movie.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: 'none',
                display: 'block',
                position: 'relative',
              }}
            >
              <div
                className={`movie-card ${isExploding ? 'movie-exploding' : ''}`}
                style={{ cursor: 'pointer', transition: 'transform 0.1s' }}
                onMouseEnter={(e) => {
                  if (!isExploding)
                    e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  if (!isExploding)
                    e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <button
                  className="watched-toggle"
                  onClick={(e) => handleWatchedIt(e, movie.id)}
                  title="Remove this movie and get a new one"
                >
                  Watched It?
                </button>
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                    alt={movie.title}
                    className="movie-poster"
                  />
                ) : (
                  <div
                    className="movie-poster"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      textAlign: 'center',
                      fontSize: '12px',
                      padding: '10px',
                    }}
                  >
                    {movie.title}
                  </div>
                )}
                <div className="movie-title">{movie.title}</div>
                <div className="movie-reason">{movie.reason}</div>
              </div>
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Background Decor 1: Notepad */}
      <div
        className="xp-window-bg bg-notepad"
        style={{
          top: '10%',
          left: '5%',
          width: '400px',
          height: '300px',
          zIndex: -2,
        }}
      >
        <div className="xp-titlebar">
          <div className="xp-title">📝 notes.txt - Notepad</div>
          <div className="xp-controls">
            <button className="xp-btn">
              <Minus size={12} />
            </button>
            <button className="xp-btn">
              <Square size={10} />
            </button>
            <button className="xp-btn close">
              <X size={12} />
            </button>
          </div>
        </div>
        <div
          style={{
            backgroundColor: '#fff',
            color: '#000',
            padding: '10px',
            height: '100%',
            fontFamily: 'monospace',
            fontSize: '16px',
          }}
        >
          To-do list:
          <br />
          - watch more movies
          <br />
          - touch grass
          <br />- buy popcorn
        </div>
      </div>

      {/* Background Decor 2: Folder */}
      <div
        className="xp-window-bg bg-folder"
        style={{
          bottom: '10%',
          right: '5%',
          width: '350px',
          height: '250px',
          zIndex: -1,
        }}
      >
        <div className="xp-titlebar">
          <div className="xp-title">📁 Movies to watch</div>
          <div className="xp-controls">
            <button className="xp-btn">
              <Minus size={12} />
            </button>
            <button className="xp-btn">
              <Square size={10} />
            </button>
            <button className="xp-btn close">
              <X size={12} />
            </button>
          </div>
        </div>
        <div
          style={{
            backgroundColor: '#fff',
            height: '100%',
            padding: '15px',
            display: 'flex',
            gap: '25px',
            flexWrap: 'wrap',
            alignContent: 'flex-start',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', lineHeight: 1 }}>📁</div>
            <div style={{ color: '#000', fontSize: '14px', marginTop: '5px' }}>
              Action
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', lineHeight: 1 }}>📁</div>
            <div style={{ color: '#000', fontSize: '14px', marginTop: '5px' }}>
              Sci-Fi
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', lineHeight: 1 }}>🎥</div>
            <div style={{ color: '#000', fontSize: '14px', marginTop: '5px' }}>
              movie.mp4
            </div>
          </div>
        </div>
      </div>

      {/* Main Application Window */}
      <div className="xp-window main-window" style={{ maxWidth: "850px", margin: "20px 0", zIndex: 10, position: "relative" }}>
        <div className="xp-titlebar">
          <div className="xp-title">
            <Film size={16} style={{ marginRight: '5px' }} />
            <span> recommendboxd.exe</span>
          </div>
          <div className="xp-controls">
            <button className="xp-btn">
              <Minus size={12} />
            </button>
            <button className="xp-btn">
              <Square size={10} />
            </button>
            <button className="xp-btn close">
              <X size={12} />
            </button>
          </div>
        </div>

        <div className="xp-content">
          {!loading && (
            <div
              style={{
                textAlign: 'center',
                marginBottom: '20px',
                padding: '0 10px',
              }}
            >
              <h1 style={{ color: 'var(--lb-green)', wordWrap: 'break-word' }}>
                MOVIE MATCHMAKER
              </h1>
              <p style={{ fontStyle: 'italic', color: 'var(--lb-orange)' }}>
                {homeJoke}
              </p>
            </div>
          )}

          {!loading && !results && (
            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  border: '2px solid #000',
                  background: 'var(--lb-bg-light)',
                  padding: '15px',
                  width: '100%',
                  maxWidth: '500px',
                  borderRadius: '4px',
                }}
              >
                <h3 style={{ color: 'var(--lb-blue)', marginTop: 0 }}>
                  Search using Username
                </h3>
                <label
                  style={{ display: 'block', width: '100%', textAlign: 'left' }}
                >
                  Username:
                  <input
                    type="text"
                    className="lb-input"
                    style={{ marginTop: '5px' }}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      // Clear files to make options mutually exclusive
                      setRatingsFile(null);
                      setWatchedFile(null);
                      setWatchlistFile(null);
                      if (document.getElementById('ratings-upload'))
                        document.getElementById('ratings-upload').value = '';
                      if (document.getElementById('watchlist-upload'))
                        document.getElementById('watchlist-upload').value = '';
                      if (document.getElementById('watched-upload'))
                        document.getElementById('watched-upload').value = '';
                    }}
                    placeholder="e.g. JohnDoe123"
                  />
                </label>
                <div
                  style={{ fontSize: '14px', color: '#aaa', marginTop: '5px' }}
                >
                  Uses live public Letterboxd data.
                </div>
              </div>

              <div style={{ fontWeight: 'bold', color: 'var(--lb-orange)' }}>
                --- OR ---
              </div>

              <div
                style={{
                  border: '2px solid #000',
                  background: 'var(--lb-bg-light)',
                  padding: '15px',
                  width: '100%',
                  maxWidth: '500px',
                  borderRadius: '4px',
                }}
              >
                <h3 style={{ color: 'var(--lb-blue)', marginTop: 0 }}>
                  Use CSV imports for more reliable recommendations
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#aaa',
                    marginTop: '-10px',
                    marginBottom: '15px',
                  }}
                >
                  Export your data from Letterboxd settings and upload the CSVs
                  here.
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      fontSize: '16px',
                    }}
                  >
                    <span>
                      <span style={{ color: 'var(--lb-green)' }}>
                        ratings.csv
                      </span>{' '}
                      (Includes ratings/likes)
                    </span>
                    <input
                      id="ratings-upload"
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        setRatingsFile(e.target.files[0]);
                        setUsername('');
                      }}
                      style={{ fontSize: '14px', marginTop: '5px' }}
                    />
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      fontSize: '16px',
                    }}
                  >
                    <span>
                      <span style={{ color: 'var(--lb-blue)' }}>
                        watchlist.csv
                      </span>{' '}
                      (For watchlist recommendations)
                    </span>
                    <input
                      id="watchlist-upload"
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        setWatchlistFile(e.target.files[0]);
                        setUsername('');
                      }}
                      style={{ fontSize: '14px', marginTop: '5px' }}
                    />
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      fontSize: '16px',
                    }}
                  >
                    <span>
                      <span style={{ color: 'var(--lb-orange)' }}>
                        watched.csv
                      </span>{' '}
                      (Optional if ratings uploaded)
                    </span>
                    <input
                      id="watched-upload"
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        setWatchedFile(e.target.files[0]);
                        setUsername('');
                      }}
                      style={{ fontSize: '14px', marginTop: '5px' }}
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="lb-button green"
                style={{ width: '100%', maxWidth: '500px', fontSize: '18px' }}
              >
                EXECUTE ALGORITHM
              </button>
            </form>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div
                style={{
                  color: 'var(--lb-blue)',
                  fontSize: '24px',
                  animation: 'blink 1s step-end infinite',
                }}
              >
                {loadingJoke}
                <br />
                <span
                  style={{
                    fontSize: '16px',
                    color: '#aaa',
                    fontStyle: 'italic',
                  }}
                >
                  (Processing profile data... this usually takes 10-15 seconds)
                </span>
              </div>
              <style jsx>{`
                @keyframes blink {
                  50% {
                    opacity: 0.5;
                  }
                }
              `}</style>
            </div>
          )}

          {error && (
            <div
              style={{
                color: 'red',
                border: '2px inset red',
                padding: '10px',
                marginTop: '20px',
                background: '#300',
              }}
            >
              FATAL ERROR: {error}
              <br />
              <button
                className="lb-button"
                onClick={() => setError('')}
                style={{ marginTop: '10px' }}
              >
                OK
              </button>
            </div>
          )}

          {results && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '2px dashed var(--lb-green)',
                  paddingBottom: '10px',
                }}
              >
                <h2 style={{ color: 'var(--lb-green)', margin: 0 }}>
                  YOUR RECOMMENDATIONS
                </h2>
                <button className="lb-button" onClick={() => setResults(null)}>
                  RESET
                </button>
              </div>

              <p
                style={{
                  fontSize: '16px',
                  color: 'var(--lb-text)',
                  marginBottom: '30px',
                }}
              >
                Click on any movie poster to open it directly in Letterboxd!
              </p>

              <h3
                style={{
                  color: 'var(--lb-green)',
                  borderBottom: '1px solid #333',
                  paddingBottom: '5px',
                }}
              >
                1. RECENTLY WATCHED DISCOVERIES
              </h3>
              <MovieGrid
                movies={results.recent}
                fallbackMsg="Not enough recent data to generate these."
              />

              <h3
                style={{
                  marginTop: '40px',
                  color: 'var(--lb-blue)',
                  borderBottom: '1px solid #333',
                  paddingBottom: '5px',
                }}
              >
                2. BASED ON YOUR LIKES
              </h3>
              <MovieGrid
                movies={results.liked}
                fallbackMsg="You need to rate more movies 4+ stars or like them."
              />

              <h3
                style={{
                  marginTop: '40px',
                  color: 'var(--lb-orange)',
                  borderBottom: '1px solid #333',
                  paddingBottom: '5px',
                }}
              >
                3. FROM YOUR WATCHLIST
              </h3>
              <MovieGrid
                movies={results.watchlist}
                fallbackMsg="No watchlist provided or scraped. Use CSV upload for this feature."
              />

              <h3
                style={{
                  marginTop: '40px',
                  color: '#f87171',
                  borderBottom: '1px solid #333',
                  paddingBottom: '5px',
                }}
              >
                4. TOP GENRE:{' '}
                {results.topGenreName
                  ? results.topGenreName.toUpperCase()
                  : 'UNKNOWN'}
              </h3>
              <MovieGrid
                movies={results.genre}
                fallbackMsg="Not enough genre data to calculate this."
              />
            </div>
          )}

          {/* Socials embedded inside main window */}
          <div
            style={{
              borderTop: '2px dashed #444',
              marginTop: '40px',
              paddingTop: '20px',
            }}
          >
            <h3
              style={{
                textAlign: 'center',
                color: 'var(--lb-orange)',
                marginTop: 0,
                marginBottom: '20px',
                fontSize: '18px',
              }}
            >
              CONNECT WITH ME
            </h3>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '25px',
              }}
            >
              <a
                href="https://github.com/prometheus0028"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: 'var(--lb-blue)',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                <span style={{ fontSize: '20px' }}>💻</span> GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/sarthakvashisht2005/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: 'var(--lb-blue)',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                <span style={{ fontSize: '20px' }}>💼</span> LinkedIn
              </a>
              <a
                href="https://letterboxd.com/prometheus18/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: 'var(--lb-blue)',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                <span style={{ fontSize: '20px' }}>🍿</span> Letterboxd
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
