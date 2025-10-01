import React, { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';


export default function CardRearch() {
  const [data, setData] = useState({ username: "" });
  const [searchUser, setSearchUser] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
  const [currentUserError, setCurrentUserError] = useState("");
  const [showProfileMobile, setShowProfileMobile] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const navigate = useNavigate()

  // Load current user details from localStorage (set on login)
  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) setCurrentUser(JSON.parse(u));
      else setCurrentUserError('Not authenticated');
    } catch {
      setCurrentUserError('Failed to load profile');
    } finally {
      setCurrentUserLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // clear local flags
      localStorage.removeItem('auth');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate("/login");
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

  // Dynamic panel classes for responsive toggle
  const profilePanelClasses = `relative md:w-1/2 flex justify-center md:pr-10 ${showProfileMobile ? 'flex' : 'hidden'} md:flex`;
  const searchPanelClasses = `relative md:w-1/2 flex justify-center md:pl-10 ${showProfileMobile ? 'hidden' : 'flex'} md:flex`;

  return (
    <div className="min-h-screen w-full flex items-center justify-center overflow-hidden relative px-4 py-10"
      style={{
        backgroundImage: `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%), linear-gradient(135deg, rgba(135,206,250,0.55) 0%, rgba(240,248,255,0.55) 100%), url('https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?auto=format&fit=crop&w=1500&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Mobile toggle button */}
      <button
        onClick={() => setShowProfileMobile(p => !p)}
        className="md:hidden fixed left-4 bottom-6 z-30 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/30 backdrop-blur-md active:scale-95 transition"
        title={showProfileMobile ? 'Show Search' : 'Show Profile'}
      >
        {showProfileMobile ? 'Search' : 'Profile'}
      </button>
      <div className="absolute top-4 right-4 flex gap-2 z-20">
        <button
          onClick={handleLogout}
          className="bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white px-5 py-2 rounded-full font-semibold shadow-lg shadow-red-500/30 backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-300"
          title="Logout"
        >
          Logout
        </button>
      </div>
      <div className="relative w-full max-w-6xl flex flex-col md:flex-row items-stretch md:items-center justify-center md:justify-between gap-10 md:gap-0">
        {/* Left Panel: Profile */}
        <div className={profilePanelClasses}>
          <div className="backdrop-blur-xl bg-white/25 rounded-3xl shadow-2xl p-8 border border-white/30 flex flex-col w-full max-w-md animate-[fadeIn_0.6s_ease] overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(31,38,135,0.35)' }}>
            <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
              style={{ background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0 10px, transparent 10px 20px)' }} />
            <h2 className="text-2xl font-bold text-gray-900 mb-5 drop-shadow-sm flex items-center gap-2">
              <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-transparent bg-clip-text">Your Profile</span>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </h2>
            {currentUserLoading ? (
              <div className="animate-pulse space-y-5 w-full">
                <div className="w-28 h-28 rounded-2xl bg-white/60" />
                <div className="h-4 w-48 bg-white/60 rounded" />
                <div className="h-3 w-60 bg-white/50 rounded" />
              </div>
            ) : currentUserError ? (
              <div className="text-red-600 text-sm">{currentUserError}</div>
            ) : currentUser ? (
              <div className="flex flex-col items-start gap-5">
                <div className="relative">
                  <img
                    src={currentUser.profilePic || 'https://via.placeholder.com/150?text=Avatar'}
                    alt="Avatar"
                    className="w-32 h-32 rounded-2xl object-cover border border-white/60 shadow-xl shadow-indigo-500/20"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-[10px] px-2 py-1 rounded-full shadow">YOU</div>
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-900 tracking-wide">{currentUser.name}</p>
                  <p className="text-sm text-gray-700">@{currentUser.username}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-[10px] uppercase tracking-wider bg-indigo-500/20 text-indigo-700 px-2 py-1 rounded-full">Active</span>
                    <span className="text-[10px] uppercase tracking-wider bg-fuchsia-500/20 text-fuchsia-700 px-2 py-1 rounded-full">Secure Session</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-700">No profile loaded.</div>
            )}
           
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-white/60 to-transparent h-[420px] mx-2 rounded-full shadow-[0_0_12px_-2px_rgba(255,255,255,0.45)]" />
        <div className="md:hidden h-px w-full bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-full mb-2 -mt-4" />

        {/* Right Panel: Search */}
  <div className={searchPanelClasses}>
          <div className="backdrop-blur-xl bg-white/25 rounded-3xl shadow-2xl p-8 border border-white/30 w-full max-w-md animate-[fadeIn_0.7s_ease] overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(31,38,135,0.35)' }}>
            <div className="absolute inset-0 pointer-events-none opacity-35 mix-blend-overlay"
              style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.35), transparent 60%)' }} />
            <h2 className="text-2xl font-bold mb-7 drop-shadow-sm bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-transparent bg-clip-text">Find a Partner</h2>
            <form onSubmit={handleSend} className="flex flex-col gap-6">
              <TextField
                value={data.username}
                name="username"
                onChange={handleChange}
                placeholder="Enter partner's username..."
                variant="outlined"
                fullWidth
                InputProps={{ className: 'bg-white/80 rounded-xl shadow-inner shadow-black/10' }}
                size="small"
              />
              <Button
                type="submit"
                variant="contained"
                sx={{
                  background: 'linear-gradient(90deg, #a18cd1 0%, #fbc2eb 100%)',
                  color: '#fff', fontWeight: 'bold', borderRadius: '0.85rem',
                  px: 3, py: { xs: 1.2, sm: 1.5 }, fontSize: { xs: '1rem', sm: '1.05rem' }, letterSpacing: '0.5px',
                  boxShadow: '0 6px 18px -4px rgba(168,85,247,0.45)',
                  '&:hover': { background: 'linear-gradient(90deg, #fbc2eb 0%, #a18cd1 100%)', boxShadow: '0 8px 22px -6px rgba(168,85,247,0.55)' }
                }}
                disabled={searchUser}
              >
                {searchUser ? 'Searching ...' : 'Search'}
              </Button>
            </form>
            <div className="mt-8 text-[11px] text-gray-600 space-y-1 leading-relaxed">
              <p>Usernames are case-sensitive.</p>
              <p>If the user exists you'll be redirected to the conversation page.</p>
              <p className="text-[10px] text-gray-500 pt-2">Need to add someone? Ask them to sign up first.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
