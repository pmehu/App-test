const express = require('express');
const axios = require('axios');
const path = require('path');
const basicAuth = require('express-basic-auth'); // Use express-basic-auth middleware
const app = express();

const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

const users = {}; // Define users for basic authentication
users[process.env.BASIC_AUTH_USERNAME || 'admin'] = process.env.BASIC_AUTH_PASSWORD || 'admin';

// Authentication middleware
app.use(basicAuth({
  users,
  challenge: true, // Respond with 401 Unauthorized immediately
}));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint for generating text
app.post('/generate-text', async (req, res) => {
  const prompt = req.body.prompt;
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/gpt2',
      { inputs: prompt },
      { headers: { Authorization: `Bearer ${HUGGING_FACE_API_KEY}` } }
    );
    res.json({ text: response.data.generated_text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while generating text.' });
  }
});

// Serve the index.html file for the root URL '/'
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
