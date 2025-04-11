// frontend/src/pages/Login.js
import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(error.message);
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
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
          <p className="hover:text-white cursor-pointer" onClick={() => navigate("/forgot-password")}>Forgot password?</p>
          <p>
            Don't have an account? {" "}
            <span className="text-green-400 hover:underline cursor-pointer" onClick={() => navigate("/signup")}>
              Sign up
            </span>
          </p>
        </div>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default Login;
