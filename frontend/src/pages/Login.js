import { useState } from "react";
import { supabase } from "../supabase";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    // ✅ Log in with email and password only
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      return;
    }

    alert("Login successful!");
    window.location.href = "/dashboard"; // Redirect after login
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg text-white">
        <h2 className="text-3xl font-bold text-center mb-6">Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
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
          <button type="submit" className="w-full p-3 bg-green-500 rounded">
            Login
          </button>
        </form>
        {error && <p className="text-red-500 text-center mt-2">{error}</p>}

        <p className="text-center mt-4 text-gray-400">
          Don't have an account? <a href="/signup" className="text-green-400">Sign up</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
