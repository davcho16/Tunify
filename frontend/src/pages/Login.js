import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Handle Login
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
    navigate("/dashboard"); // Redirect to Dashboard
  };

  // Handle Spotify Connect (Placeholder)
  const handleConnectSpotify = () => {
    alert("Spotify authentication coming soon!");
    console.log("Spotify OAuth flow should start here.");
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg text-white flex flex-col items-center">
        {/* Tunify Logo */}
        <h1 className="text-5xl font-bold mb-6 tracking-wide">TUNIFY</h1>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <button type="submit" className="w-full p-3 bg-green-500 rounded text-white font-bold hover:bg-green-600 transition">
            Login
          </button>
        </form>

        {/* Forgot Password & Sign Up */}
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

        {/* Spotify Button */}
        <button onClick={handleConnectSpotify} className="mt-6 w-full p-3 bg-gray-700 rounded border border-gray-500 text-white font-semibold hover:bg-gray-600 transition">
          Connect Spotify
        </button>

        {/* Error Message */}
        {error && <p className="text-red-500 text-center mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default Login;
