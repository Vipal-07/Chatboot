import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { Link, useParams, useNavigate } from 'react-router-dom'
import ScrollToBottom from 'react-scroll-to-bottom';


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
    text: ""
  })
  const [allMassage, setAllMassage] = useState([]);
  const params = useParams()
  const socketRef = useRef();
  const navigate = useNavigate();

  // Function to handle logout
  const handleLogout = async () => {
    try {
      const URL = "https://chatboot-05p9.onrender.com";
      await fetch(`${URL}/logout`, {
        method: "POST",
        credentials: "include", // Ensure cookies are included in the request
      });
      navigate("/weather"); // Navigate to the weather page after logout
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Function to get a cookie by name
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
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
    const backendUrl = "https://chatboot-05p9.onrender.com";
    const token = getCookie('token'); // Retrieve token from cookie
    socketRef.current = io(backendUrl, {
      // auth: {
      //   token: localStorage.getItem('token')
      // },
      auth: {
        token, // Send token to the server
      },
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
          <h2 className="text-2xl font-bold">You cannot chat with yourself</h2>
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

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (massage.text && currentUser._id !== params.userId && massage.text.trim() !== "") {
      if (socketRef.current) {
        const messageObj = {
          sender: currentUser?._id,
          receiver: params?.userId,
          text: massage.text,
          timestamp: new Date().toISOString(),
          status: "sent", // Initial status
        };
        socketRef.current.emit("send-massage", messageObj)
        setAllMassage((prev) => [...prev, messageObj]); // Add message to local state
        setMassage({
          text: ""
        })
      }
    }

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
                    <div
                      className={`px-5 py-2 rounded-xl max-w-[70vw]
                      md:max-w-[50vw] text-base md:text-xl ${isCurrentUser
                          ? "bg-gradient-to-t from-purple-500 via-indigo-500 to-blue-500 text-white rounded-br-none"
                          : "bg-gray-200 text-gray-900 rounded-bl-none"
                        }`}
                    >
                      {msg.text}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 text-left flex items-center gap-1">
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
        </ScrollToBottom>
        <form className="p-4 border-t bg-gray-50 flex items-center space-x-3" onSubmit={handleSendMessage}>
          <input
            type="text"
            onChange={handleChange}
            value={massage.text}
            name="text"
            placeholder="Type something..."
            className="flex-1 p-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black-100 text-xl"
          />
          <button className="bg-red-400 text-white px-4 py-3 rounded-full text-lg font-semibold hover:bg-red-500 transition-colors duration-300">
            ➤
          </button>
        </form>
      </div>
    </div>
  );
};

export default MassagePage;
