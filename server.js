const express = require('express');
const axios = require('axios');
const path = require('path');
const basicAuth = require('basic-auth');
const mysql = require('mysql');
const app = express();

const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const USERNAME = process.env.BASIC_AUTH_USERNAME || 'admin';
const PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'admin';

// Configure MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'mydatabase'
});

// Connect to MySQL
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.stack);
    return;
  }
  console.log('Connected to MySQL as id', connection.threadId);
});

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

app.use(auth); // Apply authentication middleware globally
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Endpoint to store prompts in MySQL
app.post('/store-prompt', async (req, res) => {
  const prompt = req.body.prompt;

  try {
    // Store prompt in MySQL database
    const query = 'INSERT INTO prompts (prompt) VALUES (?)';
    connection.query(query, [prompt], (err, result) => {
      if (err) {
        console.error('Error storing prompt:', err);
        res.status(500).json({ error: 'An error occurred while storing prompt.' });
        return;
      }
      console.log('Prompt stored successfully:', result);
      res.status(200).json({ message: 'Prompt stored successfully.' });
    });
  } catch (error) {
    console.error('Error storing prompt:', error);
    res.status(500).json({ error: 'An error occurred while storing prompt.' });
  }
});

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
