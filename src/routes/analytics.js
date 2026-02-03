/**
 * Analytics Routes
 * Provides endpoints for viewing conversation analytics
 * 
 * SECURITY: Add authentication before deploying to production!
 */

const express = require('express');
const router = express.Router();
const conversationLogger = require('../utils/conversationLogger');
const logger = require('../utils/logger');

/**
 * GET /analytics/stats
 * Get conversation statistics for a specific date
 * Query params: ?date=YYYY-MM-DD (defaults to today)
 */
router.get('/stats', async (req, res) => {
  try {
    const date = req.query.date || null;
    const stats = await conversationLogger.getStats(date);
    
    if (!stats) {
      return res.status(404).json({
        error: 'No data found for the specified date'
      });
    }
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching analytics stats', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * GET /analytics/summary
 * Get a summary of conversations over the last N days
 * Query params: ?days=7 (defaults to 7)
 */
router.get('/summary', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const summary = {
      period: `Last ${days} days`,
      totalConversations: 0,
      totalUsers: new Set(),
      intents: {},
      dailyStats: []
    };
    
    // Get stats for each day
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStats = await conversationLogger.getStats(dateStr);
      if (dayStats && dayStats.totalConversations > 0) {
        summary.dailyStats.push(dayStats);
        summary.totalConversations += dayStats.totalConversations;
        
        // Aggregate intents
        for (const [intent, count] of Object.entries(dayStats.intents)) {
          summary.intents[intent] = (summary.intents[intent] || 0) + count;
        }
      }
    }
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Error fetching analytics summary', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch summary'
    });
  }
});

/**
 * GET /analytics/intents
 * Get intent distribution (sorted by frequency)
 */
router.get('/intents', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const intents = {};
    
    // Aggregate intents over multiple days
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStats = await conversationLogger.getStats(dateStr);
      if (dayStats) {
        for (const [intent, count] of Object.entries(dayStats.intents)) {
          intents[intent] = (intents[intent] || 0) + count;
        }
      }
    }
    
    // Sort by frequency
    const sorted = Object.entries(intents)
      .sort((a, b) => b[1] - a[1])
      .map(([intent, count]) => ({ intent, count }));
    
    res.status(200).json({
      success: true,
      period: `Last ${days} days`,
      data: sorted
    });
  } catch (error) {
    logger.error('Error fetching intent analytics', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch intent data'
    });
  }
});

module.exports = router;
