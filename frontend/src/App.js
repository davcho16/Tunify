import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<h1 className="text-white text-center mt-20">Dashboard (Coming Soon)</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
