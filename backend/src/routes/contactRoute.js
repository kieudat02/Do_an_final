const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// POST /api/contact/submit - Gửi contact form
router.post('/submit', contactController.submitContactForm);

module.exports = router;
