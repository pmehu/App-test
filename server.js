const express = require('express');
const axios = require('axios');
const path = require('path');
const basicAuth = require('basic-auth');
const app = express();
const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const USERNAME = process.env.BASIC_AUTH_USERNAME || 'admin';
const PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'admin';

const auth = (req, res, next) => {
  const user = basicAuth(req);
  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Authentication required.');
    return;
  }
  next();
};

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Apply auth middleware to the root route
app.get('/', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Apply auth middleware to the generate-text endpoint
app.post('/generate-text', auth, async (req, res) => {
  const prompt = req.body.prompt;
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
      { 
        inputs: prompt,
        options: { max_new_tokens: 100 } // Adjust options as needed
      },
      { headers: { Authorization: `Bearer ${HUGGING_FACE_API_KEY}` } }
    );
    res.json({ text: response.data.generated_text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while generating text.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
