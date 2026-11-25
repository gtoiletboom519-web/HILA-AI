
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: "الخادم غير مضبوط: أضف GEMINI_API_KEY في إعدادات Render."
      });
    }

    const incoming = req.body?.messages;

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res.status(400).json({
        error: "أرسل رسالة صحيحة أولاً."
      });
    }

    const messages = incoming
      .slice(-30)
      .filter(
        m =>
          m &&
          ["user", "assistant"].includes(m.role) &&
          typeof m.content === "string"
      )
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content.slice(0, 6000) }]
      }));

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return res.status(400).json({
        error: "آخر رسالة لازم تكون من المستخدم."
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      systemInstruction: `
أنت HILA AI، مساعد ذكي.
جاوب بسرعة، بوضوح، وباللغة التي يستعملها المستخدم.
ادعم العربية والدارجة الجزائرية.
لا تطوّل إلا إذا طلب المستخدم التفصيل.
إذا لم تعرف شيئاً، قل ذلك بوضوح.
`
    });

    const history = messages.slice(0, -1);
    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({
      history: history
    });

    const result = await chat.sendMessage(lastMessage.parts[0].text);

    res.json({
      reply: result.response.text() || "لم يصل رد نصي."
    });

  } catch (error) {
    console.error("HILA Gemini error:", error?.message || error);

    res.status(500).json({
      error: "حدث خطأ أثناء الاتصال بـ Gemini. راجع إعدادات الخادم."
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`HILA AI Gemini server listening on ${port}`);
});
