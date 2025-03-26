import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
//supabase Log-in
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    alert("Login successful!");
    navigate("/dashboard");
  };
//Spotify OAuth
const handleConnectSpotify = () => {
  localStorage.removeItem("spotify_access_token"); // 🔁 start fresh

  const clientId = "182f6f4353a244fd846d4bfcf29b96ab";
  const redirectUri = "http://localhost:3000/callback"; // must match Spotify settings exactly

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


  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg text-white flex flex-col items-center">
        <h1 className="text-5xl font-bold mb-6 tracking-wide">TUNIFY</h1>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 border border-gray-600"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 border border-gray-600"
            required
          />
          <button type="submit" className="w-full p-3 bg-green-500 rounded font-bold hover:bg-green-600">
            Login
          </button>
        </form>

        <div className="text-center mt-4 text-gray-400">
          <p className="hover:text-white cursor-pointer" onClick={() => navigate("/forgot-password")}>
            Forgot password?
          </p>
          <p>
            Don't have an account?{" "}
            <span className="text-green-400 hover:underline cursor-pointer" onClick={() => navigate("/signup")}>
              Sign up
            </span>
          </p>
        </div>

        <button
          onClick={handleConnectSpotify}
          className="mt-6 w-full p-3 bg-green-600 rounded border border-green-500 text-white font-semibold hover:bg-green-700 transition"
        >
          Connect Spotify
        </button>

        {error && <p className="text-red-500 text-center mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default Login;
