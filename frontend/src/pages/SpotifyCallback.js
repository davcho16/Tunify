// frontend/src/pages/SpotifyCallback.js
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const SpotifyCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Connecting to Spotify...");
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const handleCallback = async () => {
      try {
        // Get the authorization code from URL
        const code = new URLSearchParams(window.location.search).get("code");
        
        if (!code) {
          console.error("No code found in callback URL");
          setStatus("No code found. Redirecting...");
          setTimeout(() => navigate("/"), 1500);
          return;
        }

        console.log("Code received, exchanging for token");

        // Exchange code for token
        const response = await fetch("http://localhost:3001/api/spotify-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();
        
        if (response.ok && data.access_token) {
          // Save tokens to localStorage
          localStorage.setItem("spotify_access_token", data.access_token);
          if (data.refresh_token) {
            localStorage.setItem("spotify_refresh_token", data.refresh_token);
          }
          localStorage.setItem("spotify_token_expiry", Date.now() + (data.expires_in * 1000));
          
          console.log("Token saved, navigating to dashboard");
          setStatus("Connected! Redirecting to dashboard...");
          
          // Navigate immediately
          window.location.href = "/dashboard";
        } else {
          throw new Error(data.error || "Failed to get access token");
        }
      } catch (error) {
        console.error("Error during Spotify callback:", error);
        setStatus("Authentication failed. Redirecting to login...");
        setTimeout(() => navigate("/"), 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg text-white text-center">
        <h2 className="text-2xl font-bold mb-4">Spotify Authentication</h2>
        <p>{status}</p>
      </div>
    </div>
  );
};

export default SpotifyCallback;