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

app.get("/api/recommend-cluster", async (req, res) => {
  const { id1, id2, id3, n = 3 } = req.query;

  if (!id1 || !id2 || !id3) {
    return res.status(400).json({ error: "Three track IDs are required (id1, id2, id3)" });
  }

  const filePath = path.join(__dirname, "rec_data", "songs_with_clusters.csv");
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", () => {
      const inputSongs = [id1, id2, id3].map((id) => 
        results.find((song) => song.id === id)
    );
      
      if (inputSongs.includes(undefined)) {
        return res.status(404).json({ error: "One or more input songs not found" });
      }

      const clusterNames = ["cluster1","cluster2","cluster3","cluster4","cluster5"];
      let matchedCluster = null;
      let sharedValue = null;

      for (const cluster of clusterNames) {
        const values = inputSongs.map((song) => song[cluster]);
        if (values.every((val) => val === values[0])) {
          matchedCluster = cluster;
          sharedValue = values[0];
          break;
        }
      }

      if (!matchedCluster) {
        return res.status(404).json({ error: "No shared cluster found among all 3 songs across any cluster grouping (1-5)" });
      }

      const recommendations = results
        .filter((song) =>
          ![id1, id2, id3].includes(song.id) && 
        song[matchedCluster] === sharedValue
        )
        .sort((a, b) => parseInt(b.popularity) - parseInt(a.popularity))
        .slice(0, parseInt(n));
      
      res.json({
        matchedCluster,
        sharedValue,
        recommendations
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
