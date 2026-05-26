const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const secret = process.env.JWT_SECRET;

  if (token && secret) {
    try {
      req.user = jwt.verify(token, secret);
    } catch (_err) {
      req.user = null;
    }
  }

  return next();
}

function cleanArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function extractJsonBlock(text) {
  if (!text) return null;
  const trimmed = String(text).trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return null;
}

function detectResponseLanguageFromText(text) {
  const value = String(text || "").trim();
  if (!value) return null;

  const devanagariMatches = value.match(/[\u0900-\u097F]/g) || [];
  const latinMatches = value.match(/[A-Za-z]/g) || [];
  const devanagariCount = devanagariMatches.length;
  const latinCount = latinMatches.length;

  if (devanagariCount === 0 && latinCount === 0) return null;
  return devanagariCount > latinCount ? "Hindi" : "English";
}

function resolveResponseLanguage(payload) {
  const inputDetected = detectResponseLanguageFromText(payload.feedback);
  if (inputDetected) return inputDetected;
  const requested = String(payload.responseLanguage || "").trim();
  if (requested) return requested;
  return "English";
}

function fallbackPlan(payload) {
  const crop = payload.cropType || "your crop";
  const soil = payload.soilType || "your soil";
  const responseLanguage = resolveResponseLanguage(payload);
  const isHindi = String(responseLanguage).toLowerCase() === "hindi";

  return {
    feedback_analysis: isHindi
      ? `${crop} की फसल और ${soil} मिट्टी के लिए संतुलित पोषण से शुरुआत करें और हर सप्ताह फसल के तनाव के संकेत देखें।`
      : `For ${crop} in ${soil}, start with balanced nutrition and monitor visible stress signals weekly.`,
    usefulness_score: 4,
    feasibility_score: 4,
    solutions: [
      "Run a basic soil test before final fertilizer quantity decisions.",
      "Split nitrogen application into 2-3 rounds instead of one-time use.",
      "Use organic matter (compost/FYM) to improve nutrient retention.",
    ],
    fertilizer_plan: {
      recommended_fertilizers: [
        "NPK 19:19:19 (initial stage, moderate dose)",
        "Urea (split application based on crop age)",
        "Single Super Phosphate (if phosphorus is low)",
      ],
      eco_friendly_options: [
        "Vermicompost",
        "Biofertilizer consortium (Azotobacter/PSB)",
        "Mulching to reduce nutrient loss",
      ],
      available_stock_match: ["Urea", "DAP", "Potash alternatives"],
    },
    response_language: responseLanguage,
    response_speech_lang: isHindi ? "hi-IN" : "en-IN",
  };
}

function getProviderConfig() {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  const isXai = provider === "xai";
  return {
    provider,
    apiKey: isXai ? process.env.XAI_API_KEY : process.env.OPENAI_API_KEY,
    model: isXai
      ? process.env.XAI_MODEL || "grok-2-latest"
      : process.env.OPENAI_MODEL || "gpt-4.1-mini",
    endpoint: isXai
      ? "https://api.x.ai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions",
  };
}

