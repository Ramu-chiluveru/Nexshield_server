const nodemailer = require('nodemailer');
const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();

// Models
const Vulnerability = require('../models/vulnerabilityModel.cjs'); // Path to your vulnerability model
const User = require('../models/userModel.cjs'); // Path to your user model

// Set up transporter for nodemailer
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for port 465, false for 587
    auth: {
        user: "arunmouli36@gmail.com",
        pass: "yaxmesdnpveghavc"
    }
});

// Function to send email
exports.sendEmail = async () => {
    console.log("Fetching un-sent vulnerabilities...");

    try {
        // Fetch vulnerabilities where `sent` is false
        const vulnerabilities = await Vulnerability.find({ sent: false });

        if (vulnerabilities.length === 0) {
            console.log("No vulnerabilities to send.");
            return;
        }

        // Fetch users who have opted to receive notifications
        const users = await User.find({ notificationReceive: true });

        if (users.length === 0) {
            console.log("No users to send email to.");
            return;
        }

        // Loop through each vulnerability and send email to each user
        for (let vulnerability of vulnerabilities) {
            let emailContent = "Subject: New Vulnerabilities Detected\n\n";
            emailContent += "Dear User,\n\n";
            emailContent += "The following vulnerabilities have been detected:\n\n";
            emailContent += `Title: ${vulnerability.cveId || 'N/A'}\n`;
            emailContent += `Link: ${vulnerability.link || 'N/A'}\n`;
            emailContent += `Description: ${vulnerability.description || 'N/A'}\n`;
            emailContent += `Published Date: ${vulnerability.published_date || 'N/A'}\n`;
            emailContent += `CVSS Score: ${vulnerability.cvss_score || 'N/A'}\n\n`;
            emailContent += "Best regards,\nNEXSHIELD Team";

            // Loop through each user and send email
            for (let user of users) {
                try {
                    let info = await transporter.sendMail({
                        from: "arunmouli36@gmail.com",
                        to: user.email, // Send email to each user
                        subject: 'New Vulnerabilities Detected',
                        text: emailContent
                    });

                    console.log(`Email sent successfully to ${user.email}:`, info.messageId);

                    // After sending the email, update the `sent` field to true for this vulnerability
                    vulnerability.sent = true;
                    await vulnerability.save(); // Save the updated vulnerability object

                    console.log(`Vulnerability ${vulnerability._id} marked as sent.`);
                } catch (error) {
                    console.error("Error sending email for vulnerability:", vulnerability._id, "to user:", user.email, error);
                }
            }
        }
    } catch (error) {
        console.error("Error fetching vulnerabilities or sending emails:", error);
    }
};
