import React, { useState, useEffect, useRef } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaPhoneSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";

const VoiceCallUI = () => {
  const [isMuted, setIsMuted] = useState(false); // State to track mute/unmute
  const [callDuration, setCallDuration] = useState(0); // State to track call duration in seconds
  const [isCallConnected, setIsCallConnected] = useState(false); // Track call connection state
  const [iceServers, setIceServers] = useState([]); // ICE servers for WebRTC
  const peerConnectionRef = useRef(null); // Ref to manage peer connection
  const socketRef = useRef(null); // Ref to manage socket connection
  const navigate = useNavigate();

  // Fetch ICE servers from the backend
  useEffect(() => {
    const fetchIceServers = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/credential`);
        setIceServers(response.data.iceServers);
      } catch (error) {
        console.error("Failed to fetch ICE servers:", error);
      }
    };
    fetchIceServers();
  }, []);

  // Initialize WebRTC and socket connection
  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_BACKEND_URL, {
      auth: {
        token: localStorage.getItem("token"),
      },
    });

    const peerConnection = new RTCPeerConnection({ iceServers });
    peerConnectionRef.current = peerConnection;

    peerConnection.ontrack = (event) => {
      const remoteStream = new MediaStream();
      remoteStream.addTrack(event.track);
      const audioElement = document.getElementById("remote-audio");
      if (audioElement) {
        audioElement.srcObject = remoteStream;
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", { candidate: event.candidate });
      }
    };

    socketRef.current.on("ice-candidate", ({ candidate }) => {
      if (candidate) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socketRef.current.on("call-connected", () => {
      setIsCallConnected(true);
    });

    // Cleanup on unmount
    return () => {
      peerConnection.close();
      socketRef.current.disconnect();
    };
  }, [iceServers]);

  // Timer to update call duration
  useEffect(() => {
    let timer;
    if (isCallConnected) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCallConnected]);

  // Format call duration into minutes and seconds
  const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Handle mute/unmute toggle
  const handleMuteToggle = () => {
    setIsMuted((prev) => !prev);
    const localStream = peerConnectionRef.current.getLocalStreams()[0];
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = !isMuted;
    }
  };

  // Handle call end
  const handleEndCall = () => {
    peerConnectionRef.current.close();
    setCallDuration(0);
    setIsCallConnected(false);
    navigate("/"); // Navigate back to the main page or chat list
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `
          linear-gradient(135deg, rgba(135,206,250,0.6) 0%, rgba(240,248,255,0.5) 100%),
          url('https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?auto=format&fit=crop&w=1500&q=80')
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full h-[100vh] flex flex-col items-center justify-between p-6">
        {/* Call Duration */}
        <div className="text-white text-3xl font-bold mt-10">
          {formatDuration(callDuration)}
        </div>

        {/* Call Controls */}
        <div className="flex items-center gap-8">
          {/* Mute/Unmute Button */}
          <button
            onClick={handleMuteToggle}
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isMuted ? "bg-gray-500" : "bg-green-500"
            } text-white shadow-lg hover:opacity-90 transition`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <FaMicrophoneSlash size={28} /> : <FaMicrophone size={28} />}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-500 text-white shadow-lg hover:opacity-90 transition flex items-center justify-center"
            title="End Call"
          >
            <FaPhoneSlash size={24} />
          </button>
          <audio id="local-audio" autoPlay muted></audio>
          <audio id="remote-audio" autoPlay></audio>
        </div>
      </div>
    </div>
  );
};

export default VoiceCallUI;