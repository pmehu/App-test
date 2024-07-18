const express = require('express');
const axios = require('axios');
const path = require('path');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const app = express();

const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run

const auth = async (req, res, next) => {
  try {
    const [basicAuthUsername] = await getSecret('BASIC_AUTH_USERNAME');
    const [basicAuthPassword] = await getSecret('BASIC_AUTH_PASSWORD');
    const [huggingFaceApiKey] = await getSecret('HUGGING_FACE_API_KEY');

    const user = basicAuth(req);

    if (!user || user.name !== basicAuthUsername || user.pass !== basicAuthPassword) {
      res.set('WWW-Authenticate', 'Basic realm="Restricted area"');
      res.set('Cache-Control', 'no-store'); // Prevent caching of credentials
      res.status(401).send('Authentication required.');
      return;
    }

    // Prevent caching of authenticated requests
    res.set('Cache-Control', 'no-store');

    // If authentication passes, continue to the next middleware or route handler
    req.huggingFaceApiKey = huggingFaceApiKey;
    next();
  } catch (err) {
    console.error('Error fetching secrets:', err);
    res.status(500).send('Error fetching secrets.');
  }
};

app.use(auth); // Apply authentication middleware globally
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/generate-text', async (req, res) => {
  const prompt = req.body.prompt;

  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
      { inputs: prompt },
      { headers: { Authorization: `Bearer ${req.huggingFaceApiKey}` } }
    );

    res.json({ text: response.data[0].generated_text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while generating text.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

async function getSecret(secretName) {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/${secretName}/versions/latest`,
  });

  return [version.payload.data.toString()];
}
