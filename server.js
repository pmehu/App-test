const express = require('express');
const axios = require('axios');
const path = require('path');
const basicAuth = require('basic-auth');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const app = express();
const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run
const USERNAME_SECRET_NAME = 'projects/my-money-428813/secrets/basic-auth-username/versions/latest';
const PASSWORD_SECRET_NAME = 'projects/my-money-428813/secrets/basic-auth-password/versions/latest';
const HUGGING_FACE_API_KEY_SECRET_NAME = 'projects/my-money-428813/secrets/hugging-face-api-key/versions/latest';
const auth = async (req, res, next) => {
 try {
   const user = basicAuth(req);
   if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
     res.set('WWW-Authenticate', 'Basic realm="Restricted area"');
     res.status(401).send('Authentication required.');
     return;
   }
   // If authentication passes, continue to the next middleware or route handler
   next();
 } catch (error) {
   console.error('Error during authentication:', error);
   res.status(500).send('Internal Server Error');
 }
};
// Fetch secrets from Google Secret Manager
const client = new SecretManagerServiceClient();
async function accessSecret(secretName) {
 const [version] = await client.accessSecretVersion({
   name: secretName,
 });
 return version.payload.data.toString();
}
(async () => {
 try {
   const [username, password, huggingFaceApiKey] = await Promise.all([
     accessSecret(USERNAME_SECRET_NAME),
     accessSecret(PASSWORD_SECRET_NAME),
     accessSecret(HUGGING_FACE_API_KEY_SECRET_NAME),
   ]);
   // Start the server after fetching secrets
   app.use(auth); // Apply authentication middleware globally
   app.use(express.static(path.join(__dirname, 'public')));
   app.use(express.json());
   app.post('/generate-text', async (req, res) => {
     const prompt = req.body.prompt;
     try {
       const response = await axios.post(
         'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
         { inputs: prompt },
         { headers: { Authorization: `Bearer ${huggingFaceApiKey}` } }
       );
       res.json({ text: response.data[0].generated_text });
     } catch (error) {
       console.error('Error generating text:', error);
       res.status(500).json({ error: 'An error occurred while generating text.' });
     }
   });
   app.get('/', (req, res) => {
     res.sendFile(path.join(__dirname, 'public', 'index.html'));
   });
   app.listen(PORT, () => {
     console.log(`Server is running on http://localhost:${PORT}`);
   });
 } catch (error) {
   console.error('Error fetching secrets:', error);
 }
})();
