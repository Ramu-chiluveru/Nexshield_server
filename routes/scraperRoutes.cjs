const express = require('express');
const { scrapeVulnerabilities } = require('../controllers/scraperController.cjs');

const router = express.Router();

router.get('/', scrapeVulnerabilities);

module.exports = router;
