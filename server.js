const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Endpoint to serve HTML with Bootstrap
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gen AI Web App</title>
      <!-- Include Bootstrap CSS -->
      <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
      <!-- Optional: Include custom CSS for your styles -->
      <link href="/styles/custom.css" rel="stylesheet">
    </head>
    <body>
      <div class="container">
        <h1 class="mt-5">Generate Text with Gen AI</h1>
        <form id="generateForm">
          <div class="form-group">
            <label for="prompt">Enter Prompt:</label>
            <textarea class="form-control" id="prompt" name="prompt" rows="3" required></textarea>
          </div>
          <button type="submit" class="btn btn-primary">Generate Text</button>
        </form>
        <div id="output" class="mt-3"></div>
      </div>

      <!-- Include Bootstrap and custom JS -->
      <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.3/dist/umd/popper.min.js"></script>
      <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
      <!-- Include custom JavaScript -->
      <script src="/scripts/custom.js"></script>
    </body>
    </html>
  `);
});

// Endpoint for generating text (you can keep this as is)
app.post('/generate-text', async (req, res) => {
  const prompt = req.body.prompt;

  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/gpt2',
      {
        inputs: prompt,
      },
      {
        headers: {
          Authorization: `Bearer YOUR_HUGGING_FACE_API_KEY`,
        },
      }
    );

    res.json({ text: response.data[0].generated_text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while generating text.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
