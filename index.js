import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeVulnerabilities } from "./controllers/scraperController.cjs";
import mongoose from 'mongoose';
import cors from "cors";
import userRoutes from "./routes/userRoutes.cjs";
import cron from 'node-cron';
import vulnerabilityModel from './models/vulnerabilityModel.cjs';
import { sendEmail } from './services/mail.cjs';

dotenv.config();
const app = express();

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from the Vite-built frontend
app.use(express.static(path.join(__dirname, '../Nexshield_frontend/dist')));

// API route to test JSON response
app.get('/json', (req, res) => {
  res.status(200).json({
    MessageChannel: 'message-channel',
    navigator: 'https',
  });
});

// Connect to MongoDB
const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Server connected to db");
  } catch (error) {
    console.log("DB connection error:", error);
  }
};
connectDb();

// API Routes
app.use('/api', userRoutes);

app.get('/vulnerabilities', async (req, res) => {
  try {
    const vulnerabilities = await vulnerabilityModel.find().sort({ publishedDate: -1 });
    res.json(vulnerabilities);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching vulnerabilities' });
  }
});

// Schedule scraping and email every minute (adjust for prod)
cron.schedule('*/1 * * * *', async () => {
  console.log('Running scraper...');
  const vulnerabilities = await scrapeVulnerabilities();
  await sendEmail(vulnerabilities);
});

// Manual trigger route for email testing
app.get('/test', async (req, res) => {
  await sendEmail();
  res.send('Email sent');
});

// React client-side routing fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../Nexshield_frontend/dist/index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
