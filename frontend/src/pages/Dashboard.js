import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [spotifyProfile, setSpotifyProfile] = useState(null);
  const [trackSearch, setTrackSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const token = localStorage.getItem("spotify_access_token");
      if (token) {
        try {
          const res = await fetch("http://localhost:3001/api/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const spotifyData = await res.json();
          setSpotifyProfile(spotifyData);
        } catch (err) {
          console.error("Failed to fetch Spotify profile", err);
        }
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("spotify_access_token");
    navigate("/");
  };

  const handleConnectSpotify = () => {
    localStorage.removeItem("spotify_access_token");

    const clientId = "182f6f4353a244fd846d4bfcf29b96ab";
    const redirectUri = "http://localhost:3000/callback";

    const scopes = [
      "user-read-private",
      "user-read-email",
      "user-top-read",
      "playlist-read-private",
    ];

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scopes.join("%20")}&show_dialog=true`;

    window.location.href = authUrl;
  };

  const handleSearchTrack = async () => {
    setSearchResults([]);
    setRecommendations([]);

    const res = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(trackSearch)}`);
    const data = await res.json();
    setSearchResults(data.tracks || []);
  };

  const toggleTrackSelection = (track) => {
    const isSelected = selectedTracks.some(t => t.id === track.id);
    if (isSelected) {
      setSelectedTracks(selectedTracks.filter(t => t.id !== track.id));
    } else if (selectedTracks.length < 3) {
      setSelectedTracks([...selectedTracks, track]);
    }
  };

  const handleRecommend = async (seedIdsCSV) => {
    const token = localStorage.getItem("spotify_access_token");
    if (!token) {
      alert("Spotify token not found. Please connect Spotify again.");
      return;
    }

    console.log("📡 Calling smart recommendation API with token:", token);

    const res = await fetch(`http://localhost:3001/api/smart-recommendations?seeds=${seedIdsCSV}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (data.error) {
      alert("Failed to fetch recommendations: " + data.error);
    }
    setRecommendations(data.tracks || []);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white p-6">
      <nav className="flex justify-between items-center p-4 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold">Tunify</h1>
        <div className="flex space-x-4">
          <button onClick={handleConnectSpotify} className="bg-green-600 px-4 py-2 rounded-lg border border-green-500 text-white font-semibold hover:bg-green-700 transition">
            Connect Spotify
          </button>
          <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600">
            Logout
          </button>
        </div>
      </nav>

      <div className="flex flex-col items-center mt-10 flex-grow">
        <h2 className="text-2xl font-semibold">
          Welcome, {spotifyProfile?.display_name || spotifyProfile?.email || user?.email || "User"}!
        </h2>
        <p className="text-gray-400 mt-2">Discover New Music with our AI-powered Search Tool</p>

        <div className="w-full max-w-2xl mt-10">
          <input
            type="text"
            placeholder="Search for a track..."
            value={trackSearch}
            onChange={(e) => setTrackSearch(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 border border-gray-600"
          />
          <button
            onClick={handleSearchTrack}
            className="mt-3 w-full p-3 bg-green-500 rounded font-bold hover:bg-green-600"
          >
            Search Track
          </button>

          {searchResults.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-2">Search Results</h3>
              {searchResults.map(track => {
                const isSelected = selectedTracks.some(t => t.id === track.id);
                return (
                  <div
                    key={track.id}
                    onClick={() => toggleTrackSelection(track)}
                    className={`flex justify-between items-center bg-gray-800 p-3 rounded mb-2 cursor-pointer ${
                      isSelected ? "ring-2 ring-green-400" : ""
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{track.name}</p>
                      <p className="text-sm text-gray-400">{track.artist}</p>
                    </div>
                    {isSelected && <span className="text-green-400 text-sm">Selected</span>}
                  </div>
                );
              })}
            </div>
          )}

          {selectedTracks.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-2">Selected Tracks ({selectedTracks.length}/3)</h3>
              <ul className="space-y-2">
                {selectedTracks.map(track => (
                  <li key={track.id} className="flex justify-between items-center bg-gray-800 p-3 rounded">
                    <div>
                      <p className="font-semibold">{track.name}</p>
                      <p className="text-sm text-gray-400">{track.artist}</p>
                    </div>
                    <button
                      onClick={() => setSelectedTracks(selectedTracks.filter(t => t.id !== track.id))}
                      className="text-red-400 hover:text-red-500 text-sm"
                    >
                      ❌ Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedTracks.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => handleRecommend(selectedTracks.map(t => t.id).join(","))}
                className="w-full p-3 bg-purple-500 rounded font-bold hover:bg-purple-600 transition"
              >
                Recommend based on {selectedTracks.length} track{selectedTracks.length > 1 ? "s" : ""}
              </button>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="mt-10">
              <h3 className="text-xl font-bold mb-4">Recommended Songs</h3>
              <ul className="space-y-4">
                {recommendations.map((track) => (
                  <li key={track.id} className="bg-gray-800 p-4 rounded flex gap-4 items-center">
                    {track.album?.images?.[2] && (
                      <img
                        src={track.album.images[2].url}
                        alt={track.name}
                        className="w-16 h-16 rounded shadow"
                      />
                    )}
                    <div className="flex-grow">
                      <p className="font-bold">{track.name}</p>
                      <p className="text-sm text-gray-400">by {track.artists[0].name}</p>
                      {track.preview_url && (
                        <audio controls src={track.preview_url} className="mt-2 w-full" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
