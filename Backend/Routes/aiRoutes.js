const express = require("express");
const router = express.Router();

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

function fallbackPlan(payload) {
  const crop = payload.cropType || "your crop";
  const soil = payload.soilType || "your soil";

  return {
    feedback_analysis: `For ${crop} in ${soil}, start with balanced nutrition and monitor visible stress signals weekly.`,
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
  };
}

router.post("/fertilizer-plan", async (req, res) => {
  const payload = req.body || {};
  const requiredFields = ["fullName", "soilType", "cropType", "feedback", "farmLocation"];
  const missing = requiredFields.filter((field) => !String(payload[field] || "").trim());

  if (missing.length) {
    return res.status(400).json({
      error: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  try {
    const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
    const apiKey = provider === "xai" ? process.env.XAI_API_KEY : process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.json(fallbackPlan(payload));
    }

    const model =
      provider === "xai"
        ? process.env.XAI_MODEL || "grok-2-latest"
        : process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const endpoint =
      provider === "xai"
        ? "https://api.x.ai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
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
`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: "You are a precise JSON-only assistant." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error ${response.status}: ${errorText}`);
    }

    const completion = await response.json();
    const rawText = completion?.choices?.[0]?.message?.content || "";
    const jsonText = extractJsonBlock(rawText);
    if (!jsonText) throw new Error("No JSON returned from model.");

    const parsed = JSON.parse(jsonText);
    const result = {
      feedback_analysis: String(parsed.feedback_analysis || ""),
      usefulness_score: Number(parsed.usefulness_score || 0),
      feasibility_score: Number(parsed.feasibility_score || 0),
      solutions: cleanArray(parsed.solutions),
      fertilizer_plan: {
        recommended_fertilizers: cleanArray(parsed?.fertilizer_plan?.recommended_fertilizers),
        eco_friendly_options: cleanArray(parsed?.fertilizer_plan?.eco_friendly_options),
        available_stock_match: cleanArray(parsed?.fertilizer_plan?.available_stock_match),
      },
    };

    return res.json(result);
  } catch (error) {
    console.error("AI route error:", error.message);
    const fallback = fallbackPlan(payload);
    return res.json({
      ...fallback,
      warning: "Live AI unavailable. Returned fallback recommendation.",
      debug_error: error.message,
    });
  }
});

module.exports = router;
