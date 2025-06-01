const Vulnerability = require('../models/vulnerabilityModel.cjs');
const User = require('../models/userModel.cjs');
const nodemailer = require('nodemailer'); // Assuming you're using nodemailer
require('dotenv').config();

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendEmail = async () => {
  console.log("Fetching un-sent vulnerabilities...");

  try {
    // Find vulnerabilities not yet sent
    const vulnerabilities = await Vulnerability.find({ sent: false });

    if (vulnerabilities.length === 0) {
      console.log("No vulnerabilities to send.");
      return;
    }

    // Find users who opted to receive notifications
    const allUsers = await User.find({ notificationReceive: true });

    if (allUsers.length === 0) {
      console.log("No users to send email to.");
      return;
    }

    for (let vulnerability of vulnerabilities) {
      const company = vulnerability.companyName?.toLowerCase();

      // Filter eligible users:
      // - User registered BEFORE or AT the vulnerability creation date
      // - User keywords contain the company name (case-insensitive substring match)
      const eligibleUsers = allUsers.filter(user =>
        user.createdAt <= vulnerability.createdAt &&
        company &&
        Array.isArray(user.keywords) &&
        user.keywords.some(keyword => keyword.toLowerCase().includes(company))
      );

      if (eligibleUsers.length === 0) {
        console.log(`No eligible users for vulnerability ${vulnerability.cveId || vulnerability._id}`);
        vulnerability.sent = true;
        await vulnerability.save();
        continue;
      }

      const emailContent = `
Dear User,

A new vulnerability related to ${vulnerability.companyName || 'an organization'} has been detected:

- Title: ${vulnerability.cveId || 'N/A'}
- Link: ${vulnerability.link || 'N/A'}
- Description: ${vulnerability.description || 'N/A'}
- Published Date: ${vulnerability.publishedDate ? vulnerability.publishedDate.toDateString() : 'N/A'}
- Severity: ${vulnerability.severity || 'N/A'}
- Organisation: ${vulnerability.companyName || 'N/A'}

Best regards,
NEXSHIELD Team
      `;

      // Send email to all eligible users concurrently
      const emailPromises = eligibleUsers.map(async (user) => {
        try {
          const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'New Vulnerability Detected',
            text: emailContent,
          });

          console.log(`Email sent to ${user.email}:`, info.messageId);
        } catch (error) {
          console.error(`Failed to send email to ${user.email}:`, error);
        }
      });

      await Promise.all(emailPromises);

      // Mark vulnerability as sent
      vulnerability.sent = true;
      await vulnerability.save();
      console.log(`Vulnerability ${vulnerability._id} marked as sent.`);
    }
  } catch (error) {
    console.error("Error sending emails:", error);
  }
};
