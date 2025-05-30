const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const vulnerabilityModel = require('../models/vulnerabilityModel.cjs');
require('dotenv').config();

// Utility sleep function
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to prepare LLM prompt
const createPrompt = (description) => `
You are a cybersecurity assistant helping extract structured fields from vulnerability descriptions.

Input:
"${description}"

Output as JSON:
{
  "companyName": "<Company or vendor name>",
  "summary": "<A concise summary of the vulnerability>"
}
`;

// Function to call HuggingFace API with LLM
async function callLLM(prompt) {
    try {
        const response = axios.post(
    'https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct',
    { inputs: prompt },
    {
        headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/json'
        }
    }
    ).then(res => {
        console.log(res.data);
    }).catch(err => {
        console.error("HuggingFace error:", err.response?.data || err.message);
    });


        const textOutput = response.data?.choices?.[0]?.text || '{}';
        const match = textOutput.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : {};
    } catch (err) {
        console.error("LLM API error:", err.message);
        return {};
    }
}


exports.scraper = async () => {
    console.log("Running vulnerability scraper...");

    try {
        const response = await axios.get("https://nvd.nist.gov/");
        const $ = cheerio.load(response.data);

        const latestVulnsArea = $('#latestVulnsArea');
        if (!latestVulnsArea.length) {
            console.log("No vulnerabilities found.");
            return [];
        }

        let vulnerabilities = [];

        latestVulnsArea.find('li').each((index, item) => {
            const titleElement = $(item).find('a[id^="cveDetailAnchor-"]');
            const link = "https://nvd.nist.gov" + titleElement.attr('href') || '#';
            const description = $(item).find('p').text().trim() || 'No description available';

            let rawPublishedDate = description.includes("Published:") ? description.split("Published:").pop().trim() : 'N/A';
            rawPublishedDate = rawPublishedDate.split(' V3.1:')[0].trim();
            const publishedDate = new Date(rawPublishedDate);

            const cvssScoreElement = $(item).find('span[id^="cvss3-link-"]');
            const cvssScore = cvssScoreElement.text().trim() || 'N/A';

            const cveId = titleElement.text().trim();
            const severity = cvssScore.includes("HIGH") ? "HIGH" :
                             cvssScore.includes("MEDIUM") ? "MEDIUM" : "LOW";

            vulnerabilities.push({
                link,
                description,
                cvssScore,
                publishedDate,
                cveId,
                severity
            });
        });

        let newVulnerabilities = [];

        // Filter out already existing entries first to reduce LLM calls
        let filteredVulnerabilities = [];
        for (const vuln of vulnerabilities) {
            const exists = await vulnerabilityModel.findOne({ cveId: vuln.cveId });
            if (!exists) filteredVulnerabilities.push(vuln);
        }

        for (let i = 0; i < filteredVulnerabilities.length; i++) {
            const vuln = filteredVulnerabilities[i];

            // ⏱ Rate limiting: 3 requests per second
            if (i > 0 && i % 3 === 0) {
                await sleep(1000); // wait 1 second every 3 requests
            }

            const prompt = createPrompt(vuln.description);
            const llmOutput = await callLLM(prompt);

            const enrichedVuln = {
                cveId: vuln.cveId,
                companyName: llmOutput.companyName || "N/A",
                link: vuln.link,
                description: llmOutput.summary || vuln.description,
                severity: vuln.severity,
                publishedDate: vuln.publishedDate,
            };

            const createdVuln = await vulnerabilityModel.create(enrichedVuln);
            newVulnerabilities.push(createdVuln);
        }

        console.log("Scraping completed. New vulnerabilities added:", newVulnerabilities.length);
        return JSON.stringify(newVulnerabilities, null, 4);

    } catch (error) {
        console.error("Error during scraping:", error.message);
        return [];
    }
};
