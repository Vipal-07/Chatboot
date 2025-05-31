import React from "react";
import { useEffect, useState } from "react";

// const [massage, setMessage] = useState({
//   text: "",
// });
// const [datauser, setDataUser] = useState({
//   name: "",
//   username: "",
//   profile_pic: "",
//   _id: ""
// });

const MassagePage = () => {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-4xl h-[90vh] bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center gap-4">
            <img
              src="https://randomuser.me/api/portraits/women/44.jpg"
              alt="Profile"
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h2 className="text-base font-semibold">Blair Dota</h2>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>
          <button className="text-gray-400 text-2xl">🔍</button>
        </div>

        {/* Messages */}
        <div className="flex-1 px-6 py-4 space-y-6 overflow-y-auto bg-white">
          {/* Received Message */}
          <div className="flex items-start space-x-3">
            <img
              src="https://randomuser.me/api/portraits/women/44.jpg"
              className="w-8 h-8 rounded-full"
              alt="User"
            />
            <div className="bg-gray-200 p-3 rounded-xl max-w-md text-sm">
              Hi Cassie! Would you be available for a coffee next week? ☕
            </div>
          </div>

          {/* Sent Message */}
          <div className="flex justify-end">
            <div className="bg-purple-600 text-white p-3 rounded-xl max-w-md text-sm">
              Hi Ashley! Yes with pleasure! Do you prefer when?
            </div>
          </div>

          {/* Received Message */}
          <div className="flex items-start space-x-3">
            <img
              src="https://randomuser.me/api/portraits/women/44.jpg"
              className="w-8 h-8 rounded-full"
              alt="User"
            />
            <div className="bg-gray-200 p-3 rounded-xl max-w-md text-sm">
              Hmm ... Tuesday night, around 10 hours is good for you?
            </div>
          </div>

          {/* Image message */}
          <div className="flex flex-col items-end space-y-2">
            <img
              src="https://images.unsplash.com/photo-1574158622682-e40e69881006"
              alt="Dog"
              className="rounded-xl w-60"
            />
            <div className="bg-purple-600 text-white p-3 rounded-xl max-w-md text-sm">
              By the way, did you see my dog! I present to you Sheldon! 😁
            </div>
          </div>
        </div>

        {/* Input Box */}
        <div className="p-4 border-t bg-gray-50 flex items-center space-x-3">
          <input
            type="text"
            placeholder="Type something..."
            className="flex-1 p-3 rounded-full border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button className="bg-purple-600 text-white p-3 rounded-full text-lg">
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default MassagePage;