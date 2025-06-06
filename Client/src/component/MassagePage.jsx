import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { Link, useParams } from 'react-router-dom'
import ScrollToBottom from 'react-scroll-to-bottom';


const MassagePage = () => {
  const [userDetail, setUserDetail] = useState({
    _id: "",
    name: "",
    username: "",
    profile_pic: "",
  })
  const [isOnline, setIsOnline] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    _id: "",
    name: "",
    username: "",
    profile_pic: "",
  })
  const [massage, setMassage] = useState({
    text: ""
  })
  const [allMassage, setAllMassage] = useState([]);
  const params = useParams()
  const socketRef = useRef();
  useEffect(() => {
    socketRef.current = io("http://localhost:5000", {
      auth: {
        token: localStorage.getItem('token')
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
    };
    socketRef.current.on('receive-massage', handler);
    return () => {
      socketRef.current.off('receive-massage', handler);
    };
  }, [])

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (massage.text) {
      if (socketRef.current) {
        const messageObj = {
          sender: currentUser?._id,
          receiver: params?.userId,
          text: massage.text,
        };
        socketRef.current.emit("send-massage", messageObj)
        console.log("massage send")
        setMassage({
          text: ""
        })
      }
    }

  }

  const handleChange = (e) => {
    setMassage({ ...massage, [e.target.name]: e.target.value });
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-4xl h-[90vh] bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center gap-4">
            <img
              src={userDetail.profile_pic || "https://randomuser.me/api/portraits/women/44.jpg"}
              alt="Profile"
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h2 className="text-3xl font-semibold">{userDetail.name}</h2>
              <p className={`text-xs ${isOnline ? "text-green-500" : "text-gray-400"}`}>
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </div>
       
          <ScrollToBottom className="flex-1 overflow-y-auto p-2 space-y-2">
            {allMassage.map((msg, index) => {
              const isCurrentUser = msg.sender === currentUser._id;
              return (
                <div
                  key={index}
                  className={`flex items-end ${isCurrentUser ? "justify-end" : "justify-start"}`}
                 >
                  {!isCurrentUser && (
                    <img
                      src={userDetail.profile_pic || "https://randomuser.me/api/portraits/women/44.jpg"}
                      className="w-8 h-8 rounded-full mr-3"
                      alt="User"
                    />
                  )}
                  <div
                    className={`px-5 py-2 rounded-xl max-w-xs text-2xl ${isCurrentUser
                      ? "bg-green-500 text-gray-900 rounded-br-none"
                      : "bg-gray-200 text-gray-900 rounded-bl-none"
                      }`}
                  >
                    {msg.text}
                  </div>
                  {isCurrentUser && (
                    <img
                      src={currentUser.profile_pic || "https://randomuser.me/api/portraits/men/44.jpg"}
                      className="w-8 h-8 rounded-full ml-2"
                      alt="Me"
                    />
                  )}
                </div>
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
            className="flex-1 p-3 rounded-full border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button className="bg-purple-600 text-white p-3 rounded-full text-lg">
            ➤
          </button>
        </form>
      </div>
    </div>
  );
};

export default MassagePage;