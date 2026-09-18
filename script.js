const ICONS = {
  thermometer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 15.5V5a1.5 1.5 0 0 0-3 0v10.5a4 4 0 1 0 3 0Z"/><circle cx="11.5" cy="17.5" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  droplet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c3.2 3.6 6 7.4 6 10.8A6 6 0 0 1 6 13.8C6 10.4 8.8 6.6 12 3Z"/></svg>`,
  cloudRain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15a4.5 4.5 0 0 1 .3-9 5.5 5.5 0 0 1 10.6 1.7A3.8 3.8 0 0 1 17.5 15H7Z"/><path d="M8.5 18.5 7.5 20.5M12.5 18.5 11.5 20.5M16.5 18.5 15.5 20.5"/></svg>`,
  waves: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8c1.2-1.1 2.3-1.6 3.8-1.6 2.3 0 2.3 1.6 4.6 1.6s2.3-1.6 4.6-1.6 2.3 1.6 4.6 1.6c1.2 0 2-.3 2.4-.6"/><path d="M2 13c1.2-1.1 2.3-1.6 3.8-1.6 2.3 0 2.3 1.6 4.6 1.6s2.3-1.6 4.6-1.6 2.3 1.6 4.6 1.6c1.2 0 2-.3 2.4-.6"/><path d="M2 18c1.2-1.1 2.3-1.6 3.8-1.6 2.3 0 2.3 1.6 4.6 1.6s2.3-1.6 4.6-1.6 2.3 1.6 4.6 1.6c1.2 0 2-.3 2.4-.6"/></svg>`,
};

const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  ledEnabled: true,
  sensors: {
    temperatura: { label: "Temperatura do ar", unit: "°C", min: -14, max: 45, step: 0.5, value: 22.5, accent: "amber", icon: "thermometer" },
    umidade:     { label: "Umidade relativa",  unit: "%",  min: 0,   max: 100, step: 1,   value: 72,   accent: "cyan",  icon: "droplet" },
    chuva:       { label: "Volume de chuva acumulada", unit: "mm", min: 0, max: 250, step: 1, value: 12, accent: "blue", icon: "cloudRain" },
    nivel_rio:   { label: "Nível do rio", unit: "m", min: 0, max: 15, step: 0.1, value: 2.4, accent: "violet", icon: "waves" },
  },
};

const STORAGE_KEY = "climate-station-state";
const stationSwitch = document.getElementById("station-switch");
const serialStatus = document.getElementById("serial-status");
const SERIAL_BAUD_RATE = 115200;
const TRANSMISSION_INTERVAL = 5000;
let serialPort = null;
let transmissionTimer = null;
let serialWriteQueue = Promise.resolve();
let connectionPromise = null;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    if (typeof saved.ledEnabled === "boolean") state.ledEnabled = saved.ledEnabled;
    else if (typeof saved.stationEnabled === "boolean") state.ledEnabled = saved.stationEnabled;
    Object.entries(state.sensors).forEach(([key, sensor]) => {
      const savedValue = saved.sensors?.[key];
      if (typeof savedValue === "number" && Number.isFinite(savedValue)) {
        sensor.value = Math.min(sensor.max, Math.max(sensor.min, savedValue));
      }
    });
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveState() {
  const sensors = Object.fromEntries(Object.entries(state.sensors).map(([key, sensor]) => [key, sensor.value]));
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ledEnabled: state.ledEnabled, sensors }));
}

function monitorSerial({ ledEnabled, sensors }) {
  const { temperatura, umidade, chuva, nivel_rio } = sensors;
  return `temperatura=${temperatura},umidade=${umidade},chuva_mm=${chuva},cota=${nivel_rio},ledEnable=${ledEnabled}`;
}

function buildTelemetryFrame() {
  return {
    device_id: "Estação 001",
    timestamp: new Date().toISOString(),
    led: state.ledEnabled,
    sensors: Object.fromEntries(Object.entries(state.sensors).map(([key, sensor]) => [key, Number(fmt(sensor.value, sensor.step))])),
  };
}

