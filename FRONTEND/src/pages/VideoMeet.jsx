import React, { useEffect, useRef, useState } from 'react';
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button, Tooltip } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import server from '../environment';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" },
        { "urls": "stun:stun1.l.google.com:19302" },
        ...(import.meta.env.VITE_TURN_SERVER_URL ? [{
            urls: import.meta.env.VITE_TURN_SERVER_URL,
            username: import.meta.env.VITE_TURN_USERNAME || "",
            credential: import.meta.env.VITE_TURN_PASSWORD || ""
        }] : [])
    ]
};

const addTracksToConnection = (connection, stream) => {
    stream.getTracks().forEach(track => {
        const senders = connection.getSenders();
        const alreadyAdded = senders.some(sender => sender.track && sender.track.id === track.id);
        if (!alreadyAdded) {
            connection.addTrack(track, stream);
        }
    });
};

export default function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();
    let localVideoContainerRef = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState(false);
    let [audio, setAudio] = useState(false);

    let [screen, setScreen] = useState(false);
    let [showModal, setModal] = useState(true);
    let [screenAvailable, setScreenAvailable] = useState(false);

    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(0);

    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");

    const videoRef = useRef([]);
    let [videos, setVideos] = useState([]);

    useEffect(() => {
        getPermissions();
    }, []);

let getDisplayMedia = () => {
    if (!navigator.mediaDevices) {
        console.error("MediaDevices API not available");
        return;
    }

    if (screen && navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
            .getDisplayMedia({ video: true, audio: true })
            .then(getDisplayMediaSuccess)
            .catch(console.error);
    }
};

    let [isSecureContext, setIsSecureContext] = useState(true);

    const getPermissions = async () => {
        try {
            if (!navigator.mediaDevices) {
                console.error("navigator.mediaDevices is undefined (Insecure context or unsupported browser)");
                setIsSecureContext(false);
                setVideoAvailable(false);
                setAudioAvailable(false);
                setScreenAvailable(false);
                return;
            }

        if (navigator.mediaDevices.getDisplayMedia) {
            setScreenAvailable(true);
        } else {
            setScreenAvailable(false);
        }

        let videoOk = false;
        let audioOk = false;

        try {
            const testStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            videoOk = true;
            audioOk = true;

            testStream.getTracks().forEach(track => track.stop());

        } catch (err) {

            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: true
                });

                audioOk = true;

                audioStream.getTracks().forEach(track => track.stop());

            } catch (err2) {
                console.log("No media permissions granted");
            }
        }

        setVideoAvailable(videoOk);
        setAudioAvailable(audioOk);

        if (videoOk || audioOk) {
            const userMediaStream = await navigator.mediaDevices.getUserMedia({
                video: videoOk,
                audio: audioOk
            });

            window.localStream = userMediaStream;
            console.log("STEP 1", userMediaStream);

            if (localVideoref.current) {
                localVideoref.current.srcObject = userMediaStream;
                console.log("STEP 2", localVideoref.current.srcObject);
            }
        }

    } catch (error) {
        console.error("getPermissions() failed:", error);
    }
};

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
            console.log("SET STATE HAS ", video, audio);
        }
    }, [video, audio]);

    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    };

    let getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop());
        } catch (e) { console.log(e); }

        window.localStream = stream;
        localVideoref.current.srcObject = stream;

        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            addTracksToConnection(connections[id], window.localStream);

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                    })
                    .catch(e => console.log(e));
            });
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            } catch (e) { console.log(e); }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            localVideoref.current.srcObject = window.localStream;

            for (let id in connections) {
                addTracksToConnection(connections[id], window.localStream);

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                        })
                        .catch(e => console.log(e));
                });
            }
        });
    };

