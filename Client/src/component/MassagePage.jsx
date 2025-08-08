import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { IoClose } from "react-icons/io5";
import { FaPlus } from "react-icons/fa6";
import { FaImage } from "react-icons/fa6";
import { IoMdSend } from "react-icons/io";
import { FaPhone } from "react-icons/fa";
import { FaMicrophone, FaMicrophoneSlash, FaPhoneSlash } from "react-icons/fa";
import { Link, useParams, useNavigate } from 'react-router-dom'
import ScrollToBottom from 'react-scroll-to-bottom';
import axios from 'axios';
import UploadFile from './UploadFile'; // Assuming UploadImage is in the same directory


const MassagePage = () => {
  const [userDetail, setUserDetail] = useState({
    _id: "",
    name: "",
    username: "",
    profilePic: "",
  })
  const [isOnline, setIsOnline] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    _id: "",
    name: "",
    username: "",
    profilePic: "",
  })
  const [massage, setMassage] = useState({
    text: "",
    imageUrl: "",
    videoUrl: ""
  })
  const [allMassage, setAllMassage] = useState([]);
  const [openImageVideoUpload, setOpenImageVideoUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [iceServers, setIceServers] = useState([]);
  // ...existing state...
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callConnected, setCallConnected] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [pendingCandidates, setPendingCandidates] = useState([]);
  // ...existing state...
  const peerConnectionRef = useRef(null);
  const params = useParams()
  const socketRef = useRef();
  const navigate = useNavigate();

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const createPeerConnection = () => {
    peerConnectionRef.current = new RTCPeerConnection({ iceServers });
    // Handle ICE candidates
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", {
          receiverId: userDetail._id,
          candidate: event.candidate,
        });
      }
    };
    // Track handler for remote audio
    peerConnectionRef.current.ontrack = (event) => {
      let inboundStream = remoteStream || new MediaStream();
      inboundStream.addTrack(event.track);
      setRemoteStream(inboundStream);
      // Attach to audio element
      const audioElement = document.getElementById("remote-audio");
      if (audioElement) {
        audioElement.srcObject = inboundStream;
      }
    };
  };

  // Function to handle logout
  const handleLogout = async () => {
    try {
      localStorage.removeItem("token");
      navigate("/weather"); // Navigate to the weather page after logout
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Function to get a cookie by name
  // const getCookie = (name) => {
  //   const value = `; ${document.cookie}`;
  //   const parts = value.split(`; ${name}=`);
  //   if (parts.length === 2) return parts.pop().split(';').shift();
  //   return null;
  // };

  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("Notification permission granted.");
        } else {
          console.log("Notification permission denied.");
        }
      });
    }
  }, []);

  useEffect(() => {
    const backendUrl = BACKEND_URL;
    socketRef.current = io(backendUrl, {
      auth: {
        token: localStorage.getItem('token')
      },
      // auth: {
      //   token, // Send token to the server
      // },
    });
    socketRef.current.on('receiver-user', (data) => {
      setUserDetail(data);
    });
    socketRef.current.on('currentUser-details', (data) => {
      setCurrentUser(data);
    })
    const handleOnlineStatus = (data) => {
      if (data.userId === params.userId) {
        setIsOnline(data.isOnline);
      }
    };
    socketRef.current.on('user-online-status', handleOnlineStatus);
    socketRef.current.on("connect", () => {
      if (params.userId) {
        socketRef.current.emit('get-user-details', params.userId);
      }
    })
    socketRef.current.emit('check-user-online', params.userId);
    return () => {
      socketRef.current.off('user-online-status', handleOnlineStatus);
      socketRef.current.disconnect();
    }
  }, [params.userId, socketRef]);



  useEffect(() => {
    if (!currentUser.username) return;
    const fetchICE = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/credential`);
        setIceServers(response.data.iceServers);
      }
      catch (error) {
        console.error("Error fetching ICE servers:", error);
      }
    };
    fetchICE();


    socketRef.current.on("incoming-call", async ({ senderId, offer }) => {
      const acceptCall = window.confirm("Incoming call. Do you want to accept?");
      if (acceptCall) {
        // Create a peer connection
        createPeerConnection();

        // Set the remote description
        await setRemoteDescriptionAndAddCandidates(offer);

        // Create an answer
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        // Send the answer back to the caller
        socketRef.current.emit("answer-call", {
          senderId,
          answer,
        });

        // Navigate to the VoiceCallUI
        // navigate("/call");
      }
    });

    socketRef.current.on("call-answered", async ({ answer }) => {
      await setRemoteDescriptionAndAddCandidates(answer);
      // setCallConnected(true); // <-- ADD THIS ON CALLER SIDE
      // Navigate to the VoiceCallUI
    });

    socketRef.current.on("ice-candidate", ({ candidate }) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(candidate);
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [currentUser.username]);
  useEffect(() => {
    let timer;
    if (callConnected) {
      timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [callConnected]);
  const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };



  const handleCallUser = async () => {
    setIsCalling(true);
    // setInCall(true);
    // Create a peer connection
    createPeerConnection();

    // Add audio track to the peer connection
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setLocalStream(stream);
    stream.getTracks().forEach((track) => {
      peerConnectionRef.current.addTrack(track, stream);
    });
    // Attach to local audio element (for mute/unmute)
    const localAudio = document.getElementById("local-audio");
    if (localAudio) localAudio.srcObject = stream;

    // Create an offer
    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);

    // Send the offer to the receiver
    socketRef.current.emit("call-user", {
      receiverId: userDetail._id,
      offer,
    });

    // Navigate to VoiceCallUI
    // navigate("/call");
  };

  const setRemoteDescriptionAndAddCandidates = async (desc) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(desc);
      // Add all pending candidates
      pendingCandidates.forEach((candidate) => {
        peerConnectionRef.current.addIceCandidate(candidate);
      });
      setPendingCandidates([]); // Clear buffer
    }
  };

  // Accept incoming call
  useEffect(() => {
    if (!socketRef.current) return;
    socketRef.current.on("incoming-call", async ({ senderId, offer }) => {
      setIncomingCall({ senderId, offer });
      // const acceptCall = window.confirm("Incoming call. Do you want to accept?");
      // if (acceptCall) {
      //   setInCall(true);
      //   createPeerConnection();

      //   // Get local audio
      //   const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      //   setLocalStream(stream);
      //   stream.getTracks().forEach((track) => {
      //     peerConnectionRef.current.addTrack(track, stream);
      //   });
      //   const localAudio = document.getElementById("local-audio");
      //   if (localAudio) localAudio.srcObject = stream;

      //   await peerConnectionRef.current.setRemoteDescription(offer);
      //   const answer = await peerConnectionRef.current.createAnswer();
      //   await peerConnectionRef.current.setLocalDescription(answer);

      //   socketRef.current.emit("answer-call", {
      //     senderId,
      //     answer,
      //   });
      // }
    });

    socketRef.current.on("call-answered", async ({ answer }) => {
      await setRemoteDescriptionAndAddCandidates(answer);
      setCallConnected(true);
    });

    socketRef.current.on("ice-candidate", ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        if (
          peerConnectionRef.current.remoteDescription &&
          peerConnectionRef.current.remoteDescription.type
        ) {
          peerConnectionRef.current.addIceCandidate(candidate);
        } else {
          // Buffer the candidate until remote description is set
          setPendingCandidates((prev) => [...prev, candidate]);
        }
      }
    });

    return () => {
      socketRef.current.off("incoming-call");
      socketRef.current.off("call-answered");
      socketRef.current.off("ice-candidate");
    };
  }, [iceServers, userDetail._id, remoteStream]);

  useEffect(() => {
    if (
      peerConnectionRef.current &&
      peerConnectionRef.current.localDescription &&
      peerConnectionRef.current.remoteDescription
    ) {
      setCallConnected(true);
      setInCall(true); // <-- MOVE HERE
      setIsCalling(false);  // Hide "Ringing..." when call is connected
    }
  }, [
    peerConnectionRef.current?.localDescription,
    peerConnectionRef.current?.remoteDescription,
  ]);

  const handleAcceptCall = async () => {
    setInCall(true);
    setIncomingCall(null);
    createPeerConnection();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setLocalStream(stream);
    stream.getTracks().forEach((track) => {
      peerConnectionRef.current.addTrack(track, stream);
    });
    const localAudio = document.getElementById("local-audio");
    if (localAudio) localAudio.srcObject = stream;

    await setRemoteDescriptionAndAddCandidates(incomingCall.offer);
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);

    socketRef.current.emit("answer-call", {
      senderId: incomingCall.senderId,
      answer,
    });
  };

  // CallReject

  const handleRejectCall = () => {
    socketRef.current.emit("reject-call", { senderId: incomingCall.senderId });
    setIncomingCall(null);
  };

  // Mute/unmute
  const handleMuteToggle = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  // End call
  const handleEndCall = () => {
    setInCall(false);
    setCallConnected(false);
    setCallDuration(0);
    setIsCalling(false);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);

    // Emit end-call to the other user
    if (socketRef.current && userDetail._id) {
      socketRef.current.emit("end-call", { receiverId: userDetail._id });
    }
  };

  useEffect(() => {
    if (!socketRef.current) return;
    const handleCallEnded = () => {
      setInCall(false);
      setCallConnected(false);
      setCallDuration(0);
      setIsCalling(false);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
      setRemoteStream(null);
      // Optionally show a message or notification
    };
    socketRef.current.on("call-ended", handleCallEnded);
    return () => {
      socketRef.current.off("call-ended", handleCallEnded);
    };
  }, [localStream]);

  useEffect(() => {
    const handler = (data) => {
      setAllMassage((prev) => [...prev, data]);

      // Trigger notification when a message is received
      if (Notification.permission === "granted" && data.sender !== currentUser._id) {
        const notification = new Notification("New Message", {
          body: `${userDetail.name}: ${data.text}`,
          icon: userDetail.profilePic || "https://randomuser.me/api/portraits/men/44.jpg",
        });

        // Handle notification click
        notification.onclick = () => {
          window.focus(); // Bring the browser window to focus
        };
      }
    };

    socketRef.current.on("receive-massage", handler);

    return () => {
      socketRef.current.off("receive-massage", handler);
    };
  }, [currentUser._id, userDetail.profilePic]);

  if (currentUser._id === params.userId) {
    console.log("Self-chat detected. Redirecting...");
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="bg-gray-900 text-white p-4 rounded-lg shadow-lg">
          <h2 className="text-3xl font-bold">You cannot chat with yourself</h2>
          <Link to="/card" className="text-blue-400 hover:underline mt-4 inline-block">
            Go back to chat list
          </Link>
        </div>
      </div>
    );
  }

  const formatTimeAndDay = (timestamp) => {
    const dateObj = new Date(timestamp);
    const now = new Date();
    const isToday =
      dateObj.getDate() === now.getDate() &&
      dateObj.getMonth() === now.getMonth() &&
      dateObj.getFullYear() === now.getFullYear();

    const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const day = isToday
      ? "Today"
      : dateObj.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

    return { time, day };
  }

  const handleUploadImageVideoOpen = () => {
    setOpenImageVideoUpload(preve => !preve)
  }

  const handleSendMessage = (e) => {
    e.preventDefault();

    if ((massage.text || massage.imageUrl || massage.videoUrl) && currentUser._id !== params.userId) {
      if (socketRef.current) {
        const messageObj = {
          sender: currentUser?._id,
          receiver: params?.userId,
          text: massage.text,
          imageUrl: massage.imageUrl,
          videoUrl: massage.videoUrl,
          timestamp: new Date().toISOString(),
          status: "sent", // Initial status
        };
        socketRef.current.emit("send-massage", messageObj)
        setAllMassage((prev) => [...prev, messageObj]); // Add message to local state
        setMassage({
          text: "",
          imageUrl: "",
          videoUrl: ""
        })
      }
    }

  }

  const handleUploadImage = async (e) => {
    const file = e.target.files[0]
    setLoading(true)
    const uploadPhoto = await UploadFile(file)
    setLoading(false)
    setOpenImageVideoUpload(false)
    setMassage(preve => {
      return {
        ...preve,
        imageUrl: uploadPhoto.url
      }
    })
  }
  const handleClearUploadImage = () => {
    setMassage(preve => {
      return {
        ...preve,
        imageUrl: ""
      }
    })
  }

  const handleUploadVideo = async (e) => {
    const file = e.target.files[0]
    setLoading(true)
    const uploadPhoto = await UploadFile(file)
    setLoading(false)
    setOpenImageVideoUpload(false)
    setMassage(preve => {
      return {
        ...preve,
        videoUrl: uploadPhoto.url
      }
    })
  }
  const handleClearUploadVideo = () => {
    setMassage(preve => {
      return {
        ...preve,
        videoUrl: ""
      }
    })
  }
  // Update message status when received by the receiver
  useEffect(() => {
    const handler = (data) => {
      setAllMassage((prev) =>
        prev.map((msg) =>
          msg.timestamp === data.timestamp && msg.sender === data.sender
            ? { ...msg, status: "received" } // Update status to 'received'
            : msg
        )
      );
    };
    socketRef.current.on("message-received", handler);
    return () => {
      socketRef.current.off("message-received", handler);
    };
  }, []);

  const handleChange = (e) => {
    setMassage({ ...massage, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (!socketRef.current) return;
    socketRef.current.on("call-rejected", () => {
      // Show a message or modal: "Call was rejected"
      setInCall(false);
      setIsCalling(false);
      setCallConnected(false);
      setCallDuration(0);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
      setRemoteStream(null);
      alert("Call was rejected");
    });
    return () => {
      socketRef.current.off("call-rejected");
    };
  }, [localStream]);

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
      <div className="w-full  h-[100vh] rounded-xl shadow-lg flex flex-col  overflow-hidden"
        style={{
          backgroundImage: `
    linear-gradient(135deg, rgba(135,206,250,0.6) 0%, rgba(240,248,255,0.5) 100%),
    url('https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?auto=format&fit=crop&w=1500&q=80')
  `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >

        {/* IncomingCall */}
        {incomingCall && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white/80 rounded-xl shadow-2xl p-8 flex flex-col items-center">
              <div className="text-2xl font-bold mb-4 text-black">
                Incoming call from {userDetail.name}
              </div>
              <div className="flex items-center gap-8 mb-4">
                <button
                  onClick={handleAcceptCall}
                  className="w-24 h-12 rounded-full bg-green-500 text-white font-bold shadow-lg hover:opacity-90 transition"
                >
                  Accept
                </button>
                <button
                  onClick={handleRejectCall}
                  className="w-24 h-12 rounded-full bg-red-500 text-white font-bold shadow-lg hover:opacity-90 transition"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {isCalling && !callConnected && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white/80 rounded-xl shadow-2xl p-8 flex flex-col items-center">
              <div className="text-2xl font-bold mb-4 text-black">
                Ringing...
              </div>
              <button
                onClick={handleEndCall}
                className="w-24 h-12 rounded-full bg-red-500 text-white font-bold shadow-lg hover:opacity-90 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Call UI */}
        {inCall && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white/80 rounded-xl shadow-2xl p-8 flex flex-col items-center">
              <div className="text-3xl font-bold mb-4 text-black">
                {formatDuration(callDuration)}
              </div>
              <div className="flex items-center gap-8 mb-4">
                <button
                  onClick={handleMuteToggle}
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${isMuted ? "bg-gray-500" : "bg-green-500"
                    } text-white shadow-lg hover:opacity-90 transition`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <FaMicrophoneSlash size={28} /> : <FaMicrophone size={28} />}
                </button>
                <button
                  onClick={handleEndCall}
                  className="w-16 h-16 rounded-full bg-red-500 text-white shadow-lg hover:opacity-90 transition flex items-center justify-center"
                  title="End Call"
                >
                  <FaPhoneSlash size={24} />
                </button>
              </div>
              <audio id="local-audio" autoPlay muted />
              <audio id="remote-audio" autoPlay />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center gap-4">
            <img
              src={userDetail.profilePic}
              alt="Profile"
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h2 className="text-xl font-semibold">{userDetail.name}</h2>
              <p className={`text-xs ${isOnline ? "text-green-500" : "text-gray-400"}`}>
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="ml-auto bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-semibold transition"
            title="Logout"
          >
            Logout
          </button>
          <button
            onClick={handleCallUser}
            className="ml-2 bg-green-500 text-white p-3 rounded-full hover:bg-green-600 transition"
            title="Call"
            disabled={inCall}
          >
            <FaPhone size={19} />
          </button>
        </div>

        <ScrollToBottom className="flex-1 overflow-y-auto p-2 space-y-2">
          {allMassage.map((msg, index) => {
            const isCurrentUser = msg.sender === currentUser._id;
            const { time, day } = formatTimeAndDay(msg.timestamp);

            const showDay =
              index === 0
                ? (
                  <div className="w-full flex justify-center mb-2">
                    <span className="bg-gray-300 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                      {day}
                    </span>
                  </div>
                )
                : null;

            return (
              <React.Fragment key={index}>
                {showDay}
                <div
                  key={index}
                  className={`flex items-end ${isCurrentUser ? "justify-end" : "justify-start"} mb-4 mt-2`}
                >
                  {!isCurrentUser && (
                    <img
                      src={userDetail.profilePic || "https://randomuser.me/api/portraits/women/44.jpg"}
                      className="w-8 h-8 rounded-full mr-3"
                      alt="User"
                    />
                  )}
                  <div>
                    {
                      msg?.imageUrl && (
                        <img
                          src={msg?.imageUrl}
                          className='w-60 h-60 object-fit border rounded-2xl mb-2 '
                        />
                      )
                    }
                    {
                      msg?.videoUrl && (
                        <video
                          src={msg.videoUrl}
                          className='w-60 h-60 object-scale-down  rounded-lg '
                          controls
                        />
                      )
                    }
                    {
                      msg?.text && (
                        <div
                          className={`px-5 py-2 rounded-xl max-w-[70vw]
                      md:max-w-[50vw] text-base md:text-xl ${isCurrentUser
                              ? "bg-gradient-to-t from-purple-500 via-indigo-500 to-blue-500 text-white rounded-br-none"
                              : "bg-gray-200 text-gray-900 rounded-bl-none"
                            }`}
                        >
                          {msg.text}
                        </div>
                      )
                    }
                    <div className="text-xs text-gray-950 mt-1 text-left flex items-center gap-1">
                      {time}
                      {isCurrentUser && (
                        <span
                          className={`mr-2 ${msg.status === "received" ? "text-pink-400" : "text-red-700"}`}
                        >
                          {msg.status === "received" ? "✔✔" : "✔"}
                        </span>
                      )}
                    </div>
                  </div>
                  {isCurrentUser && (
                    <img
                      src={currentUser.profilePic || "https://randomuser.me/api/portraits/men/44.jpg"}
                      className="w-8 h-8 rounded-full ml-2"
                      alt="Me"
                    />
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {/**upload Image display */}
          {
            massage.imageUrl && (
              <div className='w-full h-full sticky bottom-0 bg-slate-700 bg-opacity-30 flex justify-center items-center rounded overflow-hidden'>
                <div className='w-fit p-2 absolute top-0 right-0 cursor-pointer hover:text-red-600' onClick={handleClearUploadImage}>
                  <IoClose size={30} />
                </div>
                <div className='bg-white p-3'>
                  <img
                    src={massage.imageUrl}
                    alt='uploadImage'
                    className='aspect-square w-full h-full max-w-sm m-2 object-scale-down'
                  />
                </div>
              </div>
            )
          }

          {/**upload video display */}
          {
            massage.videoUrl && (
              <div className='w-full h-full sticky bottom-0 bg-slate-700 bg-opacity-30 flex justify-center items-center rounded overflow-hidden'>
                <div className='w-fit p-2 absolute top-0 right-0 cursor-pointer hover:text-red-600' onClick={handleClearUploadVideo}>
                  <IoClose size={30} />
                </div>
                <div className='bg-white p-3'>
                  <video
                    src={massage.videoUrl}
                    className='aspect-square w-full h-full max-w-sm m-2 object-scale-down'
                    controls
                    muted
                    autoPlay
                  />
                </div>
              </div>
            )
          }
        </ScrollToBottom>
        <section className='h-16 bg-white flex items-center px-4'>
          <div className='relative '>
            <button onClick={handleUploadImageVideoOpen} className='flex justify-center items-center w-11 h-11 rounded-full hover:bg-primary hover:text-pink-400'>
              <FaPlus size={20} />
            </button>

            {/**video and image */}
            {
              openImageVideoUpload && (
                <div className='bg-white shadow rounded absolute bottom-14 w-36 p-2'>
                  <form>
                    <label htmlFor='uploadImage' className='flex items-center p-2 px-3 gap-3 hover:bg-white-500 cursor-pointer'>
                      <div className='text-primary'>
                        <FaImage size={18} />
                      </div>
                      <p>Image</p>
                    </label>
                    <input
                      type='file'
                      id='uploadImage'
                      onChange={handleUploadImage}
                      className='hidden'
                    />
                  </form>
                </div>
              )
            }

          </div>

          {/**input box */}
          <form className='h-full w-full flex gap-2' onSubmit={handleSendMessage}>
            <input
              type='text'
              placeholder='Type here message...'
              className='py-1 px-4 outline-none w-full h-full'
              value={massage.text}
              name="text"
              onChange={handleChange}
            />
            <button className='text-primary hover:text-secondary'>
              <IoMdSend size={28} />
            </button>
          </form>

        </section>

      </div>
    </div>
  );
};

export default MassagePage;
