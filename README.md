# HILA AI (Gemini) — Render deployment

## Files
- `index.html` — chat interface (same styling as supplied design)
- `server/index.js` — Express backend; Gemini API key stays server-side
- `package.json` — dependencies and Render start script
- `.env.example` — local environment template

## Render setup
- Create a Web Service from this GitHub repository.
- Build Command: `npm install`
- Start Command: `npm start`
- In Environment, add `GEMINI_API_KEY` (your key from Google AI Studio).
- Optional: set `GEMINI_MODEL` to `gemini-2.5-flash` or another model enabled for your key.
- Do not add `PORT`; Render supplies it.

The frontend and backend are served by the same web service. The frontend uses `/api/chat`, not `localhost`.

## Local setup
1. Copy `.env.example` to `.env` and add your key.
2. Run `npm install`
3. Run `npm start`
4. Visit `http://localhost:3001`

Never commit `.env` or expose the API key in frontend files.
