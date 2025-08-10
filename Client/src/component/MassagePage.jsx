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

  useEffect(() => {
    const backendUrl = BACKEND_URL;
    socketRef.current = io(backendUrl, {
      auth: {
        token: localStorage.getItem('token')
      },
    });
  }, [BACKEND_URL]);

  useEffect(() => {
    if (!currentUser.username) return;
    const fetchICE = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/credential?identity=${currentUser.username}`);
        setIceServers(response.data.iceServers);
      }
      catch (error) {
        console.error("Error fetching ICE servers:", error);
      }
    };
    fetchICE();
  }, [currentUser.username]);

  const createPeerConnection = () => {
    if (peerConnectionRef.current) return peerConnectionRef.current; // reuse
    if (!iceServers.length) {
      console.warn("ICE servers not ready");
      return null;
    }
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
      console.log("[RTC] Remote track:", event.track.id, event.track.kind);
      setRemoteStream(prev => {
        const inbound = prev || new MediaStream();
        // Avoid duplicate same id
        if (!inbound.getTracks().find(t => t.id === event.track.id)) {
          inbound.addTrack(event.track);
        }
        // Attempt immediate attachment (in case audio element already exists)
        const remoteEl = document.getElementById("remote-audio");
        if (remoteEl && remoteEl.srcObject !== inbound) {
          remoteEl.srcObject = inbound;
          remoteEl.play().catch(() => { });
        }
        return inbound;
      });
    };

    peerConnectionRef.current.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(peerConnectionRef.current.connectionState)) {
        console.log("Connection state:", peerConnectionRef.current.connectionState);
      }
    };
    return peerConnectionRef.current;
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
    if (!socketRef.current) return;
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

  const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Re-attach streams when they or UI state change (fix race where element mounts after track)
  useEffect(() => {
    if (remoteStream && inCall) {
      const remoteEl = document.getElementById("remote-audio");
      if (remoteEl && remoteEl.srcObject !== remoteStream) {
        remoteEl.srcObject = remoteStream;
        remoteEl.play().catch(() => { });
        console.log("[RTC] Remote stream re-attached after UI mount");
      }
    }
  }, [remoteStream, inCall]);

  useEffect(() => {
    if (localStream) {
      const localEl = document.getElementById("local-audio");
      if (localEl && localEl.srcObject !== localStream) {
        localEl.srcObject = localStream;
        console.log("[RTC] Local stream attached/re-attached");
      }
    }
  }, [localStream]);

  // Outgoing call
  const handleCallUser = async () => {
    if (!iceServers.length) {
      alert("ICE servers not ready. Please wait and try again.");
      return;
    }
    setIsCalling(true);

    const pc = createPeerConnection();
    if (!pc) return;

    // Add transceiver to ensure receiving even if remote adds later (mobile compat)
    if (!pc.getTransceivers().find(t => t.receiver.track && t.receiver.track.kind === "audio")) {
      pc.addTransceiver("audio", { direction: "sendrecv" });
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    setLocalStream(stream);
    stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current.emit("call-user", {
      receiverId: userDetail._id,
      offer,
    });
    console.log("[Signaling] Sent offer");
  };

  const pendingCandidatesRef = useRef([]);
  useEffect(() => { pendingCandidatesRef.current = pendingCandidates; }, [pendingCandidates]);

  const setRemoteDescriptionAndAddCandidates = async (desc) => {
    if (!peerConnectionRef.current) return;
    await peerConnectionRef.current.setRemoteDescription(desc);
    for (const c of pendingCandidates) {
      try {
        await peerConnectionRef.current.addIceCandidate(c);
      } catch (err) {
        console.warn("Add buffered candidate failed", err);
      }
    }
    setPendingCandidates([]);
  };

  // Accept call
  const handleAcceptCall = async () => {
    if (!iceServers.length) {
      alert("ICE servers not ready.");
      return;
    }
    setInCall(true);
    setIncomingCall(null);
    const pc = createPeerConnection();
    if (!pc) return;

    if (!pc.getTransceivers().find(t => t.receiver.track && t.receiver.track.kind === "audio")) {
      pc.addTransceiver("audio", { direction: "sendrecv" });
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    setLocalStream(stream);
    stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));

    await setRemoteDescriptionAndAddCandidates(incomingCall.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
  // Receiver side: we now know both offer (remote) and answer (local)
  // so mark call as connected immediately (previous effect wasn't reliable)
  setCallConnected(true);
  setIsCalling(false);

    socketRef.current.emit("answer-call", {
      senderId: incomingCall.senderId,
      answer,
    });
    console.log("[Signaling] Sent answer");
  };

  // CallReject

  const handleRejectCall = () => {
    if (!incomingCall) return;
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

  // Central cleanup
  const cleanupCallState = () => {
    setIsCalling(false);
    setInCall(false);
    setCallConnected(false);
    setCallDuration(0);
    setIncomingCall(null);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
  };
  // Central cleanup

  // End call
  const handleEndCall = () => {
    socketRef.current.emit("end-call", { receiverId: userDetail._id });
    cleanupCallState();
  };

  // Signaling listeners
  useEffect(() => {
    if (!socketRef.current) return;

    const onIncoming = ({ senderId, offer }) => {
      console.log("Incoming call from", senderId);
      setIncomingCall({ senderId, offer });
      setIsCalling(false);
    };

    const onAnswered = async ({ answer }) => {
      console.log("Call answered");
      await setRemoteDescriptionAndAddCandidates(answer);
  // Caller side: we now have remote answer => call is connected
  setCallConnected(true);
  setInCall(true);
  setIsCalling(false);
    };

    const onRejected = () => {
      alert("Call rejected");
      cleanupCallState();
    };

    const onEnded = () => {
      console.log("Call ended remotely");
      cleanupCallState();
    };
    const onCandidate = ({ candidate }) => {
      if (!peerConnectionRef.current || !candidate) return;
      if (
        peerConnectionRef.current.remoteDescription &&
        peerConnectionRef.current.remoteDescription.type
      ) {
        peerConnectionRef.current.addIceCandidate(candidate)
          .catch(err => console.warn("Add candidate error", err));
      } else {
        setPendingCandidates(prev => [...prev, candidate]);
      }
    };
    socketRef.current.on("ice-candidate", onCandidate);
    socketRef.current.on("incoming-call", onIncoming);
    socketRef.current.on("call-answered", onAnswered);
    socketRef.current.on("call-rejected", onRejected);
    socketRef.current.on("call-ended", onEnded);

    return () => {
      socketRef.current.off("incoming-call", onIncoming);
      socketRef.current.off("call-answered", onAnswered);
      socketRef.current.off("call-rejected", onRejected);
      socketRef.current.off("call-ended", onEnded);
      socketRef.current.off("ice-candidate", onCandidate);
    };
  }, [userDetail._id, iceServers, localStream, pendingCandidates]);

  // Removed effect that tried to infer connection from RTCPeerConnection descriptions;
  // we now set callConnected/inCall explicitly in signaling handlers for reliability.

  // Timer (start only when both inCall and callConnected true)
  useEffect(() => {
    if (!(inCall && callConnected)) return;
    const id = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(id);
  }, [inCall, callConnected]);

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
          timestamp: new Date().toISOString(),
          status: "sent", // Initial status
        };
        socketRef.current.emit("send-massage", messageObj)
        setAllMassage((prev) => [...prev, messageObj]); // Add message to local state
        setMassage({
          text: "",
          imageUrl: "",
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
              <audio id="local-audio" autoPlay muted playsInline style={{ display: "none" }} />
              <audio id="remote-audio" autoPlay playsInline style={{ display: "none" }} />
            </div>
          </div>
        )}

        {/* Self chatting UI */}

        {(() => {
          if (currentUser._id === params.userId) {
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
        })()}

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
            disabled={inCall || isCalling || iceServers.length === 0}
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
                    <div className="text-xs text-gray-950 mt-1 text-right flex items-center gap-1">
                      {time}
                      {isCurrentUser && (
                        <span
                          className={`mr-2 ${msg.status === "received" ? "text-pink-400" : "text-red-900"}`}
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
