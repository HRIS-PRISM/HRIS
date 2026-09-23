// src/apiConfig.js

const PUBLIC_URL = import.meta.env.VITE_API_BASE_URL_PUBLIC;
const LOCAL_URL = import.meta.env.VITE_API_BASE_URL_LOCAL;

// server runs on port 5137 (Vite's default is 5173)
const DEV_PORTS = ['5137', '5173'];
const isViteDevServer =
  typeof window !== 'undefined' && DEV_PORTS.includes(String(window.location.port));

let API_BASE_URL;

if (isViteDevServer) {
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname.startsWith('192.168.')
  ) {
    // LAN / localhost
    API_BASE_URL = LOCAL_URL;
  } else {
    // public
    API_BASE_URL = PUBLIC_URL;
  }
} else {
  // Production (backend) → same-origin works for every host.
  API_BASE_URL = window.location.origin;
}

// Fallback so requests never use literal "undefined" (e.g. missing .env)
if (API_BASE_URL == null || API_BASE_URL === "") {
  API_BASE_URL =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname.startsWith("192.168."))
      ? "http://localhost:5000"
      : window.location.origin;
}

export default API_BASE_URL;