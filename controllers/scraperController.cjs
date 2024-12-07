
const {scraper} = require('./scraper.cjs');

exports.scrapeVulnerabilities = async (req, res) => {
   const vulnerabilities = await scraper();
};

