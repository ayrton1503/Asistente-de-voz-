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
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: "Falta la variable ANTHROPIC_API_KEY en Vercel" });
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
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5",
        max_tokens: 400,
        system: SYSTEM,
        messages,
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: (j.error && j.error.message) || "Error de la API" });
      return;
    }
    const reply = (j.content || []).map((b) => b.text || "").join("");
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
