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

    // Step 2: Insert new query row
    console.log("Inserting query for user_id:", user_id);
    const { data: insertedQuery, error: insertError } = await supabase
      .from("recommendation_queries")
      .insert([{ user_id: parseInt(user_id) }])
      .select("query_id")
      .single();

    if (insertError) throw insertError;
    const query_id = insertedQuery.query_id;
    console.log("Created query_id:", query_id);

    // Step 3: Insert seed songs into query_seeds
    const seedInserts = idList.map((song_id, idx) => ({
      query_id,
      seed_rank: idx + 1,
      song_id,
    }));
    console.log("Inserting seeds:", seedInserts);
    const { error: seedsError } = await supabase
      .from("query_seeds")
      .insert(seedInserts);

    if (seedsError) throw seedsError;

    // Step 4: Fetch all songs
    console.log("Fetching all songs");
    const { data: allSongs, error: allError } = await supabase
      .from("songs_with_clusters")
      .select("*");

    if (allError) throw allError;

    // Step 5: Cluster matching
    const clusterLevels = ["cluster1", "cluster2", "cluster3", "cluster4", "cluster5"];
    let matchedCluster = null, clusterValue = null, matchType = "none";

    for (const level of clusterLevels) {
      const values = selected.map((s) => s[level]);
      if (values.every((v) => v === values[0])) {
        matchedCluster = level;
        clusterValue = values[0];
        matchType = "all 3";
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
          matchType = "2 of 3";
          break;
        }
      }
    }

    if (!matchedCluster) {
      matchedCluster = "cluster3";
      clusterValue = selected[0][matchedCluster];
      matchType = "1 of 3 (fallback)";
    }

    console.log("Cluster matching result:", { matchedCluster, clusterValue, matchType });

    // Step 6: Filter and sort recommendations
    const idSet = new Set(idList);
    const recommendations = allSongs
      .filter((song) =>
        !idSet.has(song.song_id) && song[matchedCluster] == clusterValue
      )
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, parseInt(n));

    console.log("Top recommendations:", recommendations.map(r => r.song_id));

    // Step 7: Insert recommendations into query_results
    const recInserts = recommendations.map((song, idx) => ({
      query_id,
      result_rank: idx + 1,
      song_id: song.song_id,
      similarity: 1.0,
    }));

    console.log("Inserting recommendations:", recInserts);
    const { error: recError } = await supabase
      .from("query_results")
      .insert(recInserts);

    if (recError) throw recError;

    // Final response
    res.json({
      recommendations,
      clusterUsed: matchedCluster,
      matchType,
    });
  } catch (err) {
    console.error("Recommendation error:", err);
    res.status(500).json({ error: err.message });
  }
});
