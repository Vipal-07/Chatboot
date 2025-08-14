import React, { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { requestFcmTokenAndRegister } from '../firebase.js';

export default function Login() {
  const [data, setData] = useState({
    username: "",
    password: "",
  });
  const [login, setLogin] = useState(false);
  const navigate = useNavigate()
  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // Redirect already-authenticated users
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/me`, { withCredentials: true });
        if (!cancelled && res.data?.success) navigate('/card');
      } catch { }
    })();
    return () => { cancelled = true; };
  }, [BACKEND_URL, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLogin(true)
    const URL = BACKEND_URL;
    try {
      const response = await axios.post(URL + "/login", data, { withCredentials: true });
      toast.success(response.data.message)
      if (response.data.success) {
        // register FCM token in background (don't block navigation)
        requestFcmTokenAndRegister();
        setData({ username: "", password: "" });
        navigate('/card');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLogin(false)
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `
    linear-gradient(135deg, rgba(135,206,250,0.6) 0%, rgba(240,248,255,0.5) 100%),
    url('https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?auto=format&fit=crop&w=1500&q=80')
  `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div
        className="backdrop-blur-md bg-white/20 rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 w-full max-w-xs sm:max-w-sm md:max-w-md border border-white/30"
        style={{
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
        }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-black mb-4 sm:mb-6 text-center drop-shadow">
          Login
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 mb-4">
          <TextField
            label="Username"
            name="username"
            value={data.username}
            onChange={handleChange}
            variant="outlined"
            fullWidth
            InputProps={{
              className: "bg-white/60 rounded mb-2 sm:mb-4",
            }}
            size="small"
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            value={data.password}
            onChange={handleChange}
            variant="outlined"
            fullWidth
            InputProps={{
              className: "bg-white/60 rounded mb-2 sm:mb-4 text-black",
            }}
            size="small"
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              background: "linear-gradient(90deg, #a18cd1 0%, #fbc2eb 100%)",
              color: "#fff",
              fontWeight: "bold",
              boxShadow: "0 4px 14px 0 rgba(0,0,0,0.15)",
              borderRadius: "0.75rem",
              py: { xs: 1, sm: 1.5 },
              mt: 2,
              fontSize: { xs: "1rem", sm: "1.125rem" },
              '&:hover': {
                background: "linear-gradient(90deg, #fbc2eb 0%, #a18cd1 100%)",
              },
            }}
            disabled={login}
          >
            {login ? "Login ..." : "Log In"}
          </Button>
        </form>
        <div className="text-center text-sm sm:text-base">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:underline">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