let getUserMedia = () => {
    if (!navigator.mediaDevices) {
        console.error("MediaDevices API not available");
        return;
    }

    if ((video && videoAvailable) || (audio && audioAvailable)) {
        navigator.mediaDevices
            .getUserMedia({ video, audio })
            .then(getUserMediaSuccess)
            .catch(console.error);
    } else {
        try {
            let tracks = localVideoref.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        } catch (e) {}
    }
};

    let getDisplayMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop());
        } catch (e) { console.log(e); }

        window.localStream = stream;
        localVideoref.current.srcObject = stream;

        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            addTracksToConnection(connections[id], window.localStream);

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                    })
                    .catch(e => console.log(e));
            });
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            } catch (e) { console.log(e); }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            localVideoref.current.srcObject = window.localStream;

            getUserMedia();
        });
    };

    const createPeerConnection = (socketListId) => {
        if (connections[socketListId]) return connections[socketListId];

        const pc = new RTCPeerConnection(peerConfigConnections);
        connections[socketListId] = pc;

        pc.onicecandidate = function (event) {
            if (event.candidate != null) {
                socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }));
            }
        };

        pc.ontrack = (event) => {
            const stream = event.streams[0];
            if (!stream) return;

            setVideos(prevVideos => {
                let videoExists = prevVideos.find(video => video.socketId === socketListId);
                let updatedVideos;
                if (videoExists) {
                    updatedVideos = prevVideos.map(video =>
                        video.socketId === socketListId ? { ...video, stream } : video
                    );
                } else {
                    let newVideo = {
                        socketId: socketListId,
                        stream,
                        autoplay: true,
                        playsinline: true
                    };
                    updatedVideos = [...prevVideos, newVideo];
                }
                videoRef.current = updatedVideos;
                return updatedVideos;
            });
        };

        if (window.localStream) {
            addTracksToConnection(pc, window.localStream);
        } else {
            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            addTracksToConnection(pc, window.localStream);
        }

        return pc;
    };

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message);

        if (fromId !== socketIdRef.current) {
            if (!connections[fromId]) {
                createPeerConnection(fromId);
            }

            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (connections[fromId].iceQueue && connections[fromId].iceQueue.length) {
                        connections[fromId].iceQueue.forEach(candidate => {
                            connections[fromId].addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.log(e));
                        });
                        connections[fromId].iceQueue = [];
                    }

                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }));
                            }).catch(e => console.log(e));
                        }).catch(e => console.log(e));
                    }
                }).catch(e => console.log(e));
            }

            if (signal.ice) {
                if (connections[fromId] && connections[fromId].remoteDescription) {
                    connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
                } else if (connections[fromId]) {
                    if (!connections[fromId].iceQueue) connections[fromId].iceQueue = [];
                    connections[fromId].iceQueue.push(signal.ice);
                }
            }
        }
    };

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.pathname);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                if (connections[id]) {
                    connections[id].close();
                    delete connections[id];
                }
                setVideos((videos) => videos.filter((video) => video.socketId !== id));
            });

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) return;
                    createPeerConnection(socketListId);
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }));
                                })
                                .catch(e => console.log(e));
                        });
                    }
                }
            });
        });
    };

    let silence = () => {
        let ctx = new AudioContext();
        let oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    };

    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height });
        canvas.getContext('2d').fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    };

    let handleVideo = () => {
        setVideo(!video);
    };

    let handleAudio = () => {
        setAudio(!audio);
    };

    useEffect(() => {
        if (screen !== false) {
            getDisplayMedia();
        }
    }, [screen]);

    let handleScreen = () => {
        setScreen(!screen);
    };

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        } catch (e) { }
        window.location.href = "/";
    };

    let openChat = () => {
        setModal(true);
        setNewMessages(0);
    };

    let closeChat = () => {
        setModal(false);
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender, data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    let sendMessage = () => {
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    };

    let connect = () => {
        setAskForUsername(false);
        getMedia();
    };

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#020617' }}>
            {askForUsername === true ? (
                <div className={styles.lobbyContainer}>
                    <div className={styles.lobbyCard}>
                        <h2 className={styles.lobbyTitle}>Ready to Join?</h2>
                        <p className={styles.lobbySubtitle}>Enter your display name to join the meeting room</p>
                        
                        <div className={styles.lobbyVideoPreview}>
                            <video ref={localVideoref} autoPlay muted playsInline></video>
                            <div className={styles.userLabel}>
                                <PersonIcon style={{ fontSize: 16 }} /> Camera Preview
                            </div>
                        </div>

                        <div className={styles.lobbyInputContainer}>
                            <TextField
                                id="outlined-basic"
                                label="Your Display Name"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                variant="outlined"
                                fullWidth
                                placeholder="e.g. Alex"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: '#ffffff',
                                        borderRadius: '12px',
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                        '&:hover fieldset': { borderColor: '#3b82f6' },
                                        '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                                    },
                                    '& .MuiInputLabel-root': { color: '#94a3b8' },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' }
                                }}
                            />
                            <Button
                                className={styles.joinButton}
                                variant="contained"
                                onClick={connect}
                                disabled={!username.trim()}
                                fullWidth
                            >
                                Join Meeting
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
                    {!isSecureContext && (
                        <div style={{
                            position: 'absolute',
                            top: 16,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            padding: '10px 24px',
                            borderRadius: '30px',
                            zIndex: 1000,
                            fontSize: '13px',
                            fontWeight: 600,
                            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)'
                        }}>
                            ⚠️ Camera & Microphone blocked on HTTP. Please use HTTPS.
                        </div>
                    )}

                    {/* Main Video Conference Grid */}
                    <div
                        className={styles.conferenceView}
                        style={{
                            gridTemplateColumns: videos.length === 0 ? '1fr' :
                                videos.length === 1 ? '1fr' :
                                videos.length === 2 ? 'repeat(2, 1fr)' :
                                'repeat(auto-fit, minmax(320px, 1fr))'
                        }}
                    >
                        {videos.length === 0 ? (
                            <div className={styles.videoCard} style={{ maxWidth: '960px', height: '76vh', margin: '0 auto' }}>
                                <video ref={localVideoref} autoPlay muted playsInline></video>
                                <div className={styles.userLabel}>
                                    <PersonIcon style={{ fontSize: 16 }} /> {username || "You"} (Waiting for others to join...)
                                </div>
                            </div>
                        ) : (
                            videos.map((videoItem) => (
                                <div className={styles.videoCard} key={videoItem.socketId}>
                                    <video
                                        data-socket={videoItem.socketId}
                                        ref={ref => {
                                            if (ref && videoItem.stream) {
                                                ref.srcObject = videoItem.stream;
                                            }
                                        }}
                                        autoPlay
                                        playsInline
                                    ></video>
                                    <div className={styles.userLabel}>
                                        <PersonIcon style={{ fontSize: 16 }} /> Participant ({videoItem.socketId.substring(0, 5)})
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Floating Self-View Picture-in-Picture Card (when remote users exist) */}
                    {videos.length > 0 && (
                        <div className={styles.meetUserVideoCard}>
                            <video ref={localVideoref} autoPlay muted playsInline></video>
                            <div className={styles.userLabel} style={{ bottom: 6, left: 6, fontSize: 11, padding: '3px 8px' }}>
                                You
                            </div>
                        </div>
                    )}

                    {/* Glass Control Bar */}
                    <div className={styles.buttonContainers}>
                        <Tooltip title={video ? "Turn Camera Off" : "Turn Camera On"}>
                            <IconButton
                                onClick={handleVideo}
                                className={`${styles.controlBtn} ${video ? styles.controlBtnActive : styles.controlBtnOff}`}
                            >
                                {video ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={audio ? "Mute Microphone" : "Unmute Microphone"}>
                            <IconButton
                                onClick={handleAudio}
                                className={`${styles.controlBtn} ${audio ? styles.controlBtnActive : styles.controlBtnOff}`}
                            >
                                {audio ? <MicIcon /> : <MicOffIcon />}
                            </IconButton>
                        </Tooltip>

                        {screenAvailable && (
                            <Tooltip title={screen ? "Stop Sharing" : "Share Screen"}>
                                <IconButton
                                    onClick={handleScreen}
                                    className={`${styles.controlBtn} ${screen ? styles.controlBtnOff : styles.controlBtnActive}`}
                                >
                                    {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                                </IconButton>
                            </Tooltip>
                        )}

                        <Tooltip title="In-Call Chat">
                            <Badge badgeContent={newMessages} max={99} color='error'>
                                <IconButton
                                    onClick={() => setModal(!showModal)}
                                    className={`${styles.controlBtn} ${showModal ? styles.controlBtnActive : styles.controlBtnActive}`}
                                >
                                    <ChatIcon />
                                </IconButton>
                            </Badge>
                        </Tooltip>

                        <Tooltip title="Leave Call">
                            <IconButton onClick={handleEndCall} className={styles.endCallBtn}>
                                <CallEndIcon />
                            </IconButton>
                        </Tooltip>
                    </div>

                    {/* In-Call Chat Side Drawer */}
                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <div className={styles.chatHeader}>
                                    <h2>In-Call Messages</h2>
                                    <IconButton onClick={closeChat} style={{ color: '#94a3b8' }}>
                                        <CloseIcon />
                                    </IconButton>
                                </div>
                                <div className={styles.chattingDisplay}>
                                    {messages.length !== 0 ? (
                                        messages.map((item, index) => {
                                            const isSelf = item.sender === username;
                                            return (
                                                <div
                                                    key={index}
                                                    className={`${styles.messageGroup} ${isSelf ? styles.ownMessageGroup : styles.otherMessageGroup}`}
                                                >
                                                    <span className={styles.senderName}>{item.sender}</span>
                                                    <div className={`${styles.messageBubble} ${isSelf ? styles.ownMessageBubble : styles.otherMessageBubble}`}>
                                                        {item.data}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className={styles.emptyChat}>No messages yet. Say hello!</p>
                                    )}
                                </div>
                                <div className={styles.chattingArea}>
                                    <TextField
                                        className={styles.chatInput}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyPress={(e) => { if (e.key === 'Enter') sendMessage(); }}
                                        id="chat-input"
                                        placeholder="Send a message..."
                                        variant="outlined"
                                        size="small"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                color: '#ffffff',
                                                borderRadius: '12px',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
                                                '&:hover fieldset': { borderColor: '#3b82f6' },
                                                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                                            }
                                        }}
                                    />
                                    <Button className={styles.sendButton} variant='contained' onClick={sendMessage}>
                                        <SendIcon style={{ fontSize: 20 }} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

