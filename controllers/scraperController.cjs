
const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const {scraper} = require('./scraper.cjs');
const { console } = require('inspector');

exports.scrapeVulnerabilities = async (req, res) => {
   const vulnerabilities = await scraper();
};

