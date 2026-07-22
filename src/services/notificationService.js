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
      const flexMessage = createRepairFlexMessage(
        config.repairData,
        message,
        config.notificationType || 'new'
      );
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
const createRepairFlexMessage = (data, fallbackText, notificationType = 'new') => {
  const isReminder = notificationType === 'reminder';
  // LINE Flex 標題使用深色背景，確保白字在手機上清楚可讀
  const headerColor = isReminder
    ? '#92400E'
    : (data.priority === 'urgent' ? '#991B1B' : '#065F46');
  const subColor = isReminder
    ? '#FDE68A'
    : (data.priority === 'urgent' ? '#FECACA' : '#A7F3D0');
  const statusText = isReminder ? '待處理報修提醒' : '新報修通知';
  const categoryName = data.category === 'GENERAL' ? '事務組' : '資訊組';
  const detailUrl = data.id
    ? `https://cagoooo.github.io/repair/?repairId=${encodeURIComponent(data.id)}`
    : 'https://cagoooo.github.io/repair/';

  const bodyContents = [];
  if (isReminder) {
    bodyContents.push({
      type: 'text',
      text: '這筆報修仍待處理，請記得查看並安排處理，謝謝您。',
      size: 'sm',
      color: '#92400E',
      weight: 'bold',
      wrap: true
    });
  }

  const fields = [
    ['地點', `${data.roomCode || ''} ${data.roomName || ''}`.trim() || '未填寫'],
    ['類別', `${categoryName}・${data.itemName || data.itemType || '未填寫'}`],
    ['申報人', data.reporterName || '未填寫'],
    ['描述', data.description || '未填寫']
  ];

  fields.forEach(([label, value], index) => {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: label,
          size: 'sm',
          color: '#64748B',
          weight: 'bold',
          flex: 4
        },
        {
          type: 'text',
          text: value,
          size: 'sm',
          color: '#0F172A',
          flex: 6,
          wrap: true
        }
      ],
      margin: (index === 0 && !isReminder) ? 'none' : 'md'
    });
  });

  const bubble = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '校園報修系統',
          weight: 'bold',
          color: subColor,
          size: 'sm'
        },
        {
          type: 'text',
          text: statusText,
          weight: 'bold',
          color: '#FFFFFF',
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
      contents: bodyContents,
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
            uri: detailUrl
          },
          style: 'primary',
          color: headerColor
        }
      ]
    }
  };

  // Add Hero Image if available
  if (!isReminder && data.imageUrl) {
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
    altText: fallbackText.substring(0, 390),
    contents: bubble
  };
};
