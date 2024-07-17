const express = require('express');
const axios = require('axios');
const path = require('path');
const basicAuth = require('basic-auth');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const USERNAME = process.env.BASIC_AUTH_USERNAME || 'admin';
const PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'admin';

// Middleware for basic authentication
const auth = (req, res, next) => {
  const user = basicAuth(req);

  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Authentication required.');
    return;
  }

  next();
};

// Middleware and routes setup
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Example POST route requiring authentication
app.post('/generate-text', auth, async (req, res) => {
  const prompt = req.body.prompt;

  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/gpt2',
      { inputs: prompt },
      { headers: { Authorization: `Bearer ${HUGGING_FACE_API_KEY}` } }
    );

    res.json({ text: response.data[0].generated_text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while generating text.' });
  }
});

// Example GET route requiring authentication
app.get('/', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
