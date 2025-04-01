// backend/index.js
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

/**
 * Fetches a client credentials token for public Spotify API requests
 * @returns {Promise<string>} Valid access token
 */
const getClientToken = async () => {
  const now = Date.now();
  if (clientToken && tokenExpiresAt && now < tokenExpiresAt) return clientToken;

  const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");

  try {
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

    console.log("Client token fetched successfully");
    clientToken = response.data.access_token;
    tokenExpiresAt = now + response.data.expires_in * 1000;
    return clientToken;
  } catch (error) {
    console.error("Failed to fetch client token:", error.response?.data || error.message);
    throw new Error("Failed to authenticate with Spotify");
  }
};

/**
 * Endpoint to verify user token validity by fetching their profile
 */
app.get("/api/me", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  try {
    const result = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    res.json(result.data);
  } catch (err) {
    console.error("Spotify profile fetch error:", err.response?.status, err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Token validation failed",
      details: err.response?.data?.error?.message || err.message,
    });
  }
});

/**
 * Spotify OAuth token exchange endpoint
 */
app.post("/api/spotify-auth", async (req, res) => {
  const { code } = req.body;
  const redirectUri = "http://localhost:3000/callback";

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  console.log("Processing Spotify authorization code");
  
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

    console.log("Spotify token exchange successful");
    res.json(response.data);
  } catch (err) {
    console.error("Spotify auth error:", err.response?.status, err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Spotify authentication failed",
      details: err.response?.data?.error?.message || err.message,
    });
  }
});

/**
 * Token refresh endpoint
 */
app.post("/api/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ error: "Missing refresh token" });
  }

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
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

    console.log("Token refresh successful");
    res.json(response.data);
  } catch (err) {
    console.error("Token refresh error:", err.response?.status, err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to refresh token",
      details: err.response?.data?.error?.message || err.message,
    });
  }
});

/**
 * Track search endpoint
 */
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
    console.error("Search error:", err.response?.status, err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ 
      error: "Failed to search tracks",
      details: err.response?.data?.error?.message || err.message
    });
  }
});

/**
 * Smart recommendations endpoint based on audio features
 */
app.get("/api/smart-recommendations", async (req, res) => {
  const seedTrackIds = req.query.seeds?.split(",");
  const userToken = req.headers.authorization?.split(" ")[1];

  if (!userToken || !seedTrackIds || seedTrackIds.length === 0) {
    return res.status(400).json({ error: "Missing token or seed tracks" });
  }

  try {
    console.log("Fetching audio features for seed tracks");
    
    // Fetch audio features for the seed tracks
    const featureRes = await axios.get("https://api.spotify.com/v1/audio-features", {
      headers: { Authorization: `Bearer ${userToken}` },
      params: { ids: seedTrackIds.join(",") },
    });

    const features = featureRes.data.audio_features.filter((f) => f != null);
    
    if (features.length === 0) {
      console.error("No valid audio features found for the provided tracks");
      return res.status(400).json({ 
        error: "No valid audio features found",
        details: "The selected tracks don't have analyzable audio features" 
      });
    }

    // Calculate average audio features from seed tracks
    const avg = (key) => features.reduce((sum, f) => sum + f[key], 0) / features.length;

    // Prepare recommendation parameters based on seed track audio features
    const recParams = {
      seed_tracks: seedTrackIds.slice(0, 5).join(","), // Spotify allows max 5 seed tracks
      market: "US",
      limit: 20,
      // Target values based on seed tracks with fallbacks
      target_tempo: avg("tempo") || 120,
      target_valence: avg("valence") || 0.5,
      target_energy: avg("energy") || 0.5,
      target_danceability: avg("danceability") || 0.5,
      target_acousticness: avg("acousticness") || 0.5,
      // Min values to ensure recommendations aren't too far from targets
      min_valence: Math.max(0.1, avg("valence") - 0.3),
      min_energy: Math.max(0.1, avg("energy") - 0.3),
      min_danceability: Math.max(0.1, avg("danceability") - 0.3)
    };
    
    console.log("Requesting recommendations with audio profile");

    // Get recommendations from Spotify API
    const recRes = await axios.get("https://api.spotify.com/v1/recommendations", {
      headers: { Authorization: `Bearer ${userToken}` },
      params: recParams,
    });

    console.log(`Received ${recRes.data.tracks.length} recommendations`);
    res.json(recRes.data);
  } catch (err) {
    console.error("Spotify API error:", err.response?.status, err.response?.data || err.message);
    
    // Handle different error scenarios
    if (err.response?.status === 401) {
      return res.status(401).json({ 
        error: "Authorization failed",
        details: "Your Spotify session has expired. Please reconnect." 
      });
    }
    
    if (err.response?.status === 429) {
      return res.status(429).json({ 
        error: "Rate limit exceeded",
        details: "Too many requests to Spotify API. Please try again later." 
      });
    }
    
    res.status(err.response?.status || 500).json({ 
      error: "Failed to fetch recommendations",
      details: err.response?.data?.error?.message || err.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});