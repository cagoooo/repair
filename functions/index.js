const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });

admin.initializeApp();

/**
 * Send Line Notification Proxy
 * Proxies requests from the frontend to Line Messaging API to avoid CORS issues.
 * 
 * Expected Request Body:
 * {
 *   token: "CHANNEL_ACCESS_TOKEN",
 *   targetId: "USER_ID_OR_GROUP_ID",
 *   message: "Message content"
 * }
 */
exports.sendLineNotification = functions.https.onRequest((req, res) => {
    // Enable CORS
    cors(req, res, async () => {
        try {
            if (req.method !== 'POST') {
                return res.status(405).send('Method Not Allowed');
            }

            const { token, targetId, message, messages } = req.body;

            if (!token || !targetId || (!message && !messages)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Missing required parameters: token, targetId, and (message or messages)'
                });
            }

            // Line Messaging API Usage
            const lineApiUrl = 'https://api.line.me/v2/bot/message/push';

            const payload = {
                to: targetId,
                messages: messages || [
                    { type: 'text', text: message }
                ]
            };

            const response = await axios.post(lineApiUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            return res.status(200).json({
                status: 'success',
                data: response.data
            });

        } catch (error) {
            console.error('Line API Error:', error.response ? error.response.data : error.message);
            return res.status(500).json({
                status: 'error',
                message: error.message,
                details: error.response ? error.response.data : null
            });
        }
    });
});
