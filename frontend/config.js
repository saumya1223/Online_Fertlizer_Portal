(function initAppConfig() {
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";

  window.APP_CONFIG = {
    API_BASE_URL: isLocal ? "http://localhost:5000" : "",
  };
})();
