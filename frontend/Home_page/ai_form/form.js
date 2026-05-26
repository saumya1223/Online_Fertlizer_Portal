const API_BASE = window.APP_CONFIG?.API_BASE_URL || "";
const PLAN_API_URL = `${API_BASE}/api/ai/fertilizer-plan`;
const t = (key) => window.I18N?.t(key) || key;

let recognition = null;
let isRecording = false;
let lastSpeakText = "";
let lastSpeakLang = "hi-IN";
let voiceFinalTranscript = "";
let voiceInterimTranscript = "";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function toList(items) {
  if (!Array.isArray(items) || !items.length) return "<li>No items available</li>";
  return items.map((item) => `<li>${item}</li>`).join("");
}

function buildResultHtml(aiResult) {
  const solutions = aiResult.solutions || [];
  const plan = aiResult.fertilizer_plan || {};
  const isHindi = String(aiResult.response_language || "").toLowerCase() === "hindi";

  const labels = isHindi
    ? {
        title: "विश्लेषण पूरा हुआ",
        copy: "योजना कॉपी करें",
        summary: "सारांश",
        usefulness: "उपयोगिता",
        feasibility: "व्यवहार्यता",
        topSolutions: "मुख्य पर्यावरण-अनुकूल समाधान",
        recommended: "अनुशंसित उर्वरक",
        eco: "इको-फ्रेंडली विकल्प",
        stock: "उपलब्ध स्टॉक मिलान",
        noSummary: "कोई सारांश उपलब्ध नहीं",
        noStock: "कोई मिलान स्टॉक नहीं मिला",
      }
    : {
        title: "Analysis Complete",
        copy: "Copy Plan",
        summary: "Summary",
        usefulness: "Usefulness",
        feasibility: "Feasibility",
        topSolutions: "Top Eco-Friendly Solutions",
        recommended: "Recommended Fertilizers",
        eco: "Eco-Friendly Alternatives",
        stock: "Stock Availability Match",
        noSummary: "No summary available",
        noStock: "No matching stock found",
      };

  return `
    <div class="result-header">
      <h3 class="results-title">${labels.title}</h3>
      <button id="copyPlanBtn" class="secondary-btn" type="button">${labels.copy}</button>
    </div>
    <p><strong>${labels.summary}:</strong> ${aiResult.feedback_analysis || labels.noSummary}</p>
    <p><strong>${labels.usefulness}:</strong> ${aiResult.usefulness_score || "N/A"} / 5 | <strong>${labels.feasibility}:</strong> ${aiResult.feasibility_score || "N/A"} / 5</p>

    <h4>${labels.topSolutions}</h4>
    <ul>${toList(solutions)}</ul>

    <h4>${labels.recommended}</h4>
    <ul>${toList(plan.recommended_fertilizers)}</ul>

    <h4>${labels.eco}</h4>
    <ul>${toList(plan.eco_friendly_options)}</ul>

    <h4>${labels.stock}</h4>
    <p>${(plan.available_stock_match || []).join(", ") || labels.noStock}</p>
  `;
}

function attachCopyHandler(resultText) {
  const copyBtn = document.getElementById("copyPlanBtn");
  if (!copyBtn) return;
  copyBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(resultText);
    copyBtn.textContent = "Copied";
    setTimeout(() => {
      copyBtn.textContent = "Copy Plan";
    }, 1500);
  });
}

function setVoiceStatus(text) {
  const node = document.getElementById("voiceStatus");
  if (node) node.textContent = text;
}

function getSelectedResponseLanguage() {
  return document.getElementById("responseLanguage")?.value || "Hindi";
}

function getSpeechLangFromSelection() {
  return getSelectedResponseLanguage() === "English" ? "en-IN" : "hi-IN";
}

function speakText(text) {
  if (!text) return;
  if (!("speechSynthesis" in window)) {
    setVoiceStatus(t("mic_not_supported"));
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lastSpeakLang;
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function initRecognition() {
  const SpeechRecognitionImpl = getSpeechRecognition();
  if (!SpeechRecognitionImpl) return null;

  const sr = new SpeechRecognitionImpl();
  sr.lang = "hi-IN";
  sr.continuous = false;
  sr.interimResults = true;
  sr.maxAlternatives = 1;

  sr.onstart = () => {
    setVoiceStatus(t("mic_started"));
  };

  sr.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = event.results[i][0].transcript || "";
      if (event.results[i].isFinal) finalText += transcript + " ";
      else interim += transcript;
    }

    if (finalText.trim()) {
      voiceFinalTranscript = `${voiceFinalTranscript} ${finalText}`.trim();
    }
    voiceInterimTranscript = interim.trim();

    const feedback = document.getElementById("feedback");
    if (feedback) {
      feedback.value = `${voiceFinalTranscript} ${voiceInterimTranscript}`.trim();
      if (interim) setVoiceStatus(`Listening: ${interim}`);
    }
  };

  sr.onerror = (event) => {
    const errorMap = {
      "not-allowed": t("mic_not_supported"),
      "service-not-allowed": t("mic_not_supported"),
      network: "Network issue during speech recognition. Check internet and try again.",
      "no-speech": t("no_speech"),
      "audio-capture": "No microphone detected. Please connect/enable microphone.",
    };
    setVoiceStatus(errorMap[event.error] || `Voice input error: ${event.error}`);
  };

  sr.onend = () => {
    if (isRecording) {
      isRecording = false;
      document.getElementById("micBtn").textContent = t("start_voice");
      voiceFinalTranscript = `${voiceFinalTranscript} ${voiceInterimTranscript}`.trim();
      voiceInterimTranscript = "";
      const feedback = document.getElementById("feedback");
      if (feedback) feedback.value = voiceFinalTranscript;
      if (voiceFinalTranscript) {
        setVoiceStatus(t("captured"));
      } else {
        setVoiceStatus(t("no_speech"));
      }
    }
  };

  return sr;
}

