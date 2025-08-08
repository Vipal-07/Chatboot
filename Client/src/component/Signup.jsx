import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';


export default function Signup() {
  const [data, setData] = useState({
    name: "",
    username: "",
    password: "",
    profilePic: "",
  });
  const [uploading, setUploading] = useState(false); // For upload state
  const [signingUp, setSigningUp] = useState(false);
  const navigate = useNavigate()
  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  // Cloudinary upload handler
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "Upload_Profile");
    formData.append("cloud_name", "dfeimiswp");

    const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dfeimiswp/image/upload";

    try {
      const res = await axios.post(
        CLOUDINARY_URL,
        formData,
        // {withCredentials: true }
      );
      setData({ ...data, profilePic: res.data.secure_url });
      toast.success("Profile picture uploaded!");
    } catch (err) {
      toast.error("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSigningUp(true);
    const URL = BACKEND_URL;
    try {
      const response = await axios.post(URL + "/signup", data);
      toast.success(response.data.message)
      if (response.data.success) {
        setData({
          name: "",
          username: "",
          password: "",
          profilePic: "",
        })

        navigate('/card')

      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setSigningUp(false);
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
          Sign Up
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 mb-4">
          <TextField
            className=""
            label="Name"
            name="name"
            value={data.name}
            onChange={handleChange}
            variant="outlined"
            fullWidth
            InputProps={{
              className: "bg-white/60 rounded mb-2 sm:mb-4",
            }}
            size="small"
          />
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
          {/* Profile Picture Upload */}
          <div>
            <label className="block mb-1 font-medium text-black">Profile Picture</label>
            <input
              type="file"
              accept="image/*"
              name="profilePic"
              onChange={handleImageChange}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            />
            {uploading && <div className="text-xs text-gray-600 mt-1">Uploading...</div>}
            {data.profilePic && (
              <img
                src={data.profilePic}
                alt="Profile Preview"
                className="mt-2 rounded-full w-16 h-16 object-cover border"
              />
            )}
          </div>
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
            disabled={uploading || signingUp}
          >
            {signingUp ? "Signing Up..." : "Sign Up"}
          </Button>
        </form>
        <div className="text-center text-sm sm:text-base">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">Log In</Link>
        </div>
      </div>

    </div>
  );
}
