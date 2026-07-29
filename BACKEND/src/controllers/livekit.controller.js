// cspell:ignore LIVEKIT
import { AccessToken } from "livekit-server-sdk";
import crypto from "crypto";

/**
 * Generates a LiveKit token for a participant.
 * Creates a unique identity per room to avoid conflicts when multiple users
 * use the same display name.
 */
export const generateToken = async (req, res) => {
    // Validate LiveKit environment variables early
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) {
        console.error("LiveKit environment variables not configured:");
        console.error("- LIVEKIT_API_KEY:", process.env.LIVEKIT_API_KEY ? "✓ set" : "✗ missing");
        console.error("- LIVEKIT_API_SECRET:", process.env.LIVEKIT_API_SECRET ? "✓ set" : "✗ missing");
        console.error("- LIVEKIT_URL:", process.env.LIVEKIT_URL ? "✓ set" : "✗ missing");

        return res.status(500).json({
            success: false,
            message: "LiveKit server configuration error. Please contact administrator."
        });
    }

    try {
        const { roomName, participantName } = req.body;

        if (!roomName || !participantName) {
            return res.status(400).json({
                success: false,
                message: "roomName and participantName are required",
            });
        }

        // Generate a unique identity using timestamp + random suffix
        // This prevents conflicts when multiple users join with the same display name
        const uniqueIdentity = `${participantName}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

        const token = new AccessToken(
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET,
            {
                identity: uniqueIdentity,
                // Store the display name in metadata for UI purposes
                metadata: JSON.stringify({ displayName: participantName })
            }
        );

        token.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
        });

        const jwt = await token.toJwt();

        return res.status(200).json({
            success: true,
            token: jwt,
            url: process.env.LIVEKIT_URL,
        });

    } catch (error) {
        console.error("LiveKit Token Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};