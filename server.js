const express = require('express');

const axios = require('axios');

const path = require('path');

const basicAuth = require('basic-auth');

const mysql = require('mysql2');

const app = express();

const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

const USERNAME = process.env.BASIC_AUTH_USERNAME || 'admin';

const PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'admin';

// MySQL connection configuration

const dbConfig = {

  host: process.env.DB_HOST,

  user: process.env.DB_USER,

  password: process.env.DB_PASSWORD,

  database: process.env.DB_NAME,

};

const connection = mysql.createConnection(dbConfig);

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

app.use(auth); // Apply authentication middleware globally

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

    // Insert prompt and generated text into the database

    const query = 'INSERT INTO prompts (prompt, generated_text) VALUES (?, ?)';

    connection.query(query, [prompt, generatedText], (err, results) => {

      if (err) {

        console.error(err);

        res.status(500).json({ error: 'An error occurred while storing data.' });

        return;

      }

      res.json({ text: generatedText });

    });

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
 
