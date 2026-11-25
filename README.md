# Nva AI Gemini Server

A small Node.js/Express backend that keeps your Gemini API key on the server.

## Deploy on Render

1. Upload these files to a GitHub repository.
2. In Render, create **New + → Web Service** and connect the repository.
3. Set **Build Command** to `npm install`.
4. Set **Start Command** to `npm start`.
5. Add an Environment Variable named `GEMINI_API_KEY` and paste your Gemini API key as its value.
6. Deploy. Render supplies the `PORT` environment variable automatically.

## API

- `GET /` — server status.
- `POST /api/chat` — send a message.

Example request:

```json
{
  "message": "Hello, introduce yourself."
}
```

Example browser JavaScript:

```js
const response = await fetch('https://YOUR-SERVICE.onrender.com/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello!' })
});
const data = await response.json();
console.log(data.answer);
```

Keep the API key in Render Environment Variables. Do not put it in your HTML, GitHub repository, or APK.
