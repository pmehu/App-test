const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Endpoint to serve HTML with Tailwind CSS
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gen AI Web App</title>
      <!-- Include Tailwind CSS -->
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.16/dist/tailwind.min.css" rel="stylesheet">
      <!-- Optional: Include custom CSS for your styles -->
      <link href="/styles/custom.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
      <div class="container mx-auto py-12">
        <h1 class="text-3xl font-bold text-center mb-8">Generate Text with Gen AI</h1>
        <form id="generateForm" class="max-w-md mx-auto">
          <div class="mb-4">
            <label for="prompt" class="block text-sm font-medium text-gray-700">Enter Prompt:</label>
            <textarea class="form-textarea mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" id="prompt" name="prompt" rows="3" required></textarea>
          </div>
          <button type="submit" class="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Generate Text</button>
        </form>
        <div id="output" class="mt-6 text-gray-800"></div>
      </div>

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
