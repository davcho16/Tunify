import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const SpotifyCallback = () => {
  const navigate = useNavigate();
  const handled = useRef(false); // 🧠 prevents re-execution

  useEffect(() => {
    if (handled.current) return;

    const code = new URLSearchParams(window.location.search).get("code");

    if (code) {
      console.log("🔑 Exchanging Spotify code:", code);

      fetch("http://localhost:3001/api/spotify-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.access_token) {
            console.log("✅ Spotify token saved");
            localStorage.setItem("spotify_access_token", data.access_token);
            handled.current = true;
            navigate("/dashboard");
          } else {
            console.error("❌ Invalid token response:", data);
            navigate("/");
          }
        })
        .catch((err) => {
          console.error("❌ Spotify Auth Error:", err);
          navigate("/");
        });
    } else {
      console.warn("❌ No code found in callback URL");
      navigate("/");
    }
  }, [navigate]);

  return <p className="text-white text-center mt-8">Connecting to Spotify...</p>;
};

export default SpotifyCallback;
