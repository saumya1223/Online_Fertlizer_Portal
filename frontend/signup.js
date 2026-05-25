const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || "";

const fullname = document.getElementById("fullname");
const email = document.getElementById("email");
const phone = document.getElementById("phone");
const address = document.getElementById("address");
const area = document.getElementById("area");
const password = document.getElementById("password");

const otpBox = document.getElementById("signupOtpGroup");
const otpInput = document.getElementById("signupOtp");
const sendOtpBtn = document.getElementById("signupBtn");
const verifyOtpBtn = document.getElementById("verifySignupBtn");
const t = (key) => window.I18N?.t(key) || key;

function validateSignupFields() {
  if (!fullname.value.trim() || !email.value.trim() || !phone.value.trim()) {
    alert(t("fill_required_signup"));
    return false;
  }
  if (password.value.trim().length < 8) {
    alert(t("password_rule"));
    return false;
  }
  return true;
}

sendOtpBtn.addEventListener("click", async () => {
  if (!email.value.trim()) {
    alert(t("enter_email_first"));
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/signup/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value.trim() }),
    });

    const data = await res.json();
    alert(data.message || t("request_completed"));

    if (res.ok) {
      otpBox.style.display = "block";
      sendOtpBtn.style.display = "none";
      verifyOtpBtn.style.display = "block";
    }
  } catch (_error) {
    alert(t("backend_unreachable"));
  }
});

verifyOtpBtn.addEventListener("click", async () => {
  if (!validateSignupFields()) return;
  if (!otpInput.value.trim()) {
    alert(t("enter_otp_short"));
    return;
  }

  const body = {
    name: fullname.value.trim(),
    email: email.value.trim(),
    phone: phone.value.trim(),
    address: address.value.trim(),
    area: area.value.trim(),
    password: password.value,
    otp: otpInput.value.trim(),
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/signup/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    alert(data.message || t("request_completed"));

    if (res.ok) {
      window.location.href = "index.html";
    }
  } catch (_error) {
    alert(t("backend_unreachable"));
  }
});
