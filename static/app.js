/* =====================================================
   Iris Classifier — Frontend Logic
   ===================================================== */

// ─── Slider config ───────────────────────────────────
const SLIDERS = [
  { id: "sepal_length", min: 4.3, max: 7.9 },
  { id: "sepal_width",  min: 2.0, max: 4.4 },
  { id: "petal_length", min: 1.0, max: 6.9 },
  { id: "petal_width",  min: 0.1, max: 2.5 },
];

// ─── Quick presets (representative Iris values) ──────
const PRESETS = {
  setosa:     { sepal_length: 5.1, sepal_width: 3.5, petal_length: 1.4, petal_width: 0.2 },
  versicolor: { sepal_length: 5.9, sepal_width: 2.8, petal_length: 4.2, petal_width: 1.3 },
  virginica:  { sepal_length: 6.7, sepal_width: 3.1, petal_length: 5.6, petal_width: 2.4 },
};

// ─── Species slug map ────────────────────────────────
const SPECIES_SLUG = {
  "Iris-setosa":     "setosa",
  "Iris-versicolor": "versicolor",
  "Iris-virginica":  "virginica",
};

// ─── Species SVG icons ───────────────────────────────
function getSpeciesSVG(slug) {
  const colors = {
    setosa:     ["#c4b5fd", "#7c3aed", "#a78bfa"],
    versicolor: ["#6ee7b7", "#059669", "#34d399"],
    virginica:  ["#93c5fd", "#2563eb", "#60a5fa"],
  };
  const [light, dark, mid] = colors[slug] || colors.setosa;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" width="90" height="90">
    <circle cx="50" cy="50" r="46" fill="${dark}" opacity="0.12"/>
    <ellipse cx="50" cy="22" rx="10" ry="20" fill="${light}" opacity="0.9" transform="rotate(0 50 50)"/>
    <ellipse cx="50" cy="22" rx="10" ry="20" fill="${mid}"   opacity="0.75" transform="rotate(72 50 50)"/>
    <ellipse cx="50" cy="22" rx="10" ry="20" fill="${light}" opacity="0.85" transform="rotate(144 50 50)"/>
    <ellipse cx="50" cy="22" rx="10" ry="20" fill="${mid}"   opacity="0.75" transform="rotate(216 50 50)"/>
    <ellipse cx="50" cy="22" rx="10" ry="20" fill="${light}" opacity="0.85" transform="rotate(288 50 50)"/>
    <circle cx="50" cy="50" r="11" fill="#fde68a"/>
    <circle cx="50" cy="50" r="7"  fill="#f59e0b"/>
  </svg>`;
}

// ─── Init sliders ────────────────────────────────────
function initSliders() {
  SLIDERS.forEach(({ id, min, max }) => {
    const input = document.getElementById(id);
    const val   = document.getElementById(`val-${id}`);
    const fill  = document.getElementById(`fill-${id}`);

    function update() {
      const pct = ((parseFloat(input.value) - min) / (max - min)) * 100;
      fill.style.width  = pct + "%";
      val.textContent   = parseFloat(input.value).toFixed(1);
    }

    input.addEventListener("input", update);
    update(); // initial render
  });
}

// ─── Apply preset ────────────────────────────────────
function applyPreset(name) {
  const values = PRESETS[name];
  if (!values) return;

  SLIDERS.forEach(({ id, min, max }) => {
    const input = document.getElementById(id);
    const val   = document.getElementById(`val-${id}`);
    const fill  = document.getElementById(`fill-${id}`);

    input.value         = values[id];
    val.textContent     = values[id].toFixed(1);
    const pct           = ((values[id] - min) / (max - min)) * 100;
    fill.style.width    = pct + "%";
  });
}

// ─── Show / hide UI states ───────────────────────────
function showPlaceholder() {
  document.getElementById("result-placeholder").classList.remove("hidden");
  document.getElementById("result-content").classList.add("hidden");
  document.getElementById("result-error").classList.add("hidden");
}

function showError(msg) {
  document.getElementById("result-placeholder").classList.add("hidden");
  document.getElementById("result-content").classList.add("hidden");
  document.getElementById("result-error").classList.remove("hidden");
  document.getElementById("error-msg").textContent = msg;
}

function showResult(data) {
  document.getElementById("result-placeholder").classList.add("hidden");
  document.getElementById("result-error").classList.add("hidden");

  const content  = document.getElementById("result-content");
  const badge    = document.getElementById("result-badge");
  const species  = document.getElementById("result-species");
  const confEl   = document.getElementById("result-confidence");
  const illusEl  = document.getElementById("species-illustration");

  const slug = SPECIES_SLUG[data.predicted_class] || "setosa";
  const confPct = (data.confidence * 100).toFixed(1);

  // Species name + confidence
  species.textContent  = data.predicted_class;
  confEl.textContent   = `Güven: ${confPct}%`;

  // Color theming via class
  badge.parentElement.parentElement.className = `result-content species-${slug}`;

  // Illustration
  illusEl.innerHTML = getSpeciesSVG(slug);
  illusEl.style.textAlign = "center";

  // Probability bars
  const probs = data.probabilities;
  const barMap = {
    "Iris-setosa":     { fill: "fill-prob-setosa",     pct: "pct-setosa"     },
    "Iris-versicolor": { fill: "fill-prob-versicolor", pct: "pct-versicolor" },
    "Iris-virginica":  { fill: "fill-prob-virginica",  pct: "pct-virginica"  },
  };

  // Reset widths first (triggers animation on next frame)
  Object.values(barMap).forEach(({ fill }) => {
    document.getElementById(fill).style.width = "0%";
  });

  content.classList.remove("hidden");

  // Animate bars after a short delay
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      Object.entries(probs).forEach(([cls, prob]) => {
        const map = barMap[cls];
        if (!map) return;
        const pct = (prob * 100).toFixed(1);
        document.getElementById(map.fill).style.width = pct + "%";
        document.getElementById(map.pct).textContent  = pct + "%";
      });
    });
  });
}

// ─── Predict ─────────────────────────────────────────
async function predict() {
  const btn = document.getElementById("predict-btn");

  // Collect values
  const payload = {};
  SLIDERS.forEach(({ id }) => {
    payload[id] = parseFloat(document.getElementById(id).value);
  });

  // UI: loading state
  btn.disabled = true;
  btn.classList.add("loading");

  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Bilinmeyen hata" }));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    showResult(data);

  } catch (err) {
    console.error(err);
    showError(err.message || "Sunucuya bağlanılamadı. FastAPI çalışıyor mu?");
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
}

// ─── Boot ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initSliders();

  // Preset buttons
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.preset;
      applyPreset(preset);
    });
  });

  // Predict button
  document.getElementById("predict-btn").addEventListener("click", predict);

  // Allow Enter key on the page to trigger prediction
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") predict();
  });
});
