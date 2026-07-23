# NexMeet

A full‑stack video conferencing application built with React, Vite, Node.js/Express, MongoDB, and WebRTC. Users can register, log in, join meetings via code, share screens, chat in real time, and view a history of past meetings.

Live demo: [http://ec2-16-112-213-195.ap-south-2.compute.amazonaws.com](http://ec2-16-112-213-195.ap-south-2.compute.amazonaws.com)

## Features

- **User authentication** – registration and login with bcrypt‑hashed passwords  
- **Meeting rooms** – join by meeting code or generate a random guest link  
- **Real‑time video & audio** – peer‑to‑peer WebRTC calls with Socket.io signaling  
- **Screen sharing** – broadcast your screen or application window  
- **Camera & microphone controls** – toggle on/off during a call  
- **In‑call text chat** – persistent messaging with user‑specific badges  
- **Meeting history** – view past meeting codes and timestamps (MongoDB)  
- **Responsive UI** – works on desktop and mobile browsers  
- **Pre‑call lobby** – enter a display name and preview your local video before joining  
- **AWS EC2 deployment** – the project is hosted on an AWS EC2 instance  

## Tech Stack

### Frontend
- React 19 (JSX) with Vite
- Material‑UI (MUI) component library
- Socket.io‑client for real‑time signaling
- CSS Modules for scoped styling
- Axios (HTTP client)

### Backend
- Node.js with Express 5
- MongoDB + Mongoose ODM
- Socket.io for signaling & events
- bcrypt for password hashing
- dotenv for environment configuration

### Dev & Tooling
- ESLint + Prettier (via eslint.config.js)
- Git (with .ignore for node_modules, .env, .claude)

## Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB instance (local or cloud)
- Git (optional)

### Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/Gowtham7521/NexMeet.git
   cd NexMeet
   ```

2. **Install backend dependencies**
   ```bash
   cd BACKEND
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../FRONTEND
   npm install
   ```

4. **Configure environment variables**
   - Create a `.env` file in `BACKEND/` (based on the example if provided) with:
     ```
     PORT=8000
     MONGO_URI=mongodb://localhost:27017/nexmeet
     ```
   - Create a `.env` file in `FRONTEND/` (if needed) with:
     ```
     VITE_BACKEND_URL=http://localhost:8000/api/v1
     ```

5. **Start MongoDB** (if not running)
   ```bash
   mongod   # or use your cloud connection string
   ```

6. **Run the development servers**
   - In one terminal (backend):
     ```bash
     cd BACKEND
     npm run dev   # uses nodemon
     ```
   - In another terminal (frontend):
     ```bash
     cd FRONTEND
     npm run dev   # starts Vite on http://localhost:5173
     ```

7. **Open the app**
   Visit `http://localhost:5173` in your browser.

## Project Structure

```
NexMeet/
├── BACKEND/
│   ├── src/
│   │   ├── controllers/   # user logic & socket handling
│   │   ├── models/        # Mongoose schemas (User, Meeting)
│   │   ├── routes/        # Express routes
│   │   ├── app.js         # Express server setup
│   │   └── ... 
│   ├── package.json
│   └── .gitignore
├── FRONTEND/
│   ├── public/            # static assets
│   ├── src/
│   │   ├── components/    # (if any)
│   │   ├── pages/         # Landing, Home, Auth, VideoMeet, History
│   │   │   ├── Landing.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Auth.jsx
│   │   │   ├── VideoMeet.jsx
│   │   │   └── History.jsx
│   │   ├── contexts/      # AuthContext
│   │   ├── utils/         # withAuth HOC
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles/        # CSS Modules (videoComponent.module.css)
│   │   └── index.css
│   ├── package.json
│   └── .gitignore
├── .gitignore             # repo‑wide ignore (node_modules, .env, .claude)
└── CLAUDE.md              # Claude Code instructions (optional)
```

## **🚀 Deployment**

This application is **hosted on an AWS EC2 instance**. You can access the frontend at:

> **👉 [http://ec2-16-112-213-195.ap-south-2.compute.amazonaws.com](http://ec2-16-112-213-195.ap-south-2.compute.amazonaws.com)**

*API endpoints are proxied through Nginx on the same instance, mapping `/api/*` requests to the backend running on port `8000` (or `5000` depending on configuration).*

> **⚠️ Note:** When running locally for development, use your backend's local URL (e.g., `http://localhost:8000/api/v1`) instead of the EC2 hostname.
