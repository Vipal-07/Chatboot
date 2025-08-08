import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';


export default function CardRearch() {
  const [data, setData] = useState({
    username: "",
  });
  const [searchUser, setSearchUser] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      localStorage.removeItem("token");
      navigate("/weather"); // Navigate to the weather page after logout
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };


  const handleSend = async (e) => {
    e.preventDefault();
    setSearchUser(true)
    // e.stopPropagation();
    if (!data.username.trim()) {
      alert("Please enter a username.");
      return;

    }


    const URL = BACKEND_URL;
    try {

      const response = await axios.post(URL + "/card", data)
      const id = response.data.data._id;
      toast.success(response.data.message)
      if (response.data.success) {
        setData("");
        navigate('/card/' + id)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send message. Please try again.");
    } finally {
      setSearchUser(false)
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center overflow-hidden relative"
      style={{
        backgroundImage: `
    linear-gradient(135deg, rgba(135,206,250,0.6) 0%, rgba(240,248,255,0.5) 100%),
    url('https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?auto=format&fit=crop&w=1500&q=80')
  `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >

      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-semibold transition"
          title="Logout"
        >
          Logout
        </button>
      </div>

      <div
        className="backdrop-blur-md bg-white/20 rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 w-full max-w-xs sm:max-w-sm md:max-w-md border border-white/30"
        style={{
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
        }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-black mb-4 sm:mb-6 text-center drop-shadow">
          Chat with your partner
        </h2>
        <form onSubmit={handleSend} className="flex flex-col gap-4">
          <TextField
            value={data.username}
            name="username"
            onChange={handleChange}
            placeholder="Write your partner Username ..."
            variant="outlined"
            fullWidth
            InputProps={{
              className: "bg-white/60 rounded",
            }}
            size="small"
          />
          <Button
            type="submit"
            variant="contained"
            sx={{
              background: "linear-gradient(90deg, #a18cd1 0%, #fbc2eb 100%)",
              color: "#fff",
              fontWeight: "bold",
              borderRadius: "0.75rem",
              px: 3,
              py: { xs: 1, sm: 1.5 },
              fontSize: { xs: "1rem", sm: "1.125rem" },
              '&:hover': {
                background: "linear-gradient(90deg, #fbc2eb 0%, #a18cd1 100%)",
              },
            }}
            disabled={searchUser}
          >
            {searchUser ? "Searching ..." : "Search"}
          </Button>
        </form>

      </div>
    </div>
  );
}
