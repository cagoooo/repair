/**
 * Notification Service
 * Handles sending notifications via Line Messaging API (through Google Apps Script Proxy)
 * (Line Notify is discontinued as of March 31, 2025)
 */

const defaultProxyUrl = 'https://us-central1-smes-e1dc3.cloudfunctions.net/sendLineNotification';

export const sendLineNotification = async (message, config = {}) => {
  // 1. Get Configuration
  const token = config.token || localStorage.getItem('line_custom_token'); // Channel Access Token
  const proxyUrl = config.proxyUrl || localStorage.getItem('gas_proxy_url') || defaultProxyUrl;
  // For Messaging API, we need a target ID (User ID or Group ID)
  const targetId = config.targetId || localStorage.getItem('line_target_id');

  if (!token) {
    console.warn('Line Token is missing.');
    return { success: false, error: 'Missing token' };
  }

  try {
    // 2. Prepare Payload for Messaging API
    // If targetId is present, we assume Messaging API usage.

    // Create Flex Message if extended data is provided
    let messages = [];

    if (config.repairData) {
      // Enhanced mode: Send Flex Message
      const flexMessage = createRepairFlexMessage(config.repairData, message);
      messages = [flexMessage];
    } else {
      // Legacy/Simple mode: Send Text Message
      messages = [{ type: 'text', text: message.trim() }];
    }

    // 3. Send Request to Proxy (Firebase Function)
    // Adjust for Firebase Functions: Use JSON body with 'messages'
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token,
        targetId: targetId,
        messages: messages // Pass the constructed messages array
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (result.status === 'success') {
      console.log('Line Notification Sent:', result);
      return { success: true };
    } else {
      console.error('Line Notification Failed:', result);
      return { success: false, error: result.message || 'Unknown error' };
    }

  } catch (error) {
    console.error('Error sending Line Notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Google Apps Script (GAS) Code Snippet for User
 * 
 * Instructions:
 * 1. Go to script.google.com -> New Project
 * 2. Paste the code below
 * 3. Deploy -> New Deployment -> Type: Web App -> Access: Anyone
 * 4. Copy the Web App URL
 */
/*
function doPost(e) {
  // ... (GAS code omitted for brevity) ...
}
*/

/**
 * Create a Flex Message for Repair Notification
 */
const createRepairFlexMessage = (data, fallbackText) => {
  // Determine header color based on priority
  const headerColor = data.priority === 'urgent' ? '#ef4444' : '#10b981'; // Red for urgent, Green for others
  const statusText = '新報修通知';

  const bubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '校園報修系統',
          weight: 'bold',
          color: '#ffffff',
          size: 'sm'
        },
        {
          type: 'text',
          text: statusText,
          weight: 'bold',
          color: '#ffffff',
          size: 'xl',
          margin: 'md'
        }
      ],
      backgroundColor: headerColor,
      paddingAll: '20px'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '地點',
              size: 'sm',
              color: '#aaaaaa',
              flex: 2
            },
            {
              type: 'text',
              text: data.roomName || data.roomCode,
              size: 'sm',
              color: '#666666',
              flex: 5,
              wrap: true
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '項目',
              size: 'sm',
              color: '#aaaaaa',
              flex: 2
            },
            {
              type: 'text',
              text: `${data.category} - ${data.itemName || data.itemType}`,
              size: 'sm',
              color: '#666666',
              flex: 5,
              wrap: true
            }
          ],
          margin: 'md'
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '申報人',
              size: 'sm',
              color: '#aaaaaa',
              flex: 2
            },
            {
              type: 'text',
              text: data.reporterName,
              size: 'sm',
              color: '#666666',
              flex: 5,
              wrap: true
            }
          ],
          margin: 'md'
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '描述',
              size: 'sm',
              color: '#aaaaaa',
              flex: 2
            },
            {
              type: 'text',
              text: data.description,
              size: 'sm',
              color: '#666666',
              flex: 5,
              wrap: true
            }
          ],
          margin: 'md'
        }
      ],
      paddingAll: '20px'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '查看詳情',
            uri: 'https://cagoooo.github.io/repair/'
          },
          style: 'primary',
          color: headerColor
        }
      ]
    }
  };

  // Add Hero Image if available
  if (data.imageUrl) {
    bubble.hero = {
      type: 'image',
      url: data.imageUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'fit',
      backgroundColor: '#000000',
      action: {
        type: 'uri',
        uri: data.imageUrl
      }
    };
  }

  return {
    type: 'flex',
    altText: fallbackText,
    contents: bubble
  };
};
