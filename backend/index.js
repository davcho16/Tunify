// backend/index.js
require("dotenv").config({ path: './backend/.env' });
const express = require("express");

const cors = require("cors");
const fs = require("fs");
const path = require("path")
const csv = require("csv-parser")
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/api/recommend", async (req, res) => {
  const { selectedTrackIds } = req.body;
  if (!selectedTrackIds || selectedTrackIds.length === 0) {
    return res.status(400).json({ error: "Missing selected track IDs" });
  }

  try {
    const { data: seedTracks, error: seedError } = await supabase
      .from("tracks")
      .select("id, name, artists, danceability, energy, valence, tempo, acousticness, speechiness, instrumentalness, liveness, loudness")
      .in("id", selectedTrackIds);

    if (seedError || seedTracks.length === 0) throw seedError || new Error("No tracks found");

    const avg = (key) => seedTracks.reduce((sum, t) => sum + t[key], 0) / seedTracks.length;
    const avgVector = [
      avg("danceability"),
      avg("energy"),
      avg("valence"),
      avg("tempo"),
      avg("acousticness"),
      avg("speechiness"),
      avg("instrumentalness"),
      avg("liveness"),
      avg("loudness")
    ];

    const { data: allTracks, error: allError } = await supabase
      .from("tracks")
      .select("id, name, artists, danceability, energy, valence, tempo, acousticness, speechiness, instrumentalness, liveness, loudness, popularity")
      .limit(10000);

    if (allError) throw allError;

    const cosineSim = (a, b) => {
      const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const magA = Math.sqrt(a.reduce((sum, val) => sum + val ** 2, 0));
      const magB = Math.sqrt(b.reduce((sum, val) => sum + val ** 2, 0));
      return dot / (magA * magB);
    };

    const matches = allTracks
      .filter((t) => !selectedTrackIds.includes(t.id))
      .map((t) => {
        const vec = [
          t.danceability,
          t.energy,
          t.valence,
          t.tempo,
          t.acousticness,
          t.speechiness,
          t.instrumentalness,
          t.liveness,
          t.loudness
        ];
        return { ...t, score: cosineSim(avgVector, vec) };
      })
      .sort((a, b) => b.score - a.score || b.popularity - a.popularity)
      .slice(0, 1);

    res.json({ recommendation: matches[0] });
  } catch (err) {
    console.error("Recommendation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ML recommendation API endpoint
app.get("/api/recommend-cluster", async (req, res) => {
  // query: takes 3 song ids and a number of songs that should be returned
  const { id1, id2, id3, n = 3 } = req.query;

  // Enforces unique IDs
  if (!id1 || !id2 || !id3 || id3 === id2 || id1 === id3 || id2 === id1 ) {
    return res.status(400).json({ error: "Three unique track IDs are required (id1, id2, id3)" });
  }

  // Goes to the data path
  const filePath = path.join(__dirname, "rec_data", "songs_with_clusters.csv");
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", () => {
      const inputSongs = [id1, id2, id3].map((id) => 
        results.find((song) => song.id === id)
    );
      
      // Checks whether all input IDs exist in the data file
      if (inputSongs.includes(undefined)) {
        return res.status(404).json({ error: "One or more input songs not found" });
      }

      const clusterNames = ["cluster1","cluster2","cluster3","cluster4","cluster5"];
      let matchedCluster = null;
      let sharedValue = null;

      // Searches for a cluster grouping (1-5) where all three songs share clusterValue
      for (const cluster of clusterNames) {
        const values = inputSongs.map((song) => song[cluster]);
        if (values.every((val) => val === values[0])) {
          matchedCluster = cluster;
          sharedValue = values[0];
          break;
        }
      }

      // Returns this response if no clusterValue match for all three songs in any cluster grouping
      if (!matchedCluster) {
        return res.status(404).json({ error: "No shared cluster found among all 3 songs across any cluster grouping (1-5)" });
      }

      // If finds clusterValue match for all three songs in a cluster grouping,
      // returns (at most) the n most popular songs that match the clusterValue of the three input songs,
      // excluding the three input songs
      // i.e., if the three songs share a value 37 in cluster3, the function will look for all other songs in cluster3
      // that match the value 37, sort them by popularity, and return the n most popular
      // ASSUMES there are always more than 3 songs that share one clusterValue in at least one cluster grouping
      const recommendations = results
        .filter((song) =>
          ![id1, id2, id3].includes(song.id) && 
        song[matchedCluster] === sharedValue
        )
        .sort((a, b) => parseInt(b.popularity) - parseInt(a.popularity))
        .slice(0, parseInt(n));
      
      // the returned response
      res.json({
        matchedCluster, // cluster where the matching value is found for all three input songs
        sharedValue,    // matching value
        recommendations // song recs
      });
    })
    .on("error", (err) => {
      console.error("CSV read error:", err);
      res.status(500).json({ error: "Failed to load recommendation data" });
    });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
