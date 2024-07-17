const express = require('express');

const axios = require('axios');

const path = require('path');

const basicAuth = require('basic-auth');

const mysql = require('mysql2/promise'); // Using mysql2/promise for async/await support

const app = express();

const PORT = process.env.PORT || 8080;

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

const DB_HOST = process.env.DB_HOST;

const DB_USER = process.env.DB_USER;

const DB_PASSWORD = process.env.DB_PASSWORD;

const DB_NAME = process.env.DB_NAME;

// Create a MySQL connection pool

const pool = mysql.createPool({

  host: DB_HOST,

  user: DB_USER,

  password: DB_PASSWORD,

  database: DB_NAME,

  waitForConnections: true,

  connectionLimit: 10,

  queueLimit: 0

});

// Middleware to authenticate requests

const auth = async (req, res, next) => {

  const user = basicAuth(req);

  if (!user || !user.name || !user.pass) {

    res.set('WWW-Authenticate', 'Basic realm="401"');

    return res.status(401).send('Authentication required.');

  }

  try {

    // Query to fetch user details based on username

    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [user.name]);

    if (rows.length === 0 || rows[0].password !== user.pass) {

      res.set('WWW-Authenticate', 'Basic realm="401"');

      return res.status(401).send('Wrong username or password.');

    }

    // If authentication succeeds, proceed to the next middleware (or route handler)

    next();

  } catch (error) {

    console.error('Error during authentication:', error);

    res.status(500).send('Internal Server Error');

  }

};

// Serve static files and parse JSON bodies

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

// Route to generate text based on prompt

app.post('/generate-text', auth, async (req, res) => {

  const prompt = req.body.prompt;

  try {

    // Example call to Hugging Face API

    const response = await axios.post(

      'https://api-inference.huggingface.co/models/gpt2',

      { inputs: prompt },

      {

        headers: {

          Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,

        },

      }

    );

    if (response.data && response.data.length > 0 && response.data[0].generated_text) {

      res.json({ text: response.data[0].generated_text });

    } else {

      res.status(500).json({ error: 'Unexpected response format from Hugging Face API.' });

    }

  } catch (error) {

    console.error('Error generating text:', error);

    res.status(500).json({ error: 'An error occurred while generating text.' });

  }

});

// Route to serve index.html

app.get('/', auth, (req, res) => {

  res.sendFile(path.join(__dirname, 'public', 'index.html'));

});

// Start the server

app.listen(PORT, () => {

  console.log(`Server is running on http://localhost:${PORT}`);

});
 
