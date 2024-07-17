const express = require('express');
const axios = require('axios');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

let USERNAME = '';
let PASSWORD = '';

// Function to get credentials from MySQL
async function getCredentials() {
  const connection = await mysql.createConnection({
    host: '34.16.11.198',
    user: 'root',
    password: 'Sathi@1993',
    database: 'demo-gen',
  });

  const [rows, fields] = await connection.execute('SELECT username, password FROM users WHERE id = 1');
  if (rows.length > 0) {
    USERNAME = rows[0].username;
    PASSWORD = rows[0].password;
  }

  await connection.end();
}

// Middleware for basic authentication
const auth = async (req, res, next) => {
  await getCredentials();
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Authentication required.');
    return;
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (username !== USERNAME || password !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Authentication required.');
    return;
  }

  next();
};

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/generate-text', auth, async (req, res) => {
  const prompt = req.body.prompt;

  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/gpt2',
      {
        inputs: prompt,
      },
      {
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
        },
      }
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
