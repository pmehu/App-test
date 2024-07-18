const express = require('express');
const axios = require('axios');
const path = require('path');
const basicAuth = require('basic-auth');
const mysql = require('mysql'); // Use mysql library instead of mysql2
const app = express();

const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const USERNAME = process.env.BASIC_AUTH_USERNAME || 'admin';
const PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'admin';

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

const auth = (req, res, next) => {
  const user = basicAuth(req);

  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Restricted area"');
    res.set('Cache-Control', 'no-store');
    res.status(401).send('Authentication required.');
    return;
  }

  res.set('Cache-Control', 'no-store');
  next();
};

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

    const generatedText = response.data[0].generated_text;

    // Store the prompt and generated text in the database
    const connection = mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME
    });

    connection.connect();

    connection.query(
      'INSERT INTO prompts (user_prompt, generated_text) VALUES (?, ?)',
      [prompt, generatedText],
      (error, results, fields) => {
        if (error) {
          console.error(error);
          res.status(500).json({ error: 'An error occurred while storing data.' });
        } else {
          res.json({ text: generatedText });
        }
      }
    );

    connection.end();
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