function stopSerialTransmission() {
  if (transmissionTimer !== null) {
    clearInterval(transmissionTimer);
    transmissionTimer = null;
  }
}

function reportSerialError(error) {
  console.error("[climate-telemetry] falha na transmissão serial:", error);
  stopSerialTransmission();
  serialPort = null;
  updateSerialStatus("Falha na conexão", "error");
}

function updateSerialStatus(message, kind = "idle") {
  serialStatus.textContent = message;
  serialStatus.className = `serial-status ${kind}`;
}

function setNeedsAuthorization(needsAuth) {
  if (needsAuth) {
    serialStatus.setAttribute("role", "button");
    serialStatus.setAttribute("tabindex", "0");
    updateSerialStatus("Autorizar Dispositivo?", "pending");
  } else {
    serialStatus.removeAttribute("role");
    serialStatus.removeAttribute("tabindex");
  }
}

async function authorizeDevice() {
  try {
    await navigator.serial.requestPort();
    setNeedsAuthorization(false);
    await connectSerial(); // getPorts() já vai encontrar essa porta a partir de agora
  } catch (error) {
    if (error.name !== "NotFoundError") reportSerialError(error);
  }
}

function handleSerialDisconnect(event) {
  if (event.target !== serialPort) return;
  stopSerialTransmission();
  serialPort = null;
  updateSerialStatus("ESP32 desconectado", "error");
}

function sendTelemetryFrame() {
  if (!serialPort?.writable) return;
  const payload = `${monitorSerial(buildTelemetryFrame())}\n`;
  serialWriteQueue = serialWriteQueue
    .then(async () => {
      if (!serialPort?.writable) return;
      const writer = serialPort.writable.getWriter();
      try {
        await writer.write(new TextEncoder().encode(payload));
      } finally {
        writer.releaseLock();
      }
    })
    .catch(reportSerialError);
}

async function connectSerial() {
  if (serialPort?.writable) return true;
  if (connectionPromise) return connectionPromise;

  if (!("serial" in navigator)) {
    updateSerialStatus("Web Serial indisponível", "error");
    return false;
  }

  updateSerialStatus("Verificando portas...", "pending");
  connectionPromise = (async () => {
    try {
      const authorizedPorts = await navigator.serial.getPorts();
        if (authorizedPorts.length === 0) {
          setNeedsAuthorization(true);
          return false;
        }
      setNeedsAuthorization(false);
      serialPort = authorizedPorts[0];
      await serialPort.open({ baudRate: SERIAL_BAUD_RATE });
      serialPort.addEventListener("disconnect", handleSerialDisconnect);
      updateSerialStatus("Conectado", "connected");
      sendTelemetryFrame();
        if (transmissionTimer === null) {
          transmissionTimer = setInterval(sendTelemetryFrame, TRANSMISSION_INTERVAL);
        }
      return true;
    } catch (error) {
      serialPort = null;
      if (error.name === "NotFoundError") updateSerialStatus("Autorização cancelada", "idle");
      else reportSerialError(error);
      return false;
    } finally { connectionPromise = null; }
  })();

return connectionPromise;
}

const SCENARIOS = {
  normal:     { label: "Condição normal",   values: { temperatura: 22.5, umidade: 65, chuva: 8,   nivel_rio: 2.4 } },
  tempestade: { label: "Tempestade severa", values: { temperatura: 17,   umidade: 96, chuva: 210, nivel_rio: 11.8 } },
  calor:      { label: "Onda de calor",     values: { temperatura: 41.5, umidade: 16, chuva: 0,   nivel_rio: 1.1 } },
};

const grid = document.getElementById("sensor-grid");
function fmt(n, step) {
  const decimals = (String(step).split(".")[1] || "").length;
  return Number(n).toFixed(decimals);
}
function pct(s) { return ((s.value - s.min) / (s.max - s.min)) * 100; }

