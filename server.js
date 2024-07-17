const express = require('express');
const axios = require('axios');
const path = require('path');
const mysql = require('mysql');
const basicAuth = require('basic-auth');

const app = express();
const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

const db = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME
});

let cachedCredentials = null;

const getCredentials = () => {
  return new Promise((resolve, reject) => {
    if (cachedCredentials) {
      return resolve(cachedCredentials);
    }

    db.query('SELECT username, password FROM users WHERE id = 1', (err, results) => {
      if (err) return reject(err);

      if (results.length > 0) {
        cachedCredentials = results[0];
        resolve(cachedCredentials);
      } else {
        reject(new Error('No credentials found'));
      }
    });
  });
};

const auth = async (req, res, next) => {
  try {
    const user = basicAuth(req);
    const credentials = await getCredentials();

    if (!user || user.name !== credentials.username || user.pass !== credentials.password) {
      res.set('WWW-Authenticate', 'Basic realm="401"');
      res.status(401).send('Authentication required.');
      return;
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

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

app.get('/', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
