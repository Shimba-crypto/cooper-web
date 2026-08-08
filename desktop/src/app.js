const API_URL = "https://cooper-web.onrender.com";

const statusEl = document.getElementById("status");
const launchBtn = document.getElementById("launch");

async function loadStats() {
  try {
    const res = await fetch(`${API_URL}/api/stats`);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const num = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString() : "–");
    document.getElementById("st-users").textContent = num(data?.users);
    document.getElementById("st-quizzes").textContent = num(data?.quizzes);
    document.getElementById("st-papers").textContent = num(data?.papers);
    document.getElementById("st-results").textContent = num(data?.results);
  } catch {
    /* server unreachable — keep placeholders */
  }
}

launchBtn.addEventListener("click", async () => {
  statusEl.textContent = "Opening CooperWeb…";
  try {
    await window.__TAURI__.core.invoke("open_site");
  } catch {
    statusEl.textContent = "Could not open the site window.";
  }
});

loadStats();
