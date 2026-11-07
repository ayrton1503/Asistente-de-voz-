const SYSTEM =
  "Eres un asistente de tareas por voz para Ayrton. Habla en español, de forma natural y breve " +
  "(1 a 3 frases), sin listas, sin markdown y sin emojis, porque tu respuesta se lee en voz alta. " +
  "Ayúdalo a ordenar sus pendientes en bloques de 1 hora con su hora de inicio, pregunta solo lo mínimo " +
  "necesario y guíalo paso a paso sobre lo que tiene que hacer. No puedes crear alarmas ni notificaciones; " +
  "si te las pide, dilo con claridad.";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(500).json({ error: "Falta la variable GEMINI_API_KEY en Vercel" });
    return;
  }
  try {
    const body = req.body || {};
    let messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    messages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 4000),
    }));
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (!messages.length) {
      res.status(400).json({ error: "Mensaje vacío" });
      return;
    }
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents,
          generationConfig: {
            maxOutputTokens: 800,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );
    const j = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: (j.error && j.error.message) || "Error de la API" });
      return;
    }
    const parts =
      j.candidates && j.candidates[0] && j.candidates[0].content
        ? j.candidates[0].content.parts || []
        : [];
    const reply = parts.map((p) => p.text || "").join("");
    if (!reply) {
      res.status(502).json({ error: "Respuesta vacía" });
      return;
    }
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
