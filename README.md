# Chatboot Project Documentation

Chatboot is a real-time chat application built with a Node.js/Express backend and a React frontend, using Socket.IO for instant messaging and MongoDB for data storage.

---

## Project Structure

- **/Server**  
  Contains the backend API, authentication, user management, and Socket.IO server logic.

- **/Client**  
  Contains the React frontend, including authentication, chat UI, and API/socket integration.

---

## Server Overview

- **Tech Stack:** Node.js, Express, MongoDB, Socket.IO, Redis (for online user tracking)
- **Main Features:**
  - User registration and authentication (JWT)
  - User search and profile management
  - Real-time messaging with Socket.IO
  - Online/offline user status
  - REST API endpoints for user actions

**See [`/Server/README.md`](./Server/README.md) for full backend API and socket event documentation, including:**
- Endpoint descriptions
- Required request/response data
- Status codes
- Socket.IO event flows

---

## Client Overview

- **Tech Stack:** React, React Router, Socket.IO-client, react-hot-toast
- **Main Features:**
  - Signup, login, and logout flows
  - User search and chat initiation
  - Real-time chat interface
  - Online status indicators
  - JWT token management for authentication

**See [`/Client/README.md`](./Client/README.md) for full frontend integration details, including:**
- How to call backend endpoints
- How to connect and interact with Socket.IO events
- Data formats for requests and responses

---

## How to Run

1. **Clone the repository:**
    ```sh
    git clone <repo-url>
    cd Chatboot
    ```

2. **Install dependencies:**
    - Backend:
      ```sh
      cd Server
      npm install
      ```
    - Frontend:
      ```sh
      cd ../Client
      npm install
      ```

3. **Set up environment variables:**
    - In `/Server`, create a `.env` file with:
      ```
      MONGO_URL=<your-mongodb-url>
      TOKEN_SCRETE=<your-jwt-secret>
      ```
    - (Optional) Set up Redis if using for online user tracking.

4. **Start the servers:**
    - Backend:
      ```sh
      cd ../Server
      npm start
      ```
    - Frontend:
      ```sh
      cd ../Client
      npm run dev
      ```

5. **Access the app:**
    - Frontend: [https://chat-boot-9yl6.onrender.com](https://chat-boot-9yl6.onrender.com)
    - Backend API: [https://chatboot-05p9.onrender.com](https://chatboot-05p9.onrender.com)

---

## Documentation Links

- [Backend API & Socket Events](./Server/README.md)
- [Frontend Integration](./Client/README.md)

---

## Contact

For any questions or issues, please contact the

Made with 🚩 by Vikas Maurya
