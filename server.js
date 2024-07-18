require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const axios = require('axios');
const path = require('path');
const basicAuth = require('basic-auth');
const mysql = require('mysql2/promise');
const app = express();

const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const USERNAME = process.env.BASIC_AUTH_USERNAME || 'admin';
const PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'admin';

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

// Middleware for basic authentication
const auth = (req, res, next) => {
  const user = basicAuth(req);

  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Restricted area"');
    res.set('Cache-Control', 'no-store'); // Prevent caching of credentials
    res.status(401).send('Authentication required.');
    return;
  }

  // Prevent caching of authenticated requests
  res.set('Cache-Control', 'no-store');

  // If authentication passes, continue to the next middleware or route handler
  next();
};

// Middleware to serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON bodies
app.use(express.json());

// Route to generate text using Hugging Face API
app.post('/generate-text', async (req, res) => {
  const prompt = req.body.prompt;

  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
      { inputs: prompt },
      { headers: { Authorization: `Bearer ${HUGGING_FACE_API_KEY}` } }
    );

    const generatedText = response.data[0].generated_text;

    // Insert the prompt and generated text into the database
    const connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME
    });

    const [result] = await connection.execute(
      'INSERT INTO prompts (user_prompt, generated_text) VALUES (?, ?)',
      [prompt, generatedText]
    );

    await connection.end();

    res.json({ text: generatedText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while generating text.' });
  }
});

// Route to serve index.html (assuming it's in 'public' directory)
app.get('/', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
