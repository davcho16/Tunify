import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [trackSearch, setTrackSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/");
          return;
        }
        setUser(user);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSearchTrack = async () => {
    if (!trackSearch.trim()) return;
    setError(null);
    setSearchResults([]);

    try {
      const response = await fetch(`http://localhost:3001/api/search?query=${encodeURIComponent(trackSearch)}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Search failed");
      setSearchResults(data.results);
    } catch (error) {
      console.error("Search error:", error);
      setError("Failed to search: " + error.message);
    }
  };

  const toggleTrackSelection = (track) => {
    const isSelected = selectedTracks.some((t) => t.song_id === track.song_id);
    if (isSelected) {
      setSelectedTracks(selectedTracks.filter((t) => t.song_id !== track.song_id));
    } else if (selectedTracks.length < 3) {
      setSelectedTracks([...selectedTracks, track]);
    }
  };

  const handleRecommend = async () => {
    if (selectedTracks.length !== 3) {
      setError("Please select exactly 3 tracks for recommendations.");
      return;
    }
  
    setError(null);
  
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email;
      const ids = selectedTracks.map((t) => t.song_id).join(",");
  
      const response = await fetch("http://localhost:3001/api/recommend-cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, email }),
      });
  
      let data;
      try {
        data = await response.json();
      } catch (err) {
        throw new Error("Invalid response from server. Try again later.");
      }
  
      if (!response.ok) throw new Error(data.error || "Recommendation failed");
  
      if (!data.recommendations || data.recommendations.length === 0) {
        setError("No similar song found.");
      } else {
        navigate("/recommendation", {
          state: { recommendations: data.recommendations },
        });
      }
    } catch (err) {
      console.error("Recommend error:", err);
      setError(err.message);
    }
  };  

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white p-6">
      <nav className="flex justify-between items-center p-4 bg-gray-800 rounded-lg shadow-lg mb-6">
        <h1 className="text-3xl font-bold">Tunify</h1>
        <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600">
          Logout
        </button>
      </nav>

      <div className="flex flex-col items-center mt-4 flex-grow">
        <h2 className="text-2xl font-semibold">
          Welcome, {user?.user_metadata?.display_name || user?.email || "User"}!
        </h2>
        <p className="text-gray-400 mt-2">Discover New Music with our AI-powered Recommendation Tool</p>

        <div className="w-full max-w-2xl mt-10">
          {error && <div className="bg-red-900 text-red-200 p-4 rounded mb-6">{error}</div>}

          <div className="mb-8">
            <input
              type="text"
              placeholder="Search for a track..."
              value={trackSearch}
              onChange={(e) => setTrackSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchTrack()}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600"
            />
            <button
              onClick={handleSearchTrack}
              className="mt-3 w-full p-3 bg-green-500 rounded font-bold hover:bg-green-600 disabled:bg-gray-600"
              disabled={!trackSearch.trim()}
            >
              Search Track
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-6 mb-8">
              <h3 className="text-lg font-bold mb-2">Search Results</h3>
              <div className="space-y-2">
                {searchResults.map((track) => {
                  const isSelected = selectedTracks.some((t) => t.song_id === track.song_id);
                  return (
                    <div
                      key={track.song_id}
                      onClick={() => toggleTrackSelection(track)}
                      className={`flex justify-between items-center bg-gray-800 p-3 rounded cursor-pointer hover:bg-gray-700 ${
                        isSelected ? "ring-2 ring-green-400" : ""
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{track.name}</p>
                        <p className="text-sm text-gray-400">{track.artists}</p>
                      </div>
                      {isSelected && <span className="text-green-400 text-sm">Selected</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedTracks.length > 0 && (
            <div className="mt-6 mb-4">
              <h3 className="text-lg font-bold mb-2">Selected Tracks ({selectedTracks.length}/3)</h3>
              <ul className="space-y-2 mb-4">
                {selectedTracks.map((track) => (
                  <li key={track.song_id} className="flex justify-between items-center bg-gray-800 p-3 rounded">
                    <div>
                      <p className="font-semibold">{track.name}</p>
                      <p className="text-sm text-gray-400">{track.artists}</p>
                    </div>
                    <button
                      onClick={() => setSelectedTracks(selectedTracks.filter((t) => t.song_id !== track.song_id))}
                      className="text-red-400 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleRecommend}
                className="w-full p-3 bg-purple-500 rounded font-bold hover:bg-purple-600"
              >
                Recommend based on 3 tracks
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