function renderSensorGrid() {
  grid.innerHTML = Object.entries(state.sensors).map(([key, s]) => `
    <div class="sensor-card">
      <div class="sensor-card-top">
        <div class="sensor-id">
          <span class="icon-badge ${s.accent}">${ICONS[s.icon]}</span>
          <div>
            <div class="sensor-name">${s.label}</div>
            <div class="sensor-limit">LIMITE: ${s.min}${s.unit} a ${s.max}${s.unit}</div>
          </div>
        </div>
        <div class="sensor-readout">
          <span class="sensor-value" id="value-${key}">${fmt(s.value, s.step)}</span><span class="sensor-unit">${s.unit}</span>
        </div>
      </div>
      <div class="slider-row">
        <button class="step-btn" data-key="${key}" data-dir="-1" aria-label="Diminuir ${s.label}">−</button>
        <input type="range" class="slider" id="slider-${key}" data-key="${key}"
          min="${s.min}" max="${s.max}" step="${s.step}" value="${s.value}"
          style="--accent: var(--${s.accent}); --pct: ${pct(s)}%;">
        <button class="step-btn" data-key="${key}" data-dir="1" aria-label="Aumentar ${s.label}">+</button>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll(".slider").forEach(input => {
    input.addEventListener("input", e => setValue(e.target.dataset.key, parseFloat(e.target.value), false));
  });
  grid.querySelectorAll(".step-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      const dir = parseFloat(btn.dataset.dir);
      const s = state.sensors[key];
      setValue(key, s.value + dir * s.step, true);
    });
  });
  updateStationControls();
}

function setValue(key, value, syncSlider) {
  const s = state.sensors[key];
  s.value = Math.min(s.max, Math.max(s.min, value));
  const valueEl = document.getElementById(`value-${key}`);
  if (valueEl) valueEl.textContent = fmt(s.value, s.step);
  const sliderEl = document.getElementById(`slider-${key}`);
  if (sliderEl) {
    if (syncSlider) sliderEl.value = s.value;
    sliderEl.style.setProperty("--pct", pct(s) + "%");
  }
  saveState();
  sendTelemetryFrame();
}

function updateStationControls() {
  stationSwitch.classList.toggle("is-on", state.ledEnabled);
  stationSwitch.setAttribute("aria-checked", String(state.ledEnabled));
}

async function toggleStation() {
  state.ledEnabled = !state.ledEnabled;
  updateStationControls();
  saveState();

  if (serialPort) {
    sendTelemetryFrame();
    return;
  }
}

function easeInOutQuad(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }

function applyScenario(key) {
  const scenario = SCENARIOS[key];
  if (!scenario) return;
  if (REDUCE_MOTION) {
    Object.entries(scenario.values).forEach(([k, v]) => setValue(k, v, true));
    return;
  }
  const duration = 650;
  const start = performance.now();
  const from = Object.fromEntries(Object.entries(state.sensors).map(([k, s]) => [k, s.value]));
  const to = scenario.values;
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeInOutQuad(t);
    Object.keys(state.sensors).forEach(k => setValue(k, from[k] + (to[k] - from[k]) * eased, true));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

document.querySelectorAll(".btn-scenario").forEach(btn => btn.addEventListener("click", () => applyScenario(btn.dataset.scenario)));
stationSwitch.addEventListener("click", toggleStation);
serialStatus.addEventListener("click", () => {
    if (serialStatus.getAttribute("role") === "button") authorizeDevice();
});
serialStatus.addEventListener("keydown", (e) => {
  if (serialStatus.getAttribute("role") === "button" && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    authorizeDevice();
  }
});
if ("serial" in navigator) {
  navigator.serial.addEventListener("disconnect", handleSerialDisconnect);
  navigator.serial.addEventListener("connect", connectSerial);
  connectSerial();
} else {
  updateSerialStatus("Web Serial indisponível", "error");
}

loadState();
renderSensorGrid();
