const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || "";

document.addEventListener("DOMContentLoaded", () => {
  const t = (key) => window.I18N?.t(key) || key;
  const loginEmail = document.getElementById("loginEmail");
  const loginOtpBox = document.getElementById("loginOtpBox");
  const loginOtpInput = document.getElementById("loginOtp");
  const sendLoginOtpBtn = document.getElementById("sendOtpBtn");
  const verifyLoginOtpBtn = document.getElementById("verifyOtpBtn");

  sendLoginOtpBtn.addEventListener("click", async () => {
    if (!loginEmail.value.trim()) {
      alert(t("enter_email"));
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.value.trim() }),
      });

      const data = await res.json();
      alert(data.message || t("request_completed"));

      if (res.ok) {
        loginOtpBox.style.display = "block";
        sendLoginOtpBtn.style.display = "none";
        verifyLoginOtpBtn.style.display = "block";
      }
    } catch (_error) {
      alert(t("backend_unreachable"));
    }
  });

  verifyLoginOtpBtn.addEventListener("click", async () => {
    if (!loginOtpInput.value.trim()) {
      alert(t("enter_otp_short"));
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.value.trim(),
          otp: loginOtpInput.value.trim(),
        }),
      });

      const data = await res.json();
      alert(data.message || t("request_completed"));

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("loggedInUser", JSON.stringify(data.user || {}));
        window.location.href = "./Home_page/home.html";
      }
    } catch (_error) {
      alert(t("backend_unreachable"));
    }
  });
});
