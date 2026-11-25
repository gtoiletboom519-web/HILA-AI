import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");


app.use(express.json({ limit: "1mb" }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    // Same-origin requests and non-browser clients have no Origin header.
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS"));
  }
}));


const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;
const systemInstruction = `You are HILA AI, a helpful assistant. Reply in the language and style the user uses. If the user writes in Algerian Arabic, answer naturally in Algerian Arabic. Be clear, friendly, and accurate. If you are unsure, say so.`;


app.get("/health", (_req, res) => {
  res.json({ ok: true, model: MODEL, apiKeyConfigured: Boolean(API_KEY) });
});


app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL, apiKeyConfigured: Boolean(API_KEY) });
});


app.post("/api/chat", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "GEMINI_API_KEY غير مضبوط في إعدادات الخادم." });
  }

  const inputMessages = req.body?.messages;
  if (!Array.isArray(inputMessages) || inputMessages.length === 0) {
    return res.status(400).json({ error: "أرسل messages تحتوي على رسالة واحدة على الأقل." });
  }

  const contents = inputMessages.slice(-30).map(message => {
    const role = message?.role === "assistant" ? "model" : "user";
    const text = typeof message?.content === "string" ? message.content.trim() : "";
    return { role, parts: [{ text }] };
  }).filter(item => item.parts[0].text.length > 0);

  if (!contents.length) {
    return res.status(400).json({ error: "الرسائل فارغة." });
  }

  // Gemini conversation history must start with a user turn.
  while (contents.length && contents[0].role !== "user") contents.shift();
  if (!contents.length) {
    return res.status(400).json({ error: "أول رسالة لازم تكون من المستخدم." });
  }

  const retryableStatus = new Set([408, 429, 500, 502, 503, 504]);
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      });
      const reply = result.text?.trim();
      if (!reply) return res.status(502).json({ error: "Gemini رجع رد فارغ. جرّب مرة أخرى." });
      return res.json({ reply });
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || error?.code || 0);
      const shouldRetry = !status || retryableStatus.has(status);
      if (!shouldRetry || attempt === maxAttempts) break;
      await new Promise(resolve => setTimeout(resolve, 700 * attempt));
    }
  }

  const status = Number(lastError?.status || lastError?.code || 0);
  console.error("Gemini API error:", status, lastError?.message || lastError);
  if (status === 401 || status === 403) {
    return res.status(502).json({ error: "مفتاح Gemini غير صحيح أو ما عندوش الصلاحية. راجع GEMINI_API_KEY." });
  }
  if (status === 429 || status === 503) {
    return res.status(503).json({ error: "Gemini راه مشغول أو وصلت لحد الطلبات. استنى شوية وعاود." });
  }
  return res.status(502).json({ error: "تعذر الحصول على رد من Gemini. راجع Logs في Render." });
});


// Serve the front-end from the same Render service, so the UI uses /api/chat.
app.use(express.static(projectRoot));
app.get("/", (_req, res) => res.sendFile(path.join(projectRoot, "index.html")));
app.use((req, res) => res.status(404).json({ error: "المسار غير موجود." }));
app.use((error, _req, res, _next) => {
  console.error("Server error:", error?.message || error);
  res.status(500).json({ error: "خطأ داخلي في الخادم." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`HILA AI server listening on port ${PORT}; model=${MODEL}`);
});
