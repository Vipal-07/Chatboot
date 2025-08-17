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
import UploadFile from '../helper/UploadFile'; // Assuming UploadImage is in the same directory
import { showChatNotification, ensureNotificationPermission } from "../helper/notify";

const MassagePage = () => {
  const [userDetail, setUserDetail] = useState({
    _id: "",
    name: "",
    username: "",
    profilePic: "",
  });
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetailError, setUserDetailError] = useState("");
  const userDetailLoadedRef = useRef(false); // track if we have loaded once
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
  const [iceFetchedAt, setIceFetchedAt] = useState(0); // epoch ms
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
  const statsIntervalRef = useRef(null);
  const lastAudioStatsRef = useRef({ ts: 0, bytesRecv: 0, bytesSent: 0 });
  const params = useParams()
  const socketRef = useRef();
  const navigate = useNavigate();

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const backendUrl = BACKEND_URL;
    socketRef.current = io(backendUrl, { withCredentials: true });
  }, [BACKEND_URL]);

  // Fetch ICE servers (Twilio) with fallback STUN and simple expiry (55 mins)
  const fetchIceServers = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/credential?identity=${currentUser.username}`);
      const list = response.data?.iceServers || [];
      if (list.length) {
        setIceServers(list);
        setIceFetchedAt(Date.now());
        return list;
      }
      throw new Error("Empty ICE server list");
    } catch (err) {
      console.warn("[ICE] Primary fetch failed, using fallback STUN only", err.message);
      const fallback = [{ urls: 'stun:stun.l.google.com:19302' }];
      setIceServers(fallback);
      setIceFetchedAt(Date.now());
      return fallback;
    }
  };

  const ensureFreshIceServers = async () => {
    const TWILIO_TTL_MS = 55 * 60 * 1000; // refresh before typical 1h expiry
    if (!iceServers.length || (Date.now() - iceFetchedAt) > TWILIO_TTL_MS) {
      return await fetchIceServers();
    }
    return iceServers;
  };

  useEffect(() => {
    if (!currentUser.username) return;
    ensureFreshIceServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.username]);

  useEffect(() => {
    ensureNotificationPermission();
  }, []);

  const createPeerConnection = () => {
    // /////
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
    // Track handler for remote audio (avoid duplicate adds)
    peerConnectionRef.current.ontrack = (event) => {
      console.log("[RTC] Remote track received kind=", event.track.kind, "id=", event.track.id);
      setRemoteStream(prev => {
        const inbound = prev || new MediaStream();
        const exists = inbound.getTracks().some(t => t.id === event.track.id);
        if (!exists) inbound.addTrack(event.track);
        const remoteEl = document.getElementById("remote-audio");
        if (remoteEl && remoteEl.srcObject !== inbound) {
          remoteEl.srcObject = inbound;
          remoteEl.play().catch(err => console.warn('[RTC] Auto-play failed', err));
        }
        return inbound;
      });
    };
    // ICE connection diagnostics & auto-recovery attempt
    peerConnectionRef.current.oniceconnectionstatechange = () => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      const s = pc.iceConnectionState;
      console.log('[RTC] iceConnectionState=', s);
      if (s === 'connected') setCallConnected(true);
      if (s === 'failed') {
        if (pc.restartIce) {
          try {
            console.log('[RTC] Attempting ICE restart');
            pc.restartIce();
          } catch (e) {
            console.warn('[RTC] restartIce failed', e);
          }
        }
      }
      if (['failed', 'disconnected'].includes(s)) {
        // Schedule TURN-only fallback if not already attempted
        if (!relayFallbackAttemptedRef.current) {
          relayFallbackAttemptedRef.current = true;
          setTimeout(() => attemptRelayFallback(), 1200);
        }
      }
    };
    peerConnectionRef.current.onconnectionstatechange = () => {
      const state = peerConnectionRef.current.connectionState;
      console.log("[RTC] Connection state:", state);
      if (state === "connected") {
        setCallConnected(true); // Fallback in case we missed manual set
      }
      if (["failed", "disconnected", "closed"].includes(state)) {
        // Keep duration but flag disconnected
        if (state !== "closed") {
          console.warn("[RTC] Connection problem state=", state);
        }
      }
    };
    return peerConnectionRef.current; // <== IMPORTANT: return the created peer connection
  }

  // Function to handle logout
  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      navigate('/login');
    }
  };

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const handleReceiver = (data) => {
      if (data && data._id) {
        userDetailLoadedRef.current = true;
      }
      setUserDetail(data || { _id: "", name: "", username: "", profilePic: "" });
      setUserDetailLoading(false);
    };
    const handleCurrentUser = (data) => {
      setCurrentUser(data || { _id: "", name: "", username: "", profilePic: "" });
    };
    const handleOnlineStatus = (data) => {
      if (data.userId === params.userId) setIsOnline(data.isOnline);
    };
    const requestDetails = () => {
      if (!params.userId) return;
      setUserDetailLoading(true);
      setUserDetailError("");
      try {
        console.debug('[Socket] requesting user detail for', params.userId);
        s.emit('get-user-details', params.userId);
        s.emit('check-user-online', params.userId);
        // Schedule REST fallback if socket hasn't provided userDetail in 1200ms
        setTimeout(async () => {
          if (userDetailLoadedRef.current) return; // already got via socket
          try {
            console.debug('[REST Fallback] fetching user detail for', params.userId);
            const resp = await axios.get(`${BACKEND_URL}/user/${params.userId}`, { withCredentials: true });
            if (resp.data?.success) {
              userDetailLoadedRef.current = true;
              setUserDetail(resp.data.data);
            } else {
              setUserDetailError('User not found');
            }
          } catch (e) {
            setUserDetailError('Failed to load user');
          } finally {
            setUserDetailLoading(false);
          }
        }, 1200);
      } catch (e) {
        setUserDetailLoading(false);
        setUserDetailError('Failed requesting user details');
      }
    };

    s.on('receiver-user', handleReceiver);
    s.on('currentUser-details', handleCurrentUser);
    s.on('user-online-status', handleOnlineStatus);

    if (s.connected) requestDetails();
    else s.once('connect', requestDetails);

    return () => {
      s.off('receiver-user', handleReceiver);
      s.off('currentUser-details', handleCurrentUser);
      s.off('user-online-status', handleOnlineStatus);
    };
  }, [params.userId, BACKEND_URL]);


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

  // Ringtone audio ref
  const ringtoneRef = useRef(null);
  // Track if ringtone is playing
  const [ringtonePlaying, setRingtonePlaying] = useState(false);

  // Detect if device is muted (heuristic)
  const isDeviceMuted = () => {
    // No reliable browser API for mute, so use a manual toggle or rely on user
    // Optionally, check for reduced motion preference
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  // Play ringtone (if not muted)
  const playRingtone = () => {
    if (isDeviceMuted()) return;
    if (ringtoneRef.current) {
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current.play();
      setRingtonePlaying(true);
    }
    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  };

  // Stop ringtone
  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      setRingtonePlaying(false);
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  };

  // Outgoing call
  const handleCallUser = async () => {
    playRingtone(); // Play ringtone on outgoing call
    await ensureFreshIceServers();
    if (!iceServers.length) {
      alert("ICE servers not ready. Please wait and try again.");
      return;
    }
    if (!userDetail._id) {
      alert("Receiver not loaded yet. Try again in a moment.");
      return;
    }
    try {
      setIsCalling(true);
      const pc = createPeerConnection();
      if (!pc) return;
      if (!pc.getTransceivers().find(t => t.receiver.track && t.receiver.track.kind === "audio")) {
        pc.addTransceiver("audio", { direction: "sendrecv" });
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      setLocalStream(stream);
      stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      socketRef.current.emit("call-user", { receiverId: userDetail._id, offer });
      console.log("[Signaling] Sent offer to", userDetail._id, 'using', iceServers.length, 'ICE servers');
    } catch (err) {
      console.error("[Call] Failed to start call:", err);
      setIsCalling(false);
      cleanupCallState();
      alert("Failed to start call: " + err.message);
    }
  };


  const pendingCandidatesRef = useRef([]);
  const relayFallbackAttemptedRef = useRef(false);
  const usingRelayRef = useRef(false);
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

  const handleAcceptCall = async () => {
    stopRingtone(); // Stop ringtone when call is accepted
    if (!incomingCall) return;
    await ensureFreshIceServers();
    if (!iceServers.length) { alert("ICE servers not ready."); return; }
    setIncomingCall(null);
    const pc = createPeerConnection();
    if (!pc) return;

    // MUST set remote description (offer) before adding local tracks on some browsers (one-way audio fix)
    await setRemoteDescriptionAndAddCandidates(incomingCall.offer);

    if (!pc.getTransceivers().find(t => t.receiver.track && t.receiver.track.kind === "audio")) {
      pc.addTransceiver("audio", { direction: "sendrecv" });
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    setLocalStream(stream);
    // Ensure we only add one outgoing audio track (replace if already present)
    const audioTrack = stream.getAudioTracks()[0];
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
    if (sender) {
      try { await sender.replaceTrack(audioTrack); } catch { }
    } else {
      pc.addTrack(audioTrack, stream);
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    setInCall(true);
    setCallConnected(true);
    setIsCalling(false);

    socketRef.current.emit("answer-call", { senderId: incomingCall.senderId, answer });
    console.log("[Signaling] Sent answer with local audio track id=", audioTrack?.id);
  };

  // TURN-only (relay) fallback renegotiation
  const attemptRelayFallback = async () => {
    if (!peerConnectionRef.current || usingRelayRef.current) return;
    console.log('[RTC] Initiating relay-only fallback');
    try {
      const relayIce = iceServers.filter(s => /turn:/i.test((s.urls || '').toString()));
      if (!relayIce.length) { console.warn('[RTC] No TURN servers available for fallback'); return; }
      usingRelayRef.current = true;
      // Create new PC with relay policy
      const oldPc = peerConnectionRef.current;
      const streams = localStream ? [localStream] : [];
      const newPc = new RTCPeerConnection({
        iceServers: relayIce,
        iceTransportPolicy: 'relay'
      });
      peerConnectionRef.current = newPc;
      newPc.ontrack = oldPc.ontrack;
      newPc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current.emit('ice-candidate', { receiverId: userDetail._id, candidate: e.candidate });
        }
      };
      newPc.oniceconnectionstatechange = () => {
        console.log('[RTC][Relay] iceConnectionState=', newPc.iceConnectionState);
      };
      if (streams.length) {
        streams.forEach(stream => {
          const track = stream.getAudioTracks()[0];
          if (track) newPc.addTrack(track, stream);
        });
      }
      // Offer for upgrade path
      const offer = await newPc.createOffer({ offerToReceiveAudio: true });
      await newPc.setLocalDescription(offer);
      socketRef.current.emit('relay-upgrade-offer', { receiverId: userDetail._id, offer });
      console.log('[RTC] Sent relay-upgrade-offer');
      oldPc.close();
    } catch (e) {
      console.warn('[RTC] Relay fallback failed', e);
    }
  };

  // CallReject

  const handleRejectCall = () => {
    stopRingtone(); // Stop ringtone when call is rejected
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
      try { peerConnectionRef.current.ontrack = null; } catch { }
      try { peerConnectionRef.current.onicecandidate = null; } catch { }
      try { peerConnectionRef.current.oniceconnectionstatechange = null; } catch { }
      try { peerConnectionRef.current.onconnectionstatechange = null; } catch { }
      try { peerConnectionRef.current.close(); } catch { }
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
    stopRingtone(); // Stop ringtone when call ends
    socketRef.current.emit("end-call", { receiverId: userDetail._id });
    cleanupCallState();
  };

  // Signaling listeners
  useEffect(() => {
    if (!socketRef.current) return;

    const onIncoming = ({ senderId, offer }) => {
      console.log("Incoming call from", senderId);
      playRingtone(); // Play ringtone on incoming call
      setIncomingCall({ senderId, offer });
      setIsCalling(false);
    };

    const onAnswered = async ({ answer }) => {
      console.log("Call answered");
      await setRemoteDescriptionAndAddCandidates(answer);
      setInCall(true);
      setIsCalling(false);
      stopRingtone()
      setCallConnected(true); // Caller side: mark connection established so timer starts
    };

    const onRejected = () => {
      stopRingtone()
      alert("Call rejected");
      cleanupCallState();
    };

    const onEnded = () => {
      stopRingtone()
      console.log("Call ended remotely");
      cleanupCallState();
    };

    const onCandidate = ({ candidate }) => {
      if (!peerConnectionRef.current || !candidate) return;
      if (peerConnectionRef.current.remoteDescription) {
        try {
          peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Add ICE candidate failed', e);
        }
      } else {
        setPendingCandidates(prev => [...prev, candidate]);
      }
    };

    // Relay fallback signaling
    const onRelayOffer = async ({ offer, senderId }) => {
      console.log('[RTC] Received relay-upgrade-offer');
      const relayIce = iceServers.filter(s => /turn:/i.test((s.urls || '').toString()));
      if (!relayIce.length) { console.warn('[RTC] No TURN servers to answer relay offer'); return; }
      // Build new PC forced relay
      if (peerConnectionRef.current) {
        try { peerConnectionRef.current.close(); } catch {/*noop*/ }
      }
      const pc = new RTCPeerConnection({ iceServers: relayIce, iceTransportPolicy: 'relay' });
      peerConnectionRef.current = pc;
      usingRelayRef.current = true;
      pc.ontrack = createPeerConnection().ontrack; // reuse logic
      pc.onicecandidate = (e) => { if (e.candidate) socketRef.current.emit('ice-candidate', { receiverId: senderId, candidate: e.candidate }); };
      if (localStream) {
        const t = localStream.getAudioTracks()[0];
        if (t) pc.addTrack(t, localStream);
      }
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('relay-upgrade-answer', { senderId, answer });
      console.log('[RTC] Sent relay-upgrade-answer');
    };
    const onRelayAnswer = async ({ answer }) => {
      if (!peerConnectionRef.current) return;
      console.log('[RTC] Received relay-upgrade-answer');
      await peerConnectionRef.current.setRemoteDescription(answer);
    };

    socketRef.current.on("incoming-call", onIncoming);
    socketRef.current.on("call-answered", onAnswered);
    socketRef.current.on("call-rejected", onRejected);
    socketRef.current.on("call-ended", onEnded);
    socketRef.current.on("ice-candidate", onCandidate);
    socketRef.current.on('relay-upgrade-offer', onRelayOffer);
    socketRef.current.on('relay-upgrade-answer', onRelayAnswer);

    return () => {
      socketRef.current.off("incoming-call", onIncoming);
      socketRef.current.off("call-answered", onAnswered);
      socketRef.current.off("call-rejected", onRejected);
      socketRef.current.off("call-ended", onEnded);
      socketRef.current.off("ice-candidate", onCandidate);
      socketRef.current.off('relay-upgrade-offer', onRelayOffer);
      socketRef.current.off('relay-upgrade-answer', onRelayAnswer);
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

  // Periodic WebRTC stats to detect stalled audio (mobile/carrier NAT) and trigger relay fallback
  useEffect(() => {
    if (!(inCall && callConnected)) {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      return;
    }
    statsIntervalRef.current = setInterval(async () => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        let inboundAudio = null;
        let outboundAudio = null;
        stats.forEach(r => {
          if (!inboundAudio && r.kind === 'audio' && r.type === 'inbound-rtp' && !r.isRemote) inboundAudio = r;
          if (!outboundAudio && r.kind === 'audio' && r.type === 'outbound-rtp' && !r.isRemote) outboundAudio = r;
        });
        const now = Date.now();
        if (inboundAudio) {
          const stalledRecv = (inboundAudio.bytesReceived || 0) === lastAudioStatsRef.current.bytesRecv;
          // 9+ seconds stalled
          if (stalledRecv && now - lastAudioStatsRef.current.ts > 9000 && !relayFallbackAttemptedRef.current) {
            console.warn('[RTC][Monitor] Inbound audio stalled, attempting relay fallback');
            attemptRelayFallback();
          }
          lastAudioStatsRef.current.bytesRecv = inboundAudio.bytesReceived || 0;
        }
        if (outboundAudio) {
          lastAudioStatsRef.current.bytesSent = outboundAudio.bytesSent || 0;
        }
        lastAudioStatsRef.current.ts = now;
      } catch (e) {
        // ignore
      }
    }, 3000);
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    }
  }, [inCall, callConnected]);

  // Network change handlers to attempt ICE restart quickly on mobile switches
  useEffect(() => {
    const handleOnline = () => {
      const pc = peerConnectionRef.current;
      if (pc && inCall) {
        console.log('[RTC] Network online event -> restartIce');
        try { pc.restartIce && pc.restartIce(); } catch { }
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [inCall]);

  useEffect(() => {
    const handler = (data) => {
      setAllMassage((prev) => [...prev, data]);
      if (data.sender !== currentUser._id) {
        showChatNotification({
          title: userDetail.name || 'New Message',
          body: data.text || 'Image'
        });
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



  // Outgoing call





  // TURN-only (relay) fallback renegotiation

  // CallReject

  // Mute/unmute


  // Central cleanup
  // Central cleanup

  // End call

  // Removed effect that tried to infer connection from RTCPeerConnection descriptions;
  // we now set callConnected/inCall explicitly in signaling handlers for reliability.

  // Timer (start only when both inCall and callConnected true)

  // Periodic WebRTC stats to detect stalled audio (mobile/carrier NAT) and trigger relay fallback


  // Network change handlers to attempt ICE restart quickly on mobile switches



  // Update message status when received by the receiver

  return (
    <>
      <audio ref={ringtoneRef} src="/flute.mp3" loop preload="auto" style={{ display: 'none' }} />
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


          {/* Call UI with some design */}
          {inCall && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200">
              <div className="bg-white/80 rounded-3xl shadow-2xl p-10 flex flex-col items-center border-4 border-pink-300">
                {/* Animated hearts background */}
                <div className="absolute inset-0 pointer-events-none z-0">
                  <div className="absolute animate-pulse left-10 top-10 text-pink-400 text-6xl opacity-40">💖</div>
                  <div className="absolute animate-bounce right-16 top-24 text-red-400 text-5xl opacity-30">💘</div>
                  <div className="absolute animate-pulse left-1/2 bottom-10 text-pink-300 text-7xl opacity-30">💞</div>
                  <div className="absolute animate-bounce right-1/4 bottom-20 text-purple-400 text-6xl opacity-30">💝</div>
                </div>
                {/* User avatars and call info */}
                <div className="relative z-10 flex flex-col items-center mb-6">
                  <img
                    src="https://thumbs.dreamstime.com/b/head-silhouette-face-front-view-human-elegant-part-human-vector-illustration-79409597.jpg"
                    alt="User"
                    className="w-24 h-24 rounded-full border-4 border-pink-400 shadow-lg mb-2"
                  />
                  <div className="text-2xl font-bold text-pink-600 mb-1">Talking with Anonymous</div>
                  <div className="text-lg text-purple-500 mb-2">Connected 💑</div>
                  <div className="text-4xl font-bold text-pink-500 mb-2 tracking-wide drop-shadow-lg">
                    {formatDuration(callDuration)}
                  </div>
                </div>
                {/* Call controls */}
                <div className="relative z-10 flex items-center gap-10 mb-2">
                  <button
                    onClick={handleMuteToggle}
                    className={`w-16 h-16 rounded-full flex items-center justify-center ${isMuted ? "bg-gray-400" : "bg-pink-400"} text-white shadow-xl hover:scale-105 transition-transform duration-200`}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <FaMicrophoneSlash size={32} /> : <FaMicrophone size={32} />}
                  </button>
                  <button
                    onClick={handleEndCall}
                    className="w-16 h-16 rounded-full bg-red-500 text-white shadow-xl hover:scale-105 transition-transform duration-200 flex items-center justify-center border-4 border-pink-300"
                    title="End Call"
                  >
                    <FaPhoneSlash size={32} />
                  </button>
                </div>
                {/* Animated text for romantic effect */}
                <div className="relative z-10 mt-4 text-xl text-pink-400 font-semibold animate-pulse">
                  "Love is in the air... Enjoy your call!"
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
            <div className="flex items-center gap-4 min-w-0">
              {userDetailLoading ? (
                <div className="w-10 h-10 rounded-full bg-gray-300 animate-pulse" />
              ) : (
                <img
                  src={userDetail.profilePic || 'https://via.placeholder.com/80x80.png?text=User'}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div className="truncate">
                {userDetailLoading ? (
                  <div className="h-4 w-24 bg-gray-300 rounded animate-pulse mb-1" />
                ) : userDetailError ? (
                  <div className="text-red-600 text-sm">{userDetailError}</div>
                ) : (
                  <h2 className="text-xl font-semibold truncate" title={userDetail.name}>{userDetail.name || 'Unknown User'}</h2>
                )}
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
    </>
  );
}

export default MassagePage;
