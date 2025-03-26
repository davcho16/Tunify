const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let clientToken = null;
let tokenExpiresAt = null;

const getClientToken = async () => {
  const now = Date.now();
  if (clientToken && tokenExpiresAt && now < tokenExpiresAt) return clientToken;

  const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({ grant_type: "client_credentials" }),
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  console.log("✅ Client token fetched");
  clientToken = response.data.access_token;
  tokenExpiresAt = now + response.data.expires_in * 1000;
  return clientToken;
};

// 🎧 Token test endpoint
app.get("/api/me", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  try {
    const result = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    res.json(result.data);
  } catch (err) {
    console.error("Spotify /me error", err.response?.data || err.message);
    res.status(500).json({
      error: "Token not valid",
      details: err.response?.data || err.message,
    });
  }
});

// 🔄 Spotify Token Exchange
app.post("/api/spotify-auth", async (req, res) => {
  const { code } = req.body;
  const redirectUri = "http://localhost:3000/callback";

  console.log("🔁 Spotify Auth Requested");
  console.log("🔑 Received code:", code);
  console.log("🔙 Using redirect URI:", redirectUri);

  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", redirectUri);
  params.append("client_id", process.env.SPOTIFY_CLIENT_ID);
  params.append("client_secret", process.env.SPOTIFY_CLIENT_SECRET);

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("✅ Spotify Token Response:", response.data);
    res.json(response.data);
  } catch (err) {
    console.error("❌ Spotify Auth Error:");
    console.error("Error Message:", err.message);
    console.error("Response Data:", err.response?.data);
    res.status(500).json({
      error: "Spotify auth failed",
      details: err.response?.data || err.message,
    });
  }
});

// 🎵 Track Search
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Missing search query" });

  try {
    const token = await getClientToken();
    const result = await axios.get("https://api.spotify.com/v1/search", {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: query, type: "track", limit: 5 },
    });

    const simplified = result.data.tracks.items.map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name,
    }));

    res.json({ tracks: simplified });
  } catch (err) {
    console.error("Search error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to search tracks" });
  }
});

// 🧠 Smart Recommendations
app.get("/api/smart-recommendations", async (req, res) => {
  const seedTrackIds = req.query.seeds?.split(",");
  const userToken = req.headers.authorization?.split(" ")[1];

  console.log("✅ Received seeds:", seedTrackIds);
  console.log("✅ Received user token:", userToken?.slice(0, 20) + "...");

  if (!userToken || !seedTrackIds || seedTrackIds.length === 0) {
    return res.status(400).json({ error: "Missing token or seeds" });
  }

  try {
    const featureRes = await axios.get("https://api.spotify.com/v1/audio-features", {
      headers: { Authorization: `Bearer ${userToken}` },
      params: { ids: seedTrackIds.join(",") },
    });

    const features = featureRes.data.audio_features.filter((f) => f != null);
    if (features.length === 0) {
      return res.status(400).json({ error: "No valid audio features found" });
    }

    const avg = (key) => features.reduce((sum, f) => sum + f[key], 0) / features.length;

    const recParams = {
      seed_tracks: seedTrackIds.slice(0, 5).join(","),
      market: "US",
      limit: 20,
      target_tempo: avg("tempo") || 100,
      min_tempo: 50,
      target_valence: avg("valence") || 0.5,
      min_valence: 0.1,
      target_energy: avg("energy") || 0.5,
      min_energy: 0.1,
      target_danceability: avg("danceability") || 0.5,
      min_danceability: 0.1,
    };
    

    console.log("🎯 Recommendation Params:", recParams);

    const recRes = await axios.get("https://api.spotify.com/v1/recommendations", {
      headers: { Authorization: `Bearer ${userToken}` },
      params: recParams,
    });

    res.json(recRes.data);
  } catch (err) {
    console.error("❌ Spotify API Error:");
    console.error("Message:", err.message);
    console.error("Status:", err.response?.status);
    console.error("Data:", JSON.stringify(err.response?.data, null, 2));
    res.status(500).json({ error: "Failed to fetch smart recommendations" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
