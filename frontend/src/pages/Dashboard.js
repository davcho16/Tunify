// frontend/src/pages/Dashboard.js
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import { spotifyAuth, callSpotifyAPI } from "../utils/spotify";

/**
 * Main dashboard component with Spotify integration
 */
const Dashboard = () => {
  // User state
  const [user, setUser] = useState(null);
  const [spotifyProfile, setSpotifyProfile] = useState(null);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  
  // Search and track selection state
  const [trackSearch, setTrackSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  
  // Loading states
  const [isSearching, setIsSearching] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  /**
   * Initialize component - fetch user data and check Spotify connection
   */
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get user data from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/");
          return;
        }
        
        setUser(user);
        
        // Check Spotify connection
        const spotifyStatus = await spotifyAuth.validateConnection();
        setIsSpotifyConnected(spotifyStatus.connected);
        
        if (spotifyStatus.connected) {
          setSpotifyProfile(spotifyStatus.profile);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [navigate]);

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    spotifyAuth.clearTokens();
    navigate("/");
  };

  /**
   * Initiate Spotify connection
   */
  const handleConnectSpotify = () => {
    spotifyAuth.authorize();
  };

  /**
   * Search for tracks based on user input
   */
  const handleSearchTrack = async () => {
    if (!trackSearch.trim()) return;
    
    setError(null);
    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(trackSearch)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.error || "Search failed");
      }
      
      setSearchResults(data.tracks || []);
    } catch (error) {
      console.error("Track search error:", error);
      setError(`Failed to search: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Toggle track selection for recommendations
   */
  const toggleTrackSelection = (track) => {
    const isSelected = selectedTracks.some(t => t.id === track.id);
    
    if (isSelected) {
      setSelectedTracks(selectedTracks.filter(t => t.id !== track.id));
    } else if (selectedTracks.length < 3) {
      setSelectedTracks([...selectedTracks, track]);
    }
  };

  /**
   * Get music recommendations based on selected tracks
   */
  const handleRecommend = async () => {
    if (selectedTracks.length === 0) return;
    
    setIsRecommending(true);
    setRecommendations([]);
    setError(null);
    
    const seedIds = selectedTracks.map(track => track.id).join(",");
    
    try {
      // Ensure the token is valid
      const token = await spotifyAuth.getAccessToken();
      if (!token) {
        throw new Error("Spotify session expired. Please reconnect your account.");
      }
      
      // Make the API call
      const response = await callSpotifyAPI(`smart-recommendations?seeds=${seedIds}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setRecommendations(response.tracks || []);
      
      if (response.tracks?.length === 0) {
        setError("No recommendations found for the selected tracks. Try different songs.");
      }
    } catch (error) {
      console.error("Recommendation error:", error);
      setError(`Failed to get recommendations: ${error.message}`);
      
      // If token is invalid, prompt for reconnection
      if (error.message.includes("expired") || error.message.includes("invalid")) {
        setIsSpotifyConnected(false);
        setSpotifyProfile(null);
      }
    } finally {
      setIsRecommending(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white p-6">
      {/* Header with navigation */}
      <nav className="flex justify-between items-center p-4 bg-gray-800 rounded-lg shadow-lg mb-6">
        <h1 className="text-3xl font-bold">Tunify</h1>
        <div className="flex space-x-4">
          <button 
            onClick={handleConnectSpotify} 
            className="bg-green-600 px-4 py-2 rounded-lg border border-green-500 text-white font-semibold hover:bg-green-700 transition"
          >
            {isSpotifyConnected ? "Reconnect Spotify" : "Connect Spotify"}
          </button>
          <button 
            onClick={handleLogout} 
            className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="flex flex-col items-center mt-4 flex-grow">
        {/* User welcome section */}
        <h2 className="text-2xl font-semibold">
          Welcome, {spotifyProfile?.display_name || user?.user_metadata?.display_name || user?.email || "User"}!
        </h2>
        <p className="text-gray-400 mt-2">Discover New Music with our AI-powered Recommendation Tool</p>

        {/* Main content area */}
        <div className="w-full max-w-2xl mt-10">
          {/* Connection status */}
          {!isSpotifyConnected && (
            <div className="bg-yellow-800 text-yellow-200 p-4 rounded mb-6">
              <p>Please connect your Spotify account to use all features.</p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="bg-red-900 text-red-200 p-4 rounded mb-6">
              <p>{error}</p>
            </div>
          )}
          
          {/* Search section */}
          <div className="mb-8">
            <input
              type="text"
              placeholder="Search for a track..."
              value={trackSearch}
              onChange={(e) => setTrackSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchTrack()}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600"
              disabled={!isSpotifyConnected || isSearching}
            />
            <button
              onClick={handleSearchTrack}
              className="mt-3 w-full p-3 bg-green-500 rounded font-bold hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
              disabled={!isSpotifyConnected || !trackSearch.trim() || isSearching}
            >
              {isSearching ? "Searching..." : "Search Track"}
            </button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-6 mb-8">
              <h3 className="text-lg font-bold mb-2">Search Results</h3>
              <div className="space-y-2">
                {searchResults.map(track => {
                  const isSelected = selectedTracks.some(t => t.id === track.id);
                  return (
                    <div
                      key={track.id}
                      onClick={() => toggleTrackSelection(track)}
                      className={`flex justify-between items-center bg-gray-800 p-3 rounded cursor-pointer hover:bg-gray-700 ${
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
            </div>
          )}

          {/* Selected tracks */}
          {selectedTracks.length > 0 && (
            <div className="mt-6 mb-4">
              <h3 className="text-lg font-bold mb-2">Selected Tracks ({selectedTracks.length}/3)</h3>
              <ul className="space-y-2 mb-4">
                {selectedTracks.map(track => (
                  <li key={track.id} className="flex justify-between items-center bg-gray-800 p-3 rounded">
                    <div>
                      <p className="font-semibold">{track.name}</p>
                      <p className="text-sm text-gray-400">{track.artist}</p>
                    </div>
                    <button
                      onClick={() => setSelectedTracks(selectedTracks.filter(t => t.id !== track.id))}
                      className="text-red-400 hover:text-red-500"
                      aria-label="Remove track"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>

              {/* Recommendation button */}
              <button
                onClick={handleRecommend}
                disabled={!isSpotifyConnected || isRecommending}
                className="w-full p-3 bg-purple-500 rounded font-bold hover:bg-purple-600 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isRecommending 
                  ? "Finding recommendations..." 
                  : `Recommend based on ${selectedTracks.length} track${selectedTracks.length > 1 ? "s" : ""}`}
              </button>
            </div>
          )}

          {/* Recommendations */}
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
                      <p className="text-sm text-gray-400">by {track.artists.map(a => a.name).join(", ")}</p>
                      {track.preview_url && (
                        <audio controls src={track.preview_url} className="mt-2 w-full h-8" />
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