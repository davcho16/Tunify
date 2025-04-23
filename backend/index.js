// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = 3001;

// Middleware setup
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Parse incoming JSON requests

// Initialize Supabase client with environment variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/search - Search for songs by name or artist
app.get("/api/search", async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim() === "") {
    return res.status(400).json({ error: "Missing or empty search query" });
  }

  try {
    const { data, error } = await supabase
      .from("songs_with_clusters")
      .select("song_id, name, artists")
      .or(`name.ilike.%${query}%,artists.ilike.%${query}%`)
      .limit(15);

    if (error) throw error;

    res.json({ results: data });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Failed to search tracks" });
  }
});

// GET /api/recommend-cluster - Generate track recommendations based on cluster similarity
app.get("/api/recommend-cluster", async (req, res) => {
  const { ids, n = 3 } = req.query;
  const idList = ids ? ids.split(",") : [];

  if (idList.length !== 3) {
    return res.status(400).json({ error: "Exactly 3 track IDs are required" });
  }

  try {
    // Step 1: Fetch the selected songs by their IDs
    const { data: selected, error: selectedError } = await supabase
      .from("songs_with_clusters")
      .select("*")
      .in("song_id", idList.map(Number));

    if (selectedError) throw selectedError;

    if (selected.length !== 3) {
      return res.status(404).json({ error: "One or more selected tracks not found" });
    }

    // Step 2: Fetch all songs for filtering recommendations
    const { data: allSongs, error: allError } = await supabase
      .from("songs_with_clusters")
      .select("*");

    if (allError) throw allError;

    // Step 3: Determine which cluster level matches all 3 or 2 out of 3 tracks
    const clusterLevels = ["cluster1", "cluster2", "cluster3", "cluster4", "cluster5"];
    let matchedCluster = null;
    let clusterValue = null;
    let matchType = "none";

    // Check if all 3 tracks match in any cluster level
    for (const level of clusterLevels) {
      const values = selected.map((s) => s[level]);
      if (values.every((v) => v === values[0])) {
        matchedCluster = level;
        clusterValue = values[0];
        matchType = "all 3";
        break;
      }
    }

    // If no all-match, check for 2 out of 3 match in any cluster level
    if (!matchedCluster) {
      for (const level of clusterLevels) {
        const valueCount = {};
        for (const s of selected) {
          const val = s[level];
          valueCount[val] = (valueCount[val] || 0) + 1;
        }

        const twoMatch = Object.entries(valueCount).find(([val, count]) => count === 2);
        if (twoMatch) {
          matchedCluster = level;
          clusterValue = twoMatch[0];
          matchType = "2 of 3";
          break;
        }
      }
    }

    // Fallback: use the cluster3 value from the first track
    if (!matchedCluster) {
      matchedCluster = "cluster3";
      clusterValue = selected[0][matchedCluster];
      matchType = "1 of 3 (fallback)";
    }

    // Step 4: Filter and sort recommendations
    const idSet = new Set(idList.map(Number));

    const recommendations = allSongs
      .filter((song) =>
        !idSet.has(song.song_id) && song[matchedCluster] == clusterValue
      )
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, parseInt(n));

    // Return recommendations
    res.json({ recommendations, clusterUsed: matchedCluster, matchType });
  } catch (err) {
    console.error("Recommendation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});