function toggleVoiceRecording() {
  const micBtn = document.getElementById("micBtn");
  if (!recognition) {
    setVoiceStatus(t("mic_not_supported"));
    return;
  }

  if (!isRecording) {
    voiceFinalTranscript = "";
    voiceInterimTranscript = "";
    try {
      recognition.lang = "hi-IN";
      recognition.start();
      isRecording = true;
      micBtn.textContent = "Stop";
      setVoiceStatus(t("listening"));
    } catch (error) {
      setVoiceStatus(`Could not start voice input: ${error.message}`);
    }
    return;
  }

  recognition.stop();
  isRecording = false;
  micBtn.textContent = t("start_voice");
  setVoiceStatus(t("captured"));
}

document.getElementById("micBtn").addEventListener("click", () => {
  toggleVoiceRecording();
});

document.getElementById("feedback").addEventListener("input", () => {
  const feedbackValue = document.getElementById("feedback").value.trim();
  if (feedbackValue) {
    const hasHindi = /[\u0900-\u097F]/.test(feedbackValue);
    const responseLanguage = document.getElementById("responseLanguage");
    if (responseLanguage) responseLanguage.value = hasHindi ? "Hindi" : "English";
    setVoiceStatus("Feedback captured. You can submit now.");
  }
});

document.getElementById("speakBtn").addEventListener("click", () => {
  speakText(lastSpeakText);
});

document.getElementById("dynamicForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.target;
  const resultsDisplay = document.getElementById("resultsDisplay");
  const submitBtn = document.getElementById("submitBtn");

  const feedbackFieldText = form.elements["Feedback"].value.trim();
  const feedbackText =
    feedbackFieldText || `${voiceFinalTranscript} ${voiceInterimTranscript}`.trim();
  if (!feedbackText) {
    const msg = t("submit_need_feedback");
    setVoiceStatus(msg);
    resultsDisplay.innerHTML = `<p class="error-message">${msg}</p>`;
    resultsDisplay.classList.add("error-message");
    return;
  }
  form.elements["Feedback"].value = feedbackText;

  const payload = {
    fullName: form.elements["Full Name"].value.trim(),
    soilType: form.elements["Soil Type"].value.trim(),
    cropType: form.elements["Crop Type"].value.trim(),
    feedback: feedbackText,
    farmLocation: form.elements["Farm Location"].value.trim(),
    responseLanguage: getSelectedResponseLanguage(),
  };

  submitBtn.disabled = true;
  resultsDisplay.classList.remove("error-message");
  resultsDisplay.innerHTML = `
    <div class="loading-box">
      <h3>Processing Request</h3>
      <p>Step 1/3: Reading farm details...</p>
      <p>Step 2/3: Generating fertilizer strategy...</p>
      <p>Step 3/3: Preparing practical recommendations...</p>
    </div>
  `;

  try {
    const response = await fetch(PLAN_API_URL, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const aiResult = await response.json();
    if (!response.ok) {
      throw new Error(aiResult.error || `HTTP Error ${response.status}`);
    }

    resultsDisplay.innerHTML = buildResultHtml(aiResult);
    attachCopyHandler(JSON.stringify(aiResult, null, 2));

    lastSpeakText = aiResult.feedback_analysis || "";
    lastSpeakLang = aiResult.response_speech_lang || getSpeechLangFromSelection();
    document.getElementById("speakBtn").disabled = !lastSpeakText;
    setVoiceStatus(t("ai_ready"));
  } catch (error) {
    console.error("AI Error:", error);
    resultsDisplay.innerHTML = `<p class="error-message">Unable to fetch AI plan: ${error.message}</p>`;
    resultsDisplay.classList.add("error-message");
  } finally {
    submitBtn.disabled = false;
  }
});

recognition = initRecognition();
