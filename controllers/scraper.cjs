const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const vulnerabilityModel = require('../models/vulnerabilityModel.cjs');

exports.scraper = async () => {
    console.log("Running JavaScript script...");
    
    try {
        const response = await axios.get("https://nvd.nist.gov/");
        const $ = cheerio.load(response.data);

        // Find the div containing the latest vulnerabilities
        const latestVulnsArea = $('#latestVulnsArea');
        if (!latestVulnsArea.length) {
            console.log("No vulnerabilities found.");
            return [];
        }

        let vulnerabilities = [];

        latestVulnsArea.find('li').each((index, item) => {
            const titleElement = $(item).find('a[id^="cveDetailAnchor-"]');
            const title = titleElement.text().trim() || 'No Title';
            const link = "https://nvd.nist.gov" + titleElement.attr('href') || '#';
            const description = $(item).find('p').text().trim() || 'No description available';

            let rawPublishedDate = description.includes("Published:") ? description.split("Published:").pop().trim() : 'N/A';
            rawPublishedDate = rawPublishedDate.split(' V3.1:')[0].trim(); // Remove CVSS part
            const publishedDate = new Date(rawPublishedDate); // Parse as a Date object

            const cvssScoreElement = $(item).find('span[id^="cvss3-link-"]');
            const cvssScore = cvssScoreElement.text().trim() || 'N/A';

            const cveId = title; // Use title for now, adjust if format changes
            const severity = cvssScore.includes("HIGH") ? "HIGH" : cvssScore.includes("MEDIUM") ? "MEDIUM" : "LOW";

            vulnerabilities.push({
                title,
                link,
                description,
                cvssScore,
                publishedDate,
                cveId,
                severity
            });
        });

        let newVulnerabilities = [];

        // Save only new vulnerabilities
        for (const vuln of vulnerabilities) {
            const exists = await vulnerabilityModel.findOne({ cveId: vuln.cveId });
            if (!exists) {
                const createdVuln = await vulnerabilityModel.create(vuln);
                newVulnerabilities.push(createdVuln); // Add to the list of new vulnerabilities
            }
        }

        // Output and return the new vulnerabilities
        console.log("scraping completed");
        
        return JSON.stringify(newVulnerabilities, null, 4);
    } catch (error) {
        console.error("Error during scraping:", error.message);
        return [];
    }
};
