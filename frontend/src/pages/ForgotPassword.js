import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Request password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password", 
    });

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Password reset email sent! Check your inbox.");
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg text-white flex flex-col items-center">
        <h2 className="text-3xl font-bold text-center mb-6">Reset Password</h2>

        <form onSubmit={handleResetPassword} className="w-full space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <button type="submit" className="w-full p-3 bg-green-500 rounded text-white font-bold hover:bg-green-600 transition">
            Send Reset Link
          </button>
        </form>

        {error && <p className="text-red-500 text-center mt-2">{error}</p>}
        {success && <p className="text-green-400 text-center mt-2">{success}</p>}

        <p className="text-center mt-4 text-gray-400">
          <span className="text-green-400 hover:underline cursor-pointer" onClick={() => navigate("/")}>
            Back to Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
