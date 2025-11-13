const express = require('express');
const router = express.Router();
const aiAnalyticsController = require('../controllers/aiAnalyticsController');

/**
 * AI Analytics Routes
 * Endpoints cho sentiment analysis, intent classification và metrics
 */

// Sentiment Analysis
router.post('/sentiment', aiAnalyticsController.analyzeSentiment);
router.get('/sentiment-trend/:sessionId', aiAnalyticsController.getSentimentTrend);

// Intent Classification
router.post('/intent', aiAnalyticsController.classifyIntent);
router.get('/intent-flow/:sessionId', aiAnalyticsController.getIntentFlow);

// Comprehensive Analysis
router.post('/analyze', aiAnalyticsController.comprehensiveAnalysis);

// Batch Analysis
router.post('/batch-analyze', aiAnalyticsController.batchAnalyze);

// Metrics
router.get('/metrics', aiAnalyticsController.getMetrics);

// Cache Management
router.post('/clear-cache', aiAnalyticsController.clearCache);

module.exports = router;