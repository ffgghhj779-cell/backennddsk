/**
 * Facebook Messenger Service
 * Handles all interactions with Facebook Send API
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Constructs the Facebook Graph API URL
 * @returns {string} Full API URL
 */
const getApiUrl = () => {
  return `${config.facebook.graphApiUrl}/${config.facebook.apiVersion}/me/messages`;
};

/**
 * Sends a text message to a user via Facebook Send API
 * 
 * @param {string} recipientId - Facebook User ID (PSID)
 * @param {string} text - Message text to send
 * @returns {Promise<object>} API response
 */
const sendTextMessage = async (recipientId, text) => {
  try {
    logger.info(`Sending message to user ${recipientId}`);

    const requestBody = {
      recipient: {
        id: recipientId
      },
      message: {
        text: text
      },
      messaging_type: 'RESPONSE' // Standard response to user message
    };

    const response = await axios.post(
      getApiUrl(),
      requestBody,
      {
        params: {
          access_token: config.facebook.pageAccessToken
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    logger.info(`Message sent successfully to ${recipientId}`, {
      messageId: response.data.message_id,
      recipientId: response.data.recipient_id
    });

    return response.data;
  } catch (error) {
    logger.error('Error sending message via Facebook API:', {
      error: error.message,
      recipientId,
      response: error.response?.data
    });

    // Re-throw with more context
    throw new Error(`Failed to send message: ${error.message}`);
  }
};

/**
 * Sends a message with quick reply buttons
 * Useful for guiding user interactions
 * 
 * @param {string} recipientId - Facebook User ID (PSID)
 * @param {string} text - Message text
 * @param {Array} quickReplies - Array of quick reply options
 * @returns {Promise<object>} API response
 */
const sendQuickReply = async (recipientId, text, quickReplies) => {
  try {
    logger.info(`Sending quick reply to user ${recipientId}`);

    const requestBody = {
      recipient: {
        id: recipientId
      },
      message: {
        text: text,
        quick_replies: quickReplies.map(reply => ({
          content_type: 'text',
          title: reply.title,
          payload: reply.payload || reply.title
        }))
      },
      messaging_type: 'RESPONSE'
    };

    const response = await axios.post(
      getApiUrl(),
      requestBody,
      {
        params: {
          access_token: config.facebook.pageAccessToken
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    logger.info(`Quick reply sent successfully to ${recipientId}`);
    return response.data;
  } catch (error) {
    logger.error('Error sending quick reply:', {
      error: error.message,
      recipientId,
      response: error.response?.data
    });

    throw new Error(`Failed to send quick reply: ${error.message}`);
  }
};

/**
 * Sends typing indicator to show bot is processing
 * Improves user experience by showing activity
 * 
 * @param {string} recipientId - Facebook User ID (PSID)
 * @param {boolean} isTyping - True for typing_on, false for typing_off
 * @returns {Promise<object>} API response
 */
const sendTypingIndicator = async (recipientId, isTyping = true) => {
  try {
    const action = isTyping ? 'typing_on' : 'typing_off';

    const requestBody = {
      recipient: {
        id: recipientId
      },
      sender_action: action
    };

    const response = await axios.post(
      getApiUrl(),
      requestBody,
      {
        params: {
          access_token: config.facebook.pageAccessToken
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    logger.debug(`Typing indicator (${action}) sent to ${recipientId}`);
    return response.data;
  } catch (error) {
    // Don't throw error for typing indicator failures
    logger.warn('Error sending typing indicator:', {
      error: error.message,
      recipientId
    });
  }
};

/**
 * Sends a message with button template
 * Useful for actions like opening URLs or triggering postbacks
 * 
 * @param {string} recipientId - Facebook User ID (PSID)
 * @param {string} text - Message text
 * @param {Array} buttons - Array of button objects
 * @returns {Promise<object>} API response
 */
const sendButtonTemplate = async (recipientId, text, buttons) => {
  try {
    logger.info(`Sending button template to user ${recipientId}`);

    const requestBody = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: text,
            buttons: buttons
          }
        }
      },
      messaging_type: 'RESPONSE'
    };

    const response = await axios.post(
      getApiUrl(),
      requestBody,
      {
        params: {
          access_token: config.facebook.pageAccessToken
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    logger.info(`Button template sent successfully to ${recipientId}`);
    return response.data;
  } catch (error) {
    logger.error('Error sending button template:', {
      error: error.message,
      recipientId,
      response: error.response?.data
    });

    throw new Error(`Failed to send button template: ${error.message}`);
  }
};

/**
 * Gets user profile information from Facebook
 * Useful for personalization
 * 
 * @param {string} userId - Facebook User ID (PSID)
 * @returns {Promise<object>} User profile data
 */
const getUserProfile = async (userId) => {
  try {
    logger.info(`Fetching user profile for ${userId}`);

    const url = `${config.facebook.graphApiUrl}/${config.facebook.apiVersion}/${userId}`;
    
    const response = await axios.get(url, {
      params: {
        fields: 'first_name,last_name,profile_pic',
        access_token: config.facebook.pageAccessToken
      }
    });

    logger.info(`User profile fetched successfully for ${userId}`);
    return response.data;
  } catch (error) {
    logger.error('Error fetching user profile:', {
      error: error.message,
      userId,
      response: error.response?.data
    });

    // Return null instead of throwing - profile is optional
    return null;
  }
};

/**
 * Marks a message as seen
 * 
 * @param {string} recipientId - Facebook User ID (PSID)
 * @returns {Promise<object>} API response
 */
const markSeen = async (recipientId) => {
  try {
    const requestBody = {
      recipient: {
        id: recipientId
      },
      sender_action: 'mark_seen'
    };

    const response = await axios.post(
      getApiUrl(),
      requestBody,
      {
        params: {
          access_token: config.facebook.pageAccessToken
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    logger.debug(`Message marked as seen for ${recipientId}`);
    return response.data;
  } catch (error) {
    logger.warn('Error marking message as seen:', {
      error: error.message,
      recipientId
    });
  }
};

module.exports = {
  sendTextMessage,
  sendQuickReply,
  sendTypingIndicator,
  sendButtonTemplate,
  getUserProfile,
  markSeen
};
