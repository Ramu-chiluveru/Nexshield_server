const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const vulnerabilityModel = require('../models/vulnerabilityModel.cjs');
require('dotenv').config();

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
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
            { inputs: prompt },
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        // Hugging Face models usually return a text response
        const textOutput = response.data?.[0]?.generated_text || '{}';

        // Try parsing JSON from the text output
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

        latestVulnsArea.find('li').each(async (index, item) => {
            const titleElement = $(item).find('a[id^="cveDetailAnchor-"]');
            const link = "https://nvd.nist.gov" + titleElement.attr('href') || '#';
            const description = $(item).find('p').text().trim() || 'No description available';

            let rawPublishedDate = description.includes("Published:") ? description.split("Published:").pop().trim() : 'N/A';
            rawPublishedDate = rawPublishedDate.split(' V3.1:')[0].trim();
            const publishedDate = new Date(rawPublishedDate);

            const cvssScoreElement = $(item).find('span[id^="cvss3-link-"]');
            const cvssScore = cvssScoreElement.text().trim() || 'N/A';

            const cveId = title;
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

        for (const vuln of vulnerabilities) {
            const exists = await vulnerabilityModel.findOne({ cveId: vuln.cveId });
            if (!exists) {
                // 🔍 Enrich with LLM
                const prompt = createPrompt(vuln.description);
                const llmOutput = await callLLM(prompt);

                const enrichedVuln = {
                    cveId: vuln.cveId,
                    companyName : llmOutput.companyName || "",
                    link : vuln.link,
                    description :llmOutput.summary || "",
                    severity : vuln.severity,
                    publishedDate: publishedDate,
                };

                const createdVuln = await vulnerabilityModel.create(enrichedVuln);
                newVulnerabilities.push(createdVuln);
            }
        }

        console.log("Scraping completed. New vulnerabilities added:", newVulnerabilities.length);
        return JSON.stringify(newVulnerabilities, null, 4);

    } catch (error) {
        console.error("Error during scraping:", error.message);
        return [];
    }
};
