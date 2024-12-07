const nodemailer = require('nodemailer');
const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();

const Vulnerability = require('../models/vulnerabilityModel.cjs'); 
const User = require('../models/userModel.cjs'); 
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, 
    auth: {
        user: "arunmouli36@gmail.com",
        pass: "yaxmesdnpveghavc"
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
            let emailContent = "Subject: New Vulnerabilities Detected\n\n";
            emailContent += "Dear User,\n\n";
            emailContent += "The following vulnerabilities have been detected:\n\n";
            emailContent += `Title: ${vulnerability.cveId || 'N/A'}\n`;
            emailContent += `Link: ${vulnerability.link || 'N/A'}\n`;
            emailContent += `Description: ${vulnerability.description || 'N/A'}\n`;
            emailContent += `Published Date: ${vulnerability.published_date || 'N/A'}\n`;
            emailContent += `CVSS Score: ${vulnerability.cvss_score || 'N/A'}\n\n`;
            emailContent += "Best regards,\nNEXSHIELD Team";

            for (let user of users) {
                try {
                    let info = await transporter.sendMail({
                        from: "arunmouli36@gmail.com",
                        to: user.email,
                        subject: 'New Vulnerabilities Detected',
                        text: emailContent
                    });

                    console.log(`Email sent successfully to ${user.email}:`, info.messageId);

                    vulnerability.sent = true;
                    await vulnerability.save(); 

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
