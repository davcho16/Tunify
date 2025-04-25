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

// POST /api/recommend-cluster - Recommend api endpoint and sending information to store in database
app.post("/api/recommend-cluster", async (req, res) => {
  const { ids, n = 3, email } = req.body;
  const idList = ids ? ids.split(",").map(Number) : [];

  if (idList.length !== 3 || !email) {
    return res.status(400).json({ error: "Exactly 3 track IDs and email are required" });
  }

  try {
    // Lookup numeric user_id from users table
    const { data: userLookup, error: userLookupError } = await supabase
      .from("users")
      .select("user_id")
      .eq("email", email)
      .single();

    if (userLookupError || !userLookup) {
      return res.status(400).json({ error: "User not found in users table" });
    }

    const user_id = userLookup.user_id;

    // Step 1: Fetch selected songs
    const { data: selected, error: selectedError } = await supabase
      .from("songs_with_clusters")
      .select("*")
      .in("song_id", idList);
    if (selectedError) throw selectedError;
    if (selected.length !== 3) {
      return res.status(404).json({ error: "One or more selected tracks not found" });
    }

    // Step 2: Fetch all songs
    const { data: allSongs, error: allError } = await supabase
      .from("songs_with_clusters")
      .select("*");
    if (allError) throw allError;

    // Step 3: Match cluster level
    const clusterLevels = ["cluster1", "cluster2", "cluster3", "cluster4", "cluster5"];
    let matchedCluster = null;
    let clusterValue = null;

    for (const level of clusterLevels) {
      const values = selected.map((s) => s[level]);
      if (values.every((v) => v === values[0])) {
        matchedCluster = level;
        clusterValue = values[0];
        break;
      }
    }

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
          break;
        }
      }
    }

    if (!matchedCluster) {
      matchedCluster = "cluster3";
      clusterValue = selected[0][matchedCluster];
    }

    // Step 4: Get top recommendations
    const idSet = new Set(idList);
    const recommendations = allSongs
      .filter((song) => !idSet.has(song.song_id) && song[matchedCluster] == clusterValue)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, parseInt(n));

    while (recommendations.length < 3) {
      recommendations.push({ song_id: null });
    }

    // Step 5: Insert into query_seeds
    const { data: seedInsert, error: seedError } = await supabase
      .from("query_seeds")
      .insert({
        song_id1: idList[0],
        song_id2: idList[1],
        song_id3: idList[2],
      })
      .select("query_id")
      .single();
    if (seedError) throw seedError;

    const queryId = seedInsert.query_id;

    // Step 6: Insert into query_results
    const { error: resultError } = await supabase
      .from("query_results")
      .insert({
        query_id: queryId,
        song_id1: recommendations[0]?.song_id ?? null,
        song_id2: recommendations[1]?.song_id ?? null,
        song_id3: recommendations[2]?.song_id ?? null,
      });
    if (resultError) throw resultError;

    // Step 7: Insert into recommendation_queries
    const { error: logError } = await supabase.from("recommendation_queries").insert({
      user_id,
      query_id: queryId,
      created_at: new Date().toISOString(),
    });
    if (logError) {
      console.error("Logging recommendation failed:", logError.message);
    }

    // Step 8: Respond
    res.json({
      recommendations,
      query_id: queryId,
      clusterUsed: matchedCluster,
    });
  } catch (err) {
    console.error("Recommendation error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
