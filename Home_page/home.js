document.addEventListener("DOMContentLoaded", () => {
  const t = (key) => window.I18N?.t(key) || key;
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const token = localStorage.getItem("token");

  const welcomeText = document.getElementById("welcomeText");
  const logoutBtn = document.getElementById("logoutBtn");

  const sidebar = document.getElementById("sidebar");
  const openSidebar = document.getElementById("openSidebar");
  const closeSidebar = document.getElementById("closeSidebar");

  if (!token || !user) {
    alert(t("login_first"));
    window.location.href = "../index.html";
    return;
  }

  welcomeText.textContent =
    window.I18N?.getLanguage() === "hi" ? `स्वागत है, ${user.name}!` : `Welcome, ${user.name}!`;

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("loggedInUser");
    window.location.href = "../index.html";
  });

  openSidebar.addEventListener("click", () => sidebar.classList.add("active"));
  closeSidebar.addEventListener("click", () => sidebar.classList.remove("active"));
});
