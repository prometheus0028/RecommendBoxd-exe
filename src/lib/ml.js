// A simple Content-Based Filtering ML Model using Cosine Similarity

// Standard TMDB genres map (approximation)
const ALL_GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
  "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery",
  "Romance", "Science Fiction", "TV Movie", "Thriller", "War", "Western"
];

function vectorizeMovie(movieDetails) {
  const vector = new Array(ALL_GENRES.length).fill(0);
  if (!movieDetails || !movieDetails.genres) return vector;
  
  movieDetails.genres.forEach(g => {
    const idx = ALL_GENRES.indexOf(g.name);
    if (idx !== -1) {
      vector[idx] = 1;
    }
  });
  return vector;
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function buildUserProfile(watchedMoviesWithDetails) {
  const profileVector = new Array(ALL_GENRES.length).fill(0);
  
  watchedMoviesWithDetails.forEach(movie => {
    const vector = vectorizeMovie(movie.details);
    
    // Calculate weight based on user's rating, like status, and watch count
    // Rating is out of 5 (e.g. 4.5). Default to 3 if not rated.
    let weight = movie.rating > 0 ? movie.rating : 3;
    if (movie.liked) weight += 1.5;
    if (movie.watchCount > 1) weight += (movie.watchCount * 0.5); // Boost for rewatches
    
    for (let i = 0; i < vector.length; i++) {
      profileVector[i] += vector[i] * weight;
    }
  });
  
  // Normalize profile vector
  let max = Math.max(...profileVector);
  if (max > 0) {
    for (let i = 0; i < profileVector.length; i++) {
      profileVector[i] = profileVector[i] / max;
    }
  }
  
  return profileVector;
}

export function scoreAndRankCandidates(candidatesWithDetails, profileVector, watchedMoviesWithDetails, count = 5, filterQuality = false, allWatchedData = []) {
  let filteredCandidates = candidatesWithDetails;
  
  if (filterQuality) {
    filteredCandidates = candidatesWithDetails.filter(c => {
      // Must have VERY high popularity to avoid niche movies
      return c && c.vote_count >= 1500 && c.vote_average >= 6.5;
    });
  }

  const scored = filteredCandidates.map(candidate => {
    const candidateVec = vectorizeMovie(candidate);
    const score = cosineSimilarity(profileVector, candidateVec);
    
    // Find the most similar watched movie for the explanation
    let mostSimilarWatched = null;
    let highestSim = -1;
    
    watchedMoviesWithDetails.forEach(watched => {
      if (watched.details && watched.details.id !== candidate.id) {
        const sim = cosineSimilarity(candidateVec, vectorizeMovie(watched.details));
        if (sim > highestSim) {
          highestSim = sim;
          mostSimilarWatched = watched;
        }
      }
    });

    let reason = candidate.reason || "Based on your overall watch history.";
    if (!candidate.reason && mostSimilarWatched && highestSim > 0.5) {
      if (mostSimilarWatched.liked) {
        reason = `Follows same theme as ${mostSimilarWatched.title} based on your like.`;
      } else if (mostSimilarWatched.rating >= 4) {
        reason = `Similar to ${mostSimilarWatched.title} which you rated highly.`;
      } else {
        reason = `Based on your watch of ${mostSimilarWatched.title}.`;
      }
    }

    return {
      ...candidate,
      matchScore: score,
      reason
    };
  });
  
  // Sort descending by score
  scored.sort((a, b) => b.matchScore - a.matchScore);
  
  // Remove duplicates and already watched
  const watchedIds = new Set(watchedMoviesWithDetails.filter(m => m.details).map(m => m.details.id));
  const normalize = (str) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : "";
  const watchedTitles = new Set(allWatchedData.map(m => normalize(m.title)));
  const unique = [];
  const seenIds = new Set();
  const seenTitles = new Set();
  const reasonCounts = {};
  
  for (const movie of scored) {
    const titleLower = normalize(movie.title);
    
    if (!seenIds.has(movie.id) && !seenTitles.has(titleLower) && !watchedIds.has(movie.id) && !watchedTitles.has(titleLower)) {
      
      // Smart Diversity Filter: Prevent the same movie anchor from being used twice in a row,
      // but ALLOW the fallback reason to duplicate so we don't starve the category.
      const r = movie.reason;
      if (r && r !== "Based on your overall watch history.") {
        const count = reasonCounts[r] || 0;
        if (count >= 1) continue; // Limit 1 recommendation per seed
        reasonCounts[r] = count + 1;
      }

      unique.push(movie);
      seenIds.add(movie.id);
      seenTitles.add(titleLower);
    }
    if (unique.length >= count) break;
  }
  
  return unique;
}

export function getTopGenre(watchedMoviesWithDetails) {
  const genreCounts = {};
  
  watchedMoviesWithDetails.forEach(movie => {
    if (movie.details && movie.details.genres) {
      // Weight the genre by rating if possible
      const weight = movie.rating > 0 ? movie.rating : 3;
      movie.details.genres.forEach(g => {
        genreCounts[g.id] = (genreCounts[g.id] || 0) + weight;
        // Keep name for debugging/display
        genreCounts[`${g.id}_name`] = g.name;
      });
    }
  });

  let topGenreId = null;
  let topGenreName = null;
  let maxCount = 0;

  Object.keys(genreCounts).forEach(key => {
    if (!key.includes('_name')) {
      if (genreCounts[key] > maxCount) {
        maxCount = genreCounts[key];
        topGenreId = parseInt(key, 10);
        topGenreName = genreCounts[`${key}_name`];
      }
    }
  });

  return { id: topGenreId, name: topGenreName };
}
