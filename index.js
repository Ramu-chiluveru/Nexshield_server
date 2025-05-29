import express from 'express';
import dotenv from 'dotenv';
import { scrapeVulnerabilities } from "./controllers/scraperController.cjs";
import mongoose from 'mongoose';
import cors from "cors";
import userRoutes from "./routes/userRoutes.cjs";
import cron from 'node-cron';
import vulnerabilityModel from './models/vulnerabilityModel.cjs';
import { sendEmail } from './services/mail.cjs';

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

const data = {
  MessageChannel : 'message-channel',
  navigator : 'https',
};

app.get('/json', (req, res) => {
  console.log('hh')
  res.status(200).json(data); 
});

const connectDb = async () => {
  try {
    console.log(process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Server connected to db"); 
  } catch (error) {
    console.log(error); 
  }
};

connectDb();


app.use('/api', userRoutes);



app.get('/vulnerabilities', async (req, res) => {
  try {
      const vulnerabilities = await vulnerabilityModel.find();
      res.json(vulnerabilities);
  } catch (err) {
      res.status(500).json({ error: 'Error fetching vulnerabilities' });
  }
});

// Scraping Example

// scheduler for every 10 minutes

// cron.schedule('*/10 * * * *', async () => {
//   console.log('Running scraper...');
//   await scrapeVulnerabilities();
// });

// cron.schedule('0 6 * * *', async () => {
//   console.log('Running scraper...');
//   const vulnerabilities = await scrapeVulnerabilities();

//   vulnerabilities.then(data =>
//   {
//     console.log('Vulnerabilities from index: ',data);
//     sendEmail(data);
//   }
//   )
//   .catch(err => console.log('Error: ',err));
// });

cron.schedule('0 6 * * *', async () => {
  console.log('Running scraper...');
  const vulnerabilities = await scrapeVulnerabilities();
  await sendEmail();

});

app.get('/test', async () => {sendEmail()});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
