import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const categories = [
    "Genre", "Time Period", "Duration", "Mood", "Artist", "Popularity", "Instrumental", "Danceability", "Energy", "Tempo"
  ];

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    console.log("Selected Category:", category);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white p-6">
    {/* Navbar */}
    <nav className="flex justify-between items-center p-4 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold">Tunify</h1>
        <div className="flex space-x-4">
        <button className="bg-gray-700 px-4 py-2 rounded-lg border border-gray-500 text-white font-semibold hover:bg-gray-600 transition">
            Connect Apple Music
          </button>
          <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600">
            Logout
          </button>
        </div>
      </nav>


       {/* Main Content */}
       <div className="flex flex-col items-center mt-10 flex-grow">
        <h2 className="text-2xl font-semibold">Welcome, {user ? user.email : "User"}!</h2>
        <p className="text-gray-400 mt-2">Discover New Music with our AI-powered Search Tool </p>
      
        {/* Recommendation Categories */}
        <div className="w-full max-w-3xl bg-gray-800 p-6 rounded-lg shadow-lg mt-10 flex flex-col items-center">
          <h3 className="text-xl font-semibold mb-4">Recommendation Categories</h3>
          <input 
            type="text" 
            placeholder="Search categories..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full p-2 mb-4 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="grid grid-cols-2 gap-4 w-full h-40 overflow-y-auto p-2">
            {categories.filter(cat => cat.toLowerCase().includes(search.toLowerCase())).map((category, index) => (
              <button 
                key={index} 
                className={`p-2 text-center font-semibold hover:text-green-400 transition ${selectedCategory === category ? "text-green-500" : "text-white"}`}
                onClick={() => handleCategoryClick(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recommend Button */}
      <div className="flex justify-center mt-10 mb-6">
        <button className="bg-purple-500 px-6 py-4 rounded-lg font-bold text-white hover:bg-purple-600 transition w-full max-w-md">
          Recommend
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