async function callChatModel(prompt, system = "You are a precise JSON-only assistant.") {
  const cfg = getProviderConfig();
  if (!cfg.apiKey) throw new Error("AI API key missing");

  const response = await fetch(cfg.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error ${response.status}: ${errorText}`);
  }

  const completion = await response.json();
  return completion?.choices?.[0]?.message?.content || "";
}

async function generateFertilizerPlan(payload) {
  const requiredFields = ["fullName", "soilType", "cropType", "feedback", "farmLocation"];
  const missing = requiredFields.filter((field) => !String(payload[field] || "").trim());
  if (missing.length) {
    const err = new Error(`Missing required fields: ${missing.join(", ")}`);
    err.status = 400;
    throw err;
  }

  const cfg = getProviderConfig();
  if (!cfg.apiKey) return fallbackPlan(payload);
  const responseLanguage = resolveResponseLanguage(payload);
  const outputInstruction =
    String(responseLanguage).toLowerCase() === "hindi"
      ? "Write every JSON string value in natural Hindi only (Devanagari). Do not use English words or transliteration."
      : "Write every JSON string value in clear English only. Do not include Hindi words.";

  const prompt = `
You are an agriculture AI advisor.
Return ONLY valid JSON with this exact shape:
{
  "feedback_analysis": "string",
  "usefulness_score": 1-5 number,
  "feasibility_score": 1-5 number,
  "solutions": ["string"],
  "fertilizer_plan": {
    "recommended_fertilizers": ["string"],
    "eco_friendly_options": ["string"],
    "available_stock_match": ["string"]
  }
}

Farmer input:
- Name: ${payload.fullName}
- Soil Type: ${payload.soilType}
- Crop Type: ${payload.cropType}
- Feedback: ${payload.feedback}
- Farm Location: ${payload.farmLocation}

Keep recommendations practical for Indian farming conditions and small/medium farms.
Make the response richer and actionable:
- feedback_analysis: 3-4 practical sentences with crop-stage awareness.
- solutions: 5 concise items with field actions.
- fertilizer_plan.recommended_fertilizers: 5 items with timing/split guidance.
- fertilizer_plan.eco_friendly_options: 4 items.
- fertilizer_plan.available_stock_match: 4 realistic market-available matches or substitutions.
Avoid generic wording. Mention nutrient balance, split application, moisture/irrigation timing, and overdose cautions.
${outputInstruction}
`;

  const rawText = await callChatModel(prompt);
  const jsonText = extractJsonBlock(rawText);
  if (!jsonText) throw new Error("No JSON returned from model.");

  const parsed = JSON.parse(jsonText);
  return {
    feedback_analysis: String(parsed.feedback_analysis || ""),
    usefulness_score: Number(parsed.usefulness_score || 0),
    feasibility_score: Number(parsed.feasibility_score || 0),
    solutions: cleanArray(parsed.solutions),
    fertilizer_plan: {
      recommended_fertilizers: cleanArray(parsed?.fertilizer_plan?.recommended_fertilizers),
      eco_friendly_options: cleanArray(parsed?.fertilizer_plan?.eco_friendly_options),
      available_stock_match: cleanArray(parsed?.fertilizer_plan?.available_stock_match),
    },
    response_language: responseLanguage,
    response_speech_lang: String(responseLanguage).toLowerCase() === "hindi" ? "hi-IN" : "en-IN",
  };
}

async function transcribeAudioWithWhisper(audioBase64, mimeType = "audio/webm") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing for transcription");
  if (!audioBase64) throw new Error("Audio payload missing");

  const audioBuffer = Buffer.from(audioBase64, "base64");
  const form = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType });
  form.append("file", blob, "voice-input.webm");
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return {
    transcript: String(data?.text || "").trim(),
    language: data?.language || "unknown",
  };
}

async function localizeResponse(text, targetLanguage = "Hindi") {
  const cfg = getProviderConfig();
  if (!cfg.apiKey || !text) return text;

  const prompt = `Translate the following agriculture guidance into simple ${targetLanguage} spoken by Indian farmers. Return only translated text.\n\n${text}`;
  const translated = await callChatModel(prompt, "You are a precise translator.");
  return String(translated || text).trim();
}

router.post("/fertilizer-plan", optionalAuth, async (req, res) => {
  const payload = req.body || {};

  try {
    const result = await generateFertilizerPlan(payload);
    return res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("AI route error:", error.message);
    const fallback = fallbackPlan(payload);
    return res.json({
      ...fallback,
      warning: "Live AI unavailable. Returned fallback recommendation.",
      debug_error: error.message,
    });
  }
});

router.post("/voice-assistant", optionalAuth, async (req, res) => {
  const payload = req.body || {};

  try {
    const { transcript, language } = await transcribeAudioWithWhisper(
      payload.audioBase64,
      payload.mimeType
    );
    const feedback = transcript || String(payload.fallbackFeedback || "").trim();

    if (!feedback) {
      return res.status(400).json({ error: "No usable speech transcript found." });
    }

    const planPayload = {
      fullName: payload.fullName,
      soilType: payload.soilType,
      cropType: payload.cropType,
      feedback,
      farmLocation: payload.farmLocation,
    };

    const plan = await generateFertilizerPlan(planPayload);
    const targetLanguage = payload.targetLanguage || "Hindi";
    const localized = await localizeResponse(plan.feedback_analysis, targetLanguage);

    return res.json({
      ...plan,
      transcript: feedback,
      detected_language: language,
      local_language_response: localized,
      target_language: targetLanguage,
    });
  } catch (error) {
    console.error("Voice assistant error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
