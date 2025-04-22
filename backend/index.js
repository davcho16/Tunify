// backend/index.js
require("dotenv").config({ path: './backend/.env' });
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ML-based cluster recommendation route
app.get("/api/recommend-cluster", async (req, res) => {
  const { id, cluster = "cluster3", n = 5 } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing track ID" });
  }

  const filePath = path.join(__dirname, "rec_data", "songs_with_clusters.csv");
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", () => {
      const inputSong = results.find((song) => song.id === id);
      if (!inputSong) {
        return res.status(404).json({ error: "Song not found in dataset" });
      }

      const clusterValue = inputSong[cluster];
      if (!clusterValue) {
        return res.status(400).json({ error: `Cluster column '${cluster}' not found on song` });
      }

      const recommendations = results
        .filter((song) => song.id !== id && song[cluster] === clusterValue)
        .slice(0, parseInt(n));

      res.json({ recommendations });
    })
    .on("error", (err) => {
      console.error("CSV read error:", err);
      res.status(500).json({ error: "Failed to load recommendation data" });
    });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
