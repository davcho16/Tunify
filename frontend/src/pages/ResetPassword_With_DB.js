import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Update the user's password in Supabase
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      return;
    }

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Unable to fetch user info.");
      return;
    }
	
    // Update the password in the custom 'users' table
    const { error: dbError } = await supabase
      .from("users")
      .update({ password })
      .eq("email", user.email);

    if (dbError) {
      setError("Password updated in auth but failed to update in database.");
      return;
    }

    setSuccess("Password updated successfully! Redirecting to login...");
    setTimeout(() => navigate("/"), 1000); // Redirect to login after 1 seconds
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg text-white flex flex-col items-center">
        <h2 className="text-3xl font-bold text-center mb-6">Set New Password</h2>

        <form onSubmit={handleUpdatePassword} className="w-full space-y-4">
          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <button type="submit" className="w-full p-3 bg-green-500 rounded text-white font-bold hover:bg-green-600 transition">
            Update Password
          </button>
        </form>

        {error && <p className="text-red-500 text-center mt-2">{error}</p>}
        {success && <p className="text-green-400 text-center mt-2">{success}</p>}
      </div>
    </div>
  );
};

export default ResetPassword;
