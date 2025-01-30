const nodemailer = require('nodemailer');
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const Vulnerability = require('../models/vulnerabilityModel.cjs');
const User = require('../models/userModel.cjs');

// Secure email credentials using environment variables
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,  // Use environment variable
        pass: process.env.EMAIL_PASS   // Use environment variable
    }
});

exports.sendEmail = async () => {
    console.log("Fetching un-sent vulnerabilities...");

    try {
        const vulnerabilities = await Vulnerability.find({ sent: false });
        if (vulnerabilities.length === 0) {
            console.log("No vulnerabilities to send.");
            return;
        }

        const users = await User.find({ notificationReceive: true });

        if (users.length === 0) {
            console.log("No users to send email to.");
            return;
        }

        for (let vulnerability of vulnerabilities) {
            const emailContent = `
                Dear User,

                The following vulnerability has been detected:

                - Title: ${vulnerability.cveId || 'N/A'}
                - Link: ${vulnerability.link || 'N/A'}
                - Description: ${vulnerability.description || 'N/A'}
                - Published Date: ${vulnerability.published_date || 'N/A'}
                - CVSS Score: ${vulnerability.cvss_score || 'N/A'}

                Best regards,
                NEXSHIELD Team
            `;

            // Send emails to relevant users
            const emailPromises = users.map(async (user) => {
                // Keyword filtering logic
                if (
                    user.keywords.length === 0 ||  // Send to users without keywords
                    user.keywords.some(keyword =>
                        (vulnerability.description && vulnerability.description.toLowerCase().includes(keyword.toLowerCase())) ||
                        (vulnerability.cveId && vulnerability.cveId.toLowerCase().includes(keyword.toLowerCase()))
                    )
                ) {
                    try {
                        const info = await transporter.sendMail({
                            from: process.env.EMAIL_USER,
                            to: user.email,
                            subject: 'New Vulnerability Detected',
                            text: emailContent
                        });

                        console.log(`Email sent successfully to ${user.email}:`, info.messageId);
                    } catch (error) {
                        console.error(`Failed to send email to ${user.email}:`, error);
                    }
                }
            });

            await Promise.all(emailPromises);

            vulnerability.sent = true;
            console.log(vulnerabilities)
            await vulnerability.save();
            console.log(`Vulnerability ${vulnerability._id} marked as sent.`);
        }
    } catch (error) {
        console.error("Error fetching vulnerabilities or sending emails:", error);
    }
};
