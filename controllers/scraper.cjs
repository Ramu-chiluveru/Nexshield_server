const cheerio = require('cheerio');
const mongoose = require('mongoose');
const { InferenceClient } = require('@huggingface/inference');
const vulnerabilityModel = require('../models/vulnerabilityModel.cjs');
require('dotenv').config();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const client = new InferenceClient(process.env.HF_TOKEN);

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

async function callLLM(prompt) {
  try {
    console.log("calling LLM");
    const result = await client.chatCompletion({
      provider: "novita",
      model: "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B",
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const message = result.choices?.[0]?.message?.content || '{}';
    const jsonMatch = message.match(/\{[\s\S]*?\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (err) {
    console.error('HuggingFace Chat error:', err.message || err);
    return {};
  }
}

exports.scraper = async () => {
  console.log("Running vulnerability scraper...");

  try {
    const axios = await import('axios');
    const response = await axios.default.get("https://nvd.nist.gov/");
    const $ = cheerio.load(response.data);

    const latestVulnsArea = $('#latestVulnsArea');
    if (!latestVulnsArea.length) {
      console.log("No vulnerabilities found.");
      return [];
    }

    const vulnerabilities = [];
    const items = latestVulnsArea.find('li');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const titleElement = $(item).find('a[id^="cveDetailAnchor-"]');
      const cveId = titleElement.text().trim();
      const link = "https://nvd.nist.gov" + (titleElement.attr('href') || '#');
      const description = $(item).find('p').text().trim() || 'No description available';

      let rawPublishedDate = 'N/A';
      if (description.includes("Published:")) {
        rawPublishedDate = description.split("Published:").pop().trim().split(' V3.1:')[0].trim();
      }
      const publishedDate = rawPublishedDate !== 'N/A' ? new Date(rawPublishedDate) : null;

      const cvssScoreElement = $(item).find('span[id^="cvss3-link-"]');
      const cvssScore = cvssScoreElement.text().trim() || 'N/A';
      const severity = cvssScore.includes("HIGH") ? "HIGH" :
                       cvssScore.includes("MEDIUM") ? "MEDIUM" : "LOW";

      // Check if already in DB
      const exists = await vulnerabilityModel.findOne({ cveId });
      if (!exists) {
        const prompt = createPrompt(description);
        const llmOutput = await callLLM(prompt);

        const enrichedVuln = {
          cveId,
          companyName: llmOutput.companyName || "N/A",
          link,
          description: llmOutput.summary || description,
          severity,
          publishedDate,
          cvssScore
        };

        const created = await vulnerabilityModel.create(enrichedVuln);
        vulnerabilities.push(created);
        console.log(`✅ Added: ${cveId}`);
      } else {
        console.log(`⚠️ Already exists: ${cveId}`);
      }

      if ((i + 1) % 3 === 0) await sleep(1000);
      else await sleep(350);
    }

    console.log(`Scraping completed. New vulnerabilities added: ${vulnerabilities.length}`);
    return vulnerabilities;

  } catch (error) {
    console.error("Error during scraping:", error.message);
    return [];
  }
};
