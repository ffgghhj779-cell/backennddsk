/**
 * Webhook Controller
 * Handles Facebook Messenger webhook requests
 * Implements verification (GET) and message handling (POST)
 */

const logger = require('../utils/logger');
const {
  validateWebhookVerification,
  validateMessage,
  validateMessagingEvent
} = require('../utils/validator');
const messageService = require('../services/messageService');

/**
 * GET /webhook
 * Handles webhook verification from Facebook
 * Facebook sends a verification request when you set up the webhook
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const verifyWebhook = (req, res) => {
  try {
    // Facebook sends these query parameters
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.info('Webhook verification request received', { mode, token });

    // Validate the verification request
    const validation = validateWebhookVerification(mode, token, challenge);

    if (!validation.success) {
      logger.error('Webhook verification failed', { error: validation.error });
      return res.status(403).json({
        error: validation.error
      });
    }

    // Verification successful - return the challenge
    logger.info('Webhook verified successfully');
    res.status(200).send(validation.challenge);
  } catch (error) {
    logger.error('Error in webhook verification', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * POST /webhook
 * Handles incoming webhook events from Facebook
 * Processes messages, postbacks, and other events
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const handleWebhook = async (req, res) => {
  try {
    const body = req.body;

    logger.debug('Webhook event received', {
      object: body.object,
      entryCount: body.entry?.length
    });

    // Verify this is a page subscription
    if (body.object !== 'page') {
      logger.warn('Webhook event is not a page subscription', {
        object: body.object
      });
      return res.status(404).json({
        error: 'Not a page subscription'
      });
    }

    // Immediately respond with 200 OK to Facebook
    // This prevents Facebook from retrying the webhook
    res.status(200).send('EVENT_RECEIVED');

    // Process each entry (a page can have multiple entries)
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        // Process each messaging event
        if (entry.messaging && Array.isArray(entry.messaging)) {
          for (const event of entry.messaging) {
            await processMessagingEvent(event);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error handling webhook', {
      error: error.message,
      stack: error.stack
    });
    
    // Still return 200 to prevent Facebook retries
    res.status(200).send('ERROR');
  }
};

/**
 * Processes a single messaging event
 * Routes to appropriate handler based on event type
 * 
 * @param {object} event - Messaging event from Facebook
 */
const processMessagingEvent = async (event) => {
  try {
    // Validate event structure
    if (!validateMessagingEvent(event)) {
      logger.warn('Invalid messaging event structure', { event });
      return;
    }

    const senderId = event.sender.id;
    const recipientId = event.recipient.id;

    logger.info('Processing messaging event', {
      senderId,
      recipientId,
      hasMessage: !!event.message,
      hasPostback: !!event.postback,
      hasDelivery: !!event.delivery,
      hasRead: !!event.read
    });

    // Handle different event types
    if (event.message) {
      await handleMessage(event);
    } else if (event.postback) {
      await handlePostback(event);
    } else if (event.delivery) {
      handleDelivery(event);
    } else if (event.read) {
      handleRead(event);
    } else {
      logger.debug('Unhandled event type', { event });
    }
  } catch (error) {
    logger.error('Error processing messaging event', {
      error: error.message,
      stack: error.stack,
      event
    });
  }
};

/**
 * Handles incoming message events
 * 
 * @param {object} event - Message event
 */
const handleMessage = async (event) => {
  const senderId = event.sender.id;
  const message = event.message;
  const timestamp = event.timestamp;

  // Ignore messages sent by the bot itself (echo)
  if (message.is_echo) {
    logger.debug('Ignoring echo message', { senderId });
    return;
  }

  // Validate message
  if (!validateMessage(message)) {
    logger.warn('Invalid message structure', { senderId, message });
    return;
  }

  logger.info('Received message', {
    senderId,
    messageId: message.mid,
    hasText: !!message.text,
    hasAttachments: !!message.attachments
  });

  // Handle text messages
  if (message.text) {
    await messageService.processTextMessage(
      senderId,
      message.text,
      timestamp
    );
  }
  // Handle attachments (images, videos, etc.)
  else if (message.attachments) {
    await messageService.processAttachment(
      senderId,
      message.attachments
    );
  }
  // Handle quick reply responses
  else if (message.quick_reply) {
    logger.info('Received quick reply', {
      senderId,
      payload: message.quick_reply.payload
    });
    // Process quick reply payload as text
    await messageService.processTextMessage(
      senderId,
      message.quick_reply.payload,
      timestamp
    );
  }
};

/**
 * Handles postback events (button clicks)
 * 
 * @param {object} event - Postback event
 */
const handlePostback = async (event) => {
  const senderId = event.sender.id;
  const postback = event.postback;

  logger.info('Received postback', {
    senderId,
    payload: postback.payload,
    title: postback.title
  });

  await messageService.processPostback(
    senderId,
    postback.payload
  );
};

/**
 * Handles message delivery confirmation
 * 
 * @param {object} event - Delivery event
 */
const handleDelivery = (event) => {
  const senderId = event.sender.id;
  const delivery = event.delivery;

  logger.debug('Message delivered', {
    senderId,
    messageIds: delivery.mids,
    watermark: delivery.watermark
  });

  // You can track delivery metrics here
};

/**
 * Handles message read confirmation
 * 
 * @param {object} event - Read event
 */
const handleRead = (event) => {
  const senderId = event.sender.id;
  const read = event.read;

  logger.debug('Message read', {
    senderId,
    watermark: read.watermark
  });

  // You can track read metrics here
};

module.exports = {
  verifyWebhook,
  handleWebhook
};
