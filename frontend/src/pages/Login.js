// frontend/src/pages/Login.js
import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import { spotifyAuth } from "../utils/spotify";

/**
 * Login component for user authentication
 */
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  /**
   * Handle Supabase email/password login
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Spotify OAuth login
   */
  const handleConnectSpotify = () => {
    spotifyAuth.authorize();
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
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
            disabled={isLoading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="w-full p-3 bg-green-500 rounded font-bold hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
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

        <div className="mt-8 w-full">
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-800 px-4 text-sm text-gray-400">Or continue with</span>
            </div>
          </div>
          
          <button
            onClick={handleConnectSpotify}
            className="w-full p-3 bg-green-600 rounded border border-green-500 text-white font-semibold hover:bg-green-700 transition flex items-center justify-center"
          >
            <span>Connect with Spotify</span>
          </button>
        </div>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default Login;