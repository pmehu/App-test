const express = require('express');
const axios = require('axios');
const path = require('path');
const basicAuth = require('basic-auth');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Secret Manager client
const client = new SecretManagerServiceClient();

async function accessSecretVersion(name) {
  const [version] = await client.accessSecretVersion({ name });
  return version.payload.data.toString('utf8');
}

// Fetch secrets from Secret Manager
const USERNAME_SECRET = process.env.USERNAME_SECRET;
const PASSWORD_SECRET = process.env.PASSWORD_SECRET;
const HUGGING_FACE_API_KEY_SECRET = process.env.HUGGING_FACE_API_KEY_SECRET;

let USERNAME, PASSWORD, HUGGING_FACE_API_KEY;

async function fetchSecrets() {
  console.log('Fetching secrets...');
  try {
    USERNAME = await accessSecretVersion(USERNAME_SECRET);
    console.log('Fetched USERNAME');
    PASSWORD = await accessSecretVersion(PASSWORD_SECRET);
    console.log('Fetched PASSWORD');
    HUGGING_FACE_API_KEY = await accessSecretVersion(HUGGING_FACE_API_KEY_SECRET);
    console.log('Fetched HUGGING_FACE_API_KEY');
  } catch (error) {
    console.error('Error fetching secrets:', error);
    throw error;
  }
}

// Authentication middleware
const auth = (req, res, next) => {
  const user = basicAuth(req);
  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Restricted area"');
    res.status(401).send('Authentication required.');
    return;
  }
  next();
};

async function startServer() {
  try {
    await fetchSecrets();

    app.use(auth);
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.json());

    app.post('/generate-text', async (req, res) => {
      const prompt = req.body.prompt;
      try {
        const response = await axios.post(
          'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
          { inputs: prompt },
          { headers: { Authorization: `Bearer ${HUGGING_FACE_API_KEY}` } }
        );
        res.json({ text: response.data[0].generated_text });
      } catch (error) {
        console.error('Error generating text:', error);
        res.status(500).json({ error: 'An error occurred while generating text.' });
      }
    });

    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to fetch secrets or start server:', error);
    process.exit(1); // Exit the process with an error code
  }
}

startServer();
