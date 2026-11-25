const express = require('express');
const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.json({ status: 'ok', name: 'Nva AI Gemini Server' });
});

app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      return res.status(400).json({ error: 'Please provide a message.' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API request failed.' });
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('') || 'No response was returned.';

    res.json({ answer });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Nva AI server listening on port ${port}`);
});
