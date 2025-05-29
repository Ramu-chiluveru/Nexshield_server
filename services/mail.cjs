exports.sendEmail = async () => {
    console.log("Fetching un-sent vulnerabilities...");

    try {
        const vulnerabilities = await Vulnerability.find({ sent: false });

        if (vulnerabilities.length === 0) {
            console.log("No vulnerabilities to send.");
            return;
        }

        const allUsers = await User.find({ notificationReceive: true });

        if (allUsers.length === 0) {
            console.log("No users to send email to.");
            return;
        }

        for (let vulnerability of vulnerabilities) {
            const company = vulnerability.companyName?.toLowerCase();

            // Filter users based on date and keywords containing company name
            const eligibleUsers = allUsers.filter(user =>
                user.createdAt <= vulnerability.publishedDate &&
                company && user.keywords.some(keyword => keyword.toLowerCase() === company)
            );

            if (eligibleUsers.length === 0) {
                console.log(`No eligible users for vulnerability ${vulnerability.cveId}`);
                continue;
            }

            const emailContent = `
                Dear User,

                A new vulnerability related to ${vulnerability.companyName || 'an organization'} has been detected:

                - Title: ${vulnerability.cveId || 'N/A'}
                - Link: ${vulnerability.link || 'N/A'}
                - Description: ${vulnerability.description || 'N/A'}
                - Published Date: ${vulnerability.publishedDate || 'N/A'}
                - Severity: ${vulnerability.severity || 'N/A'}

                Best regards,
                NEXSHIELD Team
            `;

            const emailPromises = eligibleUsers.map(async (user) => {
                try {
                    const info = await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: user.email,
                        subject: 'New Vulnerability Detected',
                        text: emailContent
                    });

                    console.log(`Email sent to ${user.email}:`, info.messageId);
                } catch (error) {
                    console.error(`Failed to send email to ${user.email}:`, error);
                }
            });

            await Promise.all(emailPromises);

            vulnerability.sent = true;
            await vulnerability.save();
            console.log(`Vulnerability ${vulnerability._id} marked as sent.`);
        }
    } catch (error) {
        console.error("Error sending emails:", error);
    }
};
