/**
 * Webhook Routes
 * Defines routes for Facebook Messenger webhook
 */

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { verifyWebhookSignature } = require('../middleware/security');

/**
 * GET /webhook
 * Webhook verification endpoint
 * Facebook calls this to verify your webhook URL
 */
router.get('/', webhookController.verifyWebhook);

/**
 * POST /webhook
 * Webhook event endpoint
 * Facebook sends events (messages, postbacks, etc.) here
 * Includes signature verification for security
 */
router.post('/', verifyWebhookSignature, webhookController.handleWebhook);

module.exports = router;
