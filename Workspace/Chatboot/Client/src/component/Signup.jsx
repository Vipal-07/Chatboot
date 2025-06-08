// filepath: /home/vikas07/Public/Chatboot/Client/src/component/Signup.jsx
import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Signup() {
  const [data, setData] = useState({
    name: "",
    username: "",
    password: ""
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!data.name.trim() || !data.username.trim() || !data.password.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    const URL = "http://localhost:5000/signup";
    try {
      const response = await axios.post(URL, data);
      toast.success(response.data.message);
      if (response.data.success) {
        navigate('/login');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to sign up. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center overflow-hidden relative">
      <div className="backdrop-blur-md bg-white/20 rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 w-full max-w-xs sm:max-w-sm md:max-w-md border border-white/30">
        <h2 className="text-2xl sm:text-3xl font-bold text-black mb-4 sm:mb-6 text-center drop-shadow">
          Create an Account
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            value={data.name}
            name="name"
            onChange={handleChange}
            placeholder="Enter your name"
            variant="outlined"
            fullWidth
            InputProps={{
              className: "bg-white/60 rounded",
            }}
            size="small"
          />
          <TextField
            value={data.username}
            name="username"
            onChange={handleChange}
            placeholder="Choose a username"
            variant="outlined"
            fullWidth
            InputProps={{
              className: "bg-white/60 rounded",
            }}
            size="small"
          />
          <TextField
            type="password"
            value={data.password}
            name="password"
            onChange={handleChange}
            placeholder="Create a password"
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
          >
            Sign Up
          </Button>
        </form>
      </div>
    </div>
  );
}