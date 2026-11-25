import express from "express";
import OpenAI from "openai";
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
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "الخادم غير مضبوط بعد: أضف OPENAI_API_KEY في إعدادات Environment Variables." });
    }

    const incoming = req.body?.messages;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res.status(400).json({ error: "أرسل رسالة صحيحة أولاً." });
    }

    const messages = incoming.slice(-30)
      .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .map(m => ({ role: m.role, content: m.content.slice(0, 6000) }));

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return res.status(400).json({ error: "آخر رسالة لازم تكون من المستخدم." });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6.2-sol",
      instructions: "أنت HILA AI، مساعد مفيد وواضح. أجب بلغة المستخدم، وادعم العربية والدارجة الجزائرية. إذا لم تعرف شيئاً فقل ذلك بوضوح.",
      input: messages,
      max_output_tokens: 900
    });

    res.json({ reply: response.output_text || "لم يصل رد نصي." });
  } catch (error) {
    console.error("HILA API error:", error?.message || error);
    res.status(500).json({ error: "صار خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي. راجع إعدادات الخادم." });
  }
});

app.listen(port, "0.0.0.0", () => console.log(`HILA AI server listening on ${port}`));
