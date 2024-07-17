const express = require('express');
const axios = require('axios');
const path = require('path');
const { createPool } = require('mysql2/promise'); // Using mysql2/promise for async/await support

const app = express();
const PORT = process.env.PORT || 8080;

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;

// Database connection pool setup for Google Cloud SQL
const pool = createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware to enforce basic authentication
const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="401"');
    return res.status(401).send('Authentication required.');
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  if (!await isValidUser(username, password)) {
    res.set('WWW-Authenticate', 'Basic realm="401"');
    return res.status(401).send('Authentication required.');
  }

  next();
};

// Function to validate user credentials against database (Google Cloud SQL)
const isValidUser = async (username, password) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    return rows.length > 0;
  } catch (error) {
    console.error('Error validating user:', error);
    return false;
  } finally {
    connection.release();
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
    console.error('Error generating text:', error);
    res.status(500).json({ error: 'An error occurred while generating text.' });
  }
});

app.get('/', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
