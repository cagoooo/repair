const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

/**
 * Send Line Notification Proxy
 * Proxies requests from the frontend to Line Messaging API to avoid CORS issues.
 */
exports.sendLineNotification = functions.https.onRequest(async (req, res) => {
    // ✅ 明確設定 CORS headers（支援 GitHub Pages + localhost）
    const allowedOrigins = [
        "https://cagoooo.github.io",
        "http://localhost:5173",
        "http://localhost:3000",
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.set("Access-Control-Allow-Origin", origin);
    } else {
        res.set("Access-Control-Allow-Origin", "*");
    }

    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "3600");

    // ✅ 處理 OPTIONS preflight 請求
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        return res.status(405).json({ status: "error", message: "Method Not Allowed" });
    }

    try {
        const { token, targetId, message, messages } = req.body;

        if (!token || !targetId || (!message && !messages)) {
            return res.status(400).json({
                status: "error",
                message: "Missing required parameters: token, targetId, and (message or messages)",
            });
        }

        const lineApiUrl = "https://api.line.me/v2/bot/message/push";
        const payload = {
            to: targetId,
            messages: messages || [{ type: "text", text: message }],
        };

        const response = await axios.post(lineApiUrl, payload, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        return res.status(200).json({ status: "success", data: response.data });

    } catch (error) {
        console.error("Line API Error:", error.response ? error.response.data : error.message);
        return res.status(500).json({
            status: "error",
            message: error.message,
            details: error.response ? error.response.data : null,
        });
    }
});
