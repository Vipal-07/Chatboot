# Chatboot Backend API Documentation

## Base URL

```
http://localhost:5000
```

---

## Endpoints

### 1. Signup

- **URL:** `/signup`
- **Method:** `POST`
- **Description:** Register a new user.

#### Request Body

```json
{
  "name": "string (optional)",
  "username": "string (required)",
  "password": "string (required)",
  "profilePic": "string (optional, image URL)"
}
```

#### Responses

- **201 Created**
  - User created successfully.
  - Example:
    ```json
    {
      "message": "User created successfully",
      "data": { /* user object */ },
      "success": true
    }
    ```
- **400 Bad Request**
  - User already exists.
  - Example:
    ```json
    {
      "message": "Already user exits",
      "error": true
    }
    ```
- **500 Internal Server Error**
  - Server error.

---

### 2. Login

- **URL:** `/login`
- **Method:** `POST`
- **Description:** Authenticate user and return JWT token.

#### Request Body

```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

#### Responses

- **200 OK**
  - Login successful, returns JWT token.
  - Example:
    ```json
    {
      "message": "Login successfully",
      "token": "JWT_TOKEN",
      "success": true
    }
    ```
- **400 Bad Request**
  - Invalid credentials.
  - Example:
    ```json
    {
      "message": "Please check password",
      "error": true
    }
    ```
- **500 Internal Server Error**
  - Server error.

---

### 3. Logout

- **URL:** `/logout`
- **Method:** `POST`
- **Description:** Logout user by clearing the token cookie.

#### Responses

- **200 OK**
  - Logout successful.
  - Example:
    ```json
    {
      "message": "session out",
      "success": true
    }
    ```
- **500 Internal Server Error**
  - Server error.

---

### 4. Get User by Username

- **URL:** `/card`
- **Method:** `POST`
- **Description:** Get user details by username.

#### Request Body

```json
{
  "username": "string (required)"
}
```

#### Responses

- **201 Created**
  - User found.
  - Example:
    ```json
    {
      "message": "User exists",
      "data": { /* user object */ },
      "success": true
    }
    ```
- **404 Not Found**
  - User not found.
  - Example:
    ```json
    {
      "message": "User not found",
      "error": true
    }
    ```
- **500 Internal Server Error**
  - Server error.

---

## Socket.IO Events

### Connection

- **Event:** `connection`
- **Description:** Triggered when a client connects to the server. Requires authentication token.
- **How to Connect:**
    ```js
    const socket = io('http://localhost:5000', {
      auth: { token: 'JWT_TOKEN' }
    });
    ```

---

### 1. `currentUser-details`

- **Emitted By:** Server (on connect)
- **Description:** Sends the current user's details after successful authentication.
- **Data Example:**
    ```json
    {
      "_id": "string",
      "name": "string",
      "username": "string",
      "profilePic": "string"
    }
    ```

---

### 2. `get-user-details`

- **Emitted By:** Client
- **Description:** Request details for a specific user by user ID.
- **Data Required:**
    ```json
    {
      "userId": "string (required)"
    }
    ```
- **Response Event:** `receiver-user`
- **Response Example:**
    ```json
    {
      "_id": "string",
      "name": "string",
      "username": "string",
      "profilePic": "string"
    }
    ```

---

### 3. `check-user-online`

- **Emitted By:** Client
- **Description:** Check if a user is online.
- **Data Required:**
    ```json
    {
      "userId": "string (required)"
    }
    ```
- **Response Event:** `user-online-status`
- **Response Example:**
    ```json
    {
      "userId": "string",
      "isOnline": true
    }
    ```

---

### 4. `send-massage`

- **Emitted By:** Client
- **Description:** Send a message to another user.
- **Data Required:**
    ```json
    {
      "sender": "string (sender userId, required)",
      "receiver": "string (receiver userId, required)",
      "text": "string (required)"
    }
    ```
- **Response Event:** `receive-massage`
- **Response Example:**
    ```json
    {
      "sender": "string",
      "receiver": "string",
      "text": "string"
    }
    ```

---

### 5. `receive-massage`

- **Emitted By:** Server
- **Description:** Delivers a message to the receiver (and echoes to sender).
- **Data Example:** Same as above.

---

### 6. `user-online-status`

- **Emitted By:** Server
- **Description:** Notifies about a user's online/offline status.
- **Data Example:**
    ```json
    {
      "userId": "string",
      "isOnline": true
    }
    ```

---

### 7. Offline Messages

- **Description:** When a user comes online, any messages sent while offline are delivered via `receive-massage` events.

---

## Notes

- All endpoints expect and return JSON.
- For protected routes, use the JWT token returned from `/login` as needed.
- Profile picture should be a valid image URL (uploaded via Cloudinary or similar).
- All data is exchanged in JSON format.
- Authentication is required via JWT token in the `auth` property when connecting.
- Handle all events and responses as shown above for smooth communication.

---

For any questions, contact the backend