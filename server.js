const express = require('express');

const axios = require('axios');

const path = require('path');

const basicAuth = require('basic-auth');

const mysql = require('mysql');

const app = express();

const PORT = process.env.PORT || 8080;

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

const DB_HOST = process.env.DB_HOST;

const DB_USER = process.env.DB_USER;

const DB_PASSWORD = process.env.DB_PASSWORD;

const DB_NAME = process.env.DB_NAME;

const connection = mysql.createConnection({

  host: DB_HOST,

  user: DB_USER,

  password: DB_PASSWORD,

  database: DB_NAME

});

connection.connect(err => {

  if (err) {

    console.error('Database connection failed: ' + err.stack);

    return;

  }

  console.log('Connected to database.');

});

const auth = (req, res, next) => {

  const user = basicAuth(req);

  if (!user || !user.name || !user.pass) {

    console.log('No user credentials provided.');

    res.set('WWW-Authenticate', 'Basic realm="401"');

    res.status(401).send('Authentication required.');

    return;

  }

  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';

  console.log(`Authenticating user: ${user.name}`);

  connection.query(query, [user.name, user.pass], (error, results) => {

    if (error) {

      console.error('Database query error:', error);

      res.set('WWW-Authenticate', 'Basic realm="401"');

      res.status(401).send('Authentication required.');

      return;

    }

    if (results.length > 0) {

      console.log('Authentication successful.');

      next();

    } else {

      console.log('Authentication failed.');

      res.set('WWW-Authenticate', 'Basic realm="401"');

      res.status(401).send('Authentication required.');

    }

  });

};

// Apply authentication middleware to all routes

app.use(auth);

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

app.post('/generate-text', async (req, res) => {

  const prompt = req.body.prompt;

  try {

    const response = await axios.post(

      'https://api-inference.huggingface.co/models/gpt2',

      { inputs: prompt },

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

app.get('/', (req, res) => {

  res.sendFile(path.join(__dirname, 'public', 'index.html'));

});

app.listen(PORT, () => {

  console.log(`Server is running on http://localhost:${PORT}`);

});
 
