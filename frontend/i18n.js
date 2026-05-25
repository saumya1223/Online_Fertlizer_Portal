(function initI18n() {
  const dictionaries = {
    en: {
      lang_name: "English",
      choose_language: "Language",
      welcome_login: "Welcome, Log In",
      your_email: "Your Email",
      enter_otp: "Enter OTP",
      send_otp: "SEND OTP",
      verify_otp: "VERIFY OTP",
      or: "Or",
      continue_google: "Continue with Google",
      no_account: "Don't have an account?",
      sign_up: "Sign up",
      online_portal: "Online Fertilizer Portal",
      portal_tagline:
        "Welcome to our Online Fertilizer Portal - your one-stop solution for agricultural support, fertilizers, and smart farming help.",
      create_account: "Create an Account",
      full_name: "Full Name",
      email: "Email",
      phone: "Phone",
      address: "Address",
      area_city: "Area / City",
      password: "Password",
      already_account: "Already have an account?",
      login: "Login",
      logout: "Logout",
      home: "Home",
      soil_analysis: "Soil Analysis",
      fertilizer_guide: "Fertilizer Guide",
      weather_advisor: "Weather Advisor",
      soil_info: "Soil Info",
      community: "Community",
      smart_features: "Our Smart Farming Features",
      soil_enrichment: "Soil Enrichment",
      soil_enrichment_desc: "Improve soil nutrients and boost crop yield.",
      fertilizer_guide_desc: "Get crop-based fertilizer recommendations.",
      community_desc: "Connect and learn with other farmers.",
      ai_advisor: "AI Fertilizer Advisor",
      ai_advisor_desc: "Get smart, personalized fertilizer planning using AI.",
      farmer_form_title: "Farmer Feedback Form",
      farmer_form_desc: "Provide your farm details and feedback to receive a personalized fertilizer plan powered by AI.",
      soil_type: "Soil Type",
      crop_type: "Crop Type",
      farmer_feedback: "Farmer Feedback",
      feedback_placeholder: "Describe crop health, issues, observations... (optional if using voice)",
      start_voice: "Start Voice Input",
      speak_last: "Speak Last AI Result",
      voice_tip: "Tip: You can speak in Hindi or English.",
      response_language: "AI Response Language",
      farm_location: "Farm Location",
      submit_feedback: "Submit Feedback",
      login_first: "Please login first!",
      enter_email: "Please enter your email.",
      enter_email_first: "Enter email first.",
      enter_otp_short: "Enter OTP.",
      request_completed: "Request completed.",
      backend_unreachable: "Unable to connect to backend server.",
      fill_required_signup: "Please fill name, email, and phone.",
      password_rule: "Password must be at least 8 characters.",
      submit_need_feedback: "Please type feedback or use voice input before submitting.",
      mic_not_supported: "Speech recognition is not supported. Try Chrome/Edge on desktop or Android.",
      mic_started: "Microphone started. Speak now...",
      listening: "Listening... speak in Hindi or English.",
      no_speech: "Voice input stopped, but no speech was recognized. Please try again.",
      captured: "Voice input stopped. Transcript captured.",
      ai_ready: "AI result ready. Tap 'Speak Last AI Result'.",
    },
    hi: {
      lang_name: "हिंदी",
      choose_language: "भाषा",
      welcome_login: "स्वागत है, लॉग इन करें",
      your_email: "आपका ईमेल",
      enter_otp: "ओटीपी दर्ज करें",
      send_otp: "ओटीपी भेजें",
      verify_otp: "ओटीपी सत्यापित करें",
      or: "या",
      continue_google: "Google से जारी रखें",
      no_account: "क्या आपका खाता नहीं है?",
      sign_up: "साइन अप करें",
      online_portal: "ऑनलाइन उर्वरक पोर्टल",
      portal_tagline:
        "हमारे ऑनलाइन उर्वरक पोर्टल में आपका स्वागत है - कृषि सहायता, उर्वरक और स्मार्ट खेती के लिए एक ही जगह समाधान।",
      create_account: "खाता बनाएं",
      full_name: "पूरा नाम",
      email: "ईमेल",
      phone: "फोन",
      address: "पता",
      area_city: "क्षेत्र / शहर",
      password: "पासवर्ड",
      already_account: "क्या आपका पहले से खाता है?",
      login: "लॉग इन",
      logout: "लॉग आउट",
      home: "होम",
      soil_analysis: "मिट्टी विश्लेषण",
      fertilizer_guide: "उर्वरक गाइड",
      weather_advisor: "मौसम सलाह",
      soil_info: "मिट्टी जानकारी",
      community: "समुदाय",
      smart_features: "हमारी स्मार्ट खेती सुविधाएं",
      soil_enrichment: "मिट्टी समृद्धि",
      soil_enrichment_desc: "मिट्टी के पोषक तत्व बढ़ाएं और फसल उत्पादन बढ़ाएं।",
      fertilizer_guide_desc: "फसल के अनुसार उर्वरक की सिफारिशें प्राप्त करें।",
      community_desc: "अन्य किसानों से जुड़ें और सीखें।",
      ai_advisor: "एआई उर्वरक सलाहकार",
      ai_advisor_desc: "एआई की मदद से स्मार्ट और व्यक्तिगत उर्वरक योजना पाएं।",
      farmer_form_title: "किसान फीडबैक फॉर्म",
      farmer_form_desc: "अपनी खेती की जानकारी और फीडबैक दें ताकि एआई आधारित उर्वरक योजना मिल सके।",
      soil_type: "मिट्टी का प्रकार",
      crop_type: "फसल का प्रकार",
      farmer_feedback: "किसान फीडबैक",
      feedback_placeholder: "फसल की स्थिति, समस्याएं और अवलोकन लिखें... (आवाज देने पर वैकल्पिक)",
      start_voice: "आवाज से इनपुट शुरू करें",
      speak_last: "पिछला एआई परिणाम सुनें",
      voice_tip: "सुझाव: आप हिंदी या अंग्रेजी में बोल सकते हैं।",
      response_language: "एआई उत्तर भाषा",
      farm_location: "खेत का स्थान",
      submit_feedback: "फीडबैक जमा करें",
      login_first: "कृपया पहले लॉग इन करें!",
      enter_email: "कृपया अपना ईमेल दर्ज करें।",
      enter_email_first: "पहले ईमेल दर्ज करें।",
      enter_otp_short: "ओटीपी दर्ज करें।",
      request_completed: "अनुरोध पूरा हुआ।",
      backend_unreachable: "बैकएंड सर्वर से कनेक्ट नहीं हो सका।",
      fill_required_signup: "कृपया नाम, ईमेल और फोन भरें।",
      password_rule: "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।",
      submit_need_feedback: "सबमिट करने से पहले फीडबैक टाइप करें या आवाज का उपयोग करें।",
      mic_not_supported: "स्पीच रिकग्निशन समर्थित नहीं है। Chrome/Edge का उपयोग करें।",
      mic_started: "माइक्रोफोन शुरू हो गया। अब बोलें...",
      listening: "सुन रहे हैं... हिंदी या अंग्रेजी में बोलें।",
      no_speech: "आवाज बंद हुई, लेकिन कोई शब्द पहचाना नहीं गया। कृपया फिर से कोशिश करें।",
      captured: "आवाज इनपुट बंद हुआ। ट्रांसक्रिप्ट मिल गया।",
      ai_ready: "एआई परिणाम तैयार है। 'पिछला एआई परिणाम सुनें' दबाएं।",
    },
  };

  function getLanguage() {
    const stored = localStorage.getItem("siteLanguage");
    return stored === "hi" ? "hi" : "en";
  }

  function setLanguage(lang) {
    const normalized = lang === "hi" ? "hi" : "en";
    localStorage.setItem("siteLanguage", normalized);
    applyTranslations();
  }

  function t(key) {
    const lang = getLanguage();
    return dictionaries[lang][key] || dictionaries.en[key] || key;
  }

  function applyTranslations() {
    document.documentElement.lang = getLanguage() === "hi" ? "hi" : "en";

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      node.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const key = node.getAttribute("data-i18n-placeholder");
      node.setAttribute("placeholder", t(key));
    });

    document.querySelectorAll("[data-i18n-value]").forEach((node) => {
      const key = node.getAttribute("data-i18n-value");
      node.setAttribute("value", t(key));
    });

    document.querySelectorAll("[data-language-selector]").forEach((node) => {
      node.value = getLanguage();
    });
  }

  function wireLanguageSelectors() {
    document.querySelectorAll("[data-language-selector]").forEach((selector) => {
      selector.addEventListener("change", (event) => {
        setLanguage(event.target.value);
      });
      selector.value = getLanguage();
    });
  }

  window.I18N = { t, getLanguage, setLanguage, applyTranslations };

  document.addEventListener("DOMContentLoaded", () => {
    wireLanguageSelectors();
    applyTranslations();
  });
})();
