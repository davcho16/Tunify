import { useLocation, useNavigate } from "react-router-dom";

const Recommendation = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const recommendations = state?.recommendations || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">Your Recommendations</h1>

      {recommendations.length > 0 ? (
        <div className="space-y-4 w-full max-w-2xl">
          {recommendations.map((rec, index) => (
            <div
              key={rec.id || index}
              className="bg-gray-800 p-4 rounded shadow text-center"
            >
              <p className="text-xl font-semibold mb-1">{rec.name}</p>
              <p className="text-gray-400">{rec.artists}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-red-400">No recommendations available.</p>
      )}

      <button
        onClick={() => navigate("/dashboard")}
        className="mt-8 bg-blue-500 px-4 py-2 rounded hover:bg-blue-600"
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default Recommendation;
