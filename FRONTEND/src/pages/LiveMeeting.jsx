import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  VideoConference,
  ControlBar,
  RoomAudioRenderer,
  useRoomContext,
  Room,
} from "@livekit/components-react";
import { Disconnected, RoomEvent } from "livekit-client";
import server from "../environment";


export default function LiveMeeting() {
  const { url } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roomError, setRoomError] = useState("");
  const [joinAttempted, setJoinAttempted] = useState(false);

  const room = useRoomContext();

  const joinMeeting = useCallback(async () => {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }

    setLoading(true);
    setError("");
    setRoomError("");
    setJoinAttempted(true);

    try {
      const response = await fetch(`${server}/api/v1/livekit/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName: url,
          participantName: name,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to get token");
      }

      setToken(data.token);
      setLivekitUrl(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [name, url]);

  // Handle LiveKit room errors
  useEffect(() => {
    if (!room) return;

    const handleRoomError = (error) => {
      console.error("LiveKit Room Error:\", error);
      setRoomError(`Connection error: ${error.message || "Unknown error"}`);
    };

    const handleDisconnected = (reason) => {
      console.log("Disconnected:", reason);
      if (reason?.reason === "network") {
        setRoomError("Network connection lost. Please check your connection.");
      } else if (reason) {
        setRoomError(`Disconnected: ${reason}`);
      } else {
        navigate("/");
      }
    };

    room.on(RoomEvent.Error, handleRoomError);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.Error, handleRoomError);
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [room, navigate]);

  if (!token) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 20,
          background: "#111",
          color: "white",
        }}
      >
        <h1>NexMeet Lobby</h1>
        <h3>Room: {url}</h3>

        <input
          value={name}
          placeholder="Enter your name"
          onChange={(e) => setName(e.target.value)}
          style={{
            width: 300,
            padding: 12,
            borderRadius: 8,
            fontSize: 16,
            border: "1px solid #444",
            background: "#222",
            color: "white",
          }}
          onKeyPress={(e) => e.key === "Enter" && joinMeeting()}
        />

        <button
          onClick={joinMeeting}
          disabled={loading}
          style={{
            padding: "12px 24px",
            cursor: "pointer",
            fontSize: 16,
            background: loading ? "#555" : "#1976d2",
            color: "white",
            border: "none",
            borderRadius: 8,
            transition: "background 0.3s",
          }}
        >
          {loading ? "Joining..." : "Join Meeting"}
        </button>

        {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}

        {roomError && (
          <div style={{ color: "#ff6b6b", textAlign: "center" }}>
            <p>{roomError}</p>
            <button
              onClick={() => setRoomError("")}
              style={{
                marginTop: 10,
                padding: "8px 16px",
                background: "#333",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={livekitUrl}
      connect={true}
      video={true}
      audio={true}
      onDisconnected={() => navigate("/")}
      style={{ height: "100vh" }}
      data-lk-theme="default"
      audioDefaultOutputDeviceId={undefined}
    >
      <VideoConference />
      <RoomAudioRenderer />
      <ControlBar
        controls={{
          microphone: true,
          camera: true,
          screenShare: true,
          chat: false,
          leave: true,
        }}
      />
    </LiveKitRoom>
  );
}