const express = require('express');

const axios = require('axios');

const path = require('path');

const basicAuth = require('basic-auth'); // <-- Added for basic authentication

const app = express();

const PORT = process.env.PORT || 3000;

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

const USERNAME = 'admin'; // <-- Set username to 'admin'

const PASSWORD = 'admin'; // <-- Set password to 'admin'

// <-- Added authentication middleware

const auth = (req, res, next) => {

  const user = basicAuth(req);

  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {

    res.set('WWW-Authenticate', 'Basic realm="401"');

    res.status(401).send('Authentication required.');

    return;

  }

  next();

};

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

// <-- Added authentication to the '/generate-text' route

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

// <-- Added authentication to the root route

app.get('/', auth, (req, res) => {

  res.sendFile(path.join(__dirname, 'public', 'index.html'));

});

app.listen(PORT, () => {

  console.log(`Server is running on http://localhost:${PORT}`);

});
 
