import { useState } from "react";
import { supabase } from "../supabase";
import bcrypt from "bcryptjs";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState(null);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // Step 1: Sign up the user with Supabase Auth
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: username },
        },
      });

      if (authError) throw authError;

      // Step 2: Hash the password before storing it
      const hashedPassword = await bcrypt.hash(password, 10);

      // Step 3: Insert into 'users' table with hashed password
      const { error: insertError } = await supabase.from("users").insert([
        {
          username: username,
          email: email,
          password: hashedPassword,
        },
      ]);

      if (insertError) {
        console.error("Insert error:", insertError.message);
      }

      alert("Signup pending! Check your email to confirm/authenticate.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg text-white">
        <h2 className="text-3xl font-bold text-center mb-6">Sign Up</h2>
        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 border border-gray-600"
            required
          />
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
            Sign Up
          </button>
        </form>
        {error && <p className="text-red-500 text-center mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default Signup;
