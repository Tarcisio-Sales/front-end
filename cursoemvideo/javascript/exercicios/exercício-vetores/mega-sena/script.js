"use strict";

/* =========================
   Preços (R$) por quantidade
   6..20 -> tabela que você passou
   ========================= */
const PRICE_BY_QTY = new Map([
  [6, 7],
  [7, 42],
  [8, 168],
  [9, 504],
  [10, 1260],
  [11, 2772],
  [12, 5544],
  [13, 10296],
  [14, 18018],
  [15, 30030],
  [16, 48048],
  [17, 74256],
  [18, 111384],
  [19, 162792],
  [20, 232560],
]);

/* ===== DOM ===== */
const $ = (s) => document.querySelector(s);

const grid = $("#grid");
const selCountEl = $("#selCount");
const betPriceEl = $("#betPrice");
const oddsEl = $("#odds");

const drawsEl = $("#draws");
const spentEl = $("#spent");
const speedEl = $("#speed");

const lastDrawEl = $("#lastDraw");
const lastTagEl = $("#lastTag");

const statusBadge = $("#statusBadge");
const resultText = $("#resultText");

const btnStart = $("#btnStart");
const btnStop = $("#btnStop");
const btnReset = $("#btnReset");

const toast = $("#toast");

/* ===== State ===== */
const selected = new Set();     // números escolhidos
let running = false;

let draws = 0n;                 // BigInt
let costCents = 0n;             // BigInt (R$ -> centavos)
let dps = 0;                    // draws per second (Number)
let lastDraw = null;

/* =========================
   Utils
   ========================= */
function showToast(msg, type = "ok") {
  const color = type === "ok" ? "#22c55e" : type === "warn" ? "#f59e0b" : "#ef4444";
  toast.innerHTML = `
    <span class="toast__dot" style="background:${color}"></span>
    <div>${msg}</div>
  `;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 1600);
}

function setStatus(text, kind = "ok") {
  statusBadge.textContent = text;
  // Bolinha do badge é CSS ::after, então aqui só deixo o texto claro.
  if (kind === "ok") statusBadge.style.color = "rgba(15,23,42,.72)";
  if (kind === "warn") statusBadge.style.color = "rgba(146,64,14,.95)";
  if (kind === "err") statusBadge.style.color = "rgba(153,27,27,.95)";
}

function shake(el) {
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
}

function formatBRLFromCentsBigInt(cents) {
  let sign = "";
  let x = cents;
  if (x < 0n) { sign = "-"; x = -x; }

  const s = x.toString();
  const whole = s.length <= 2 ? "0" : s.slice(0, -2);
  const frac = s.length === 1 ? "01" : s.length === 2 ? s : s.slice(-2);

  // milhares com ponto
  const withThousands = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}R$ ${withThousands},${frac}`;
}

function isValidPickCount(n) {
  return n >= 6 && n <= 20;
}

/* Combinação nCk com BigInt */
function chooseBigInt(n, k) {
  if (k < 0 || k > n) return 0n;
  k = Math.min(k, n - k);
  let res = 1n;
  for (let i = 1; i <= k; i++) {
    res = (res * BigInt(n - k + i)) / BigInt(i);
  }
  return res;
}

/* odds = C(60,6) / C(k,6) -> "1 em X" */
function computeOdds(k) {
  if (!isValidPickCount(k)) return null;
  const top = chooseBigInt(60, 6);
  const bot = chooseBigInt(k, 6);
  if (bot === 0n) return null;
  return top / bot; // BigInt (aprox inteiro)
}

/* Sorteia 6 números únicos 1..60 */
function draw6() {
  const set = new Set();
  while (set.size < 6) {
    const n = (Math.random() * 60 | 0) + 1;
    set.add(n);
  }
  const arr = Array.from(set);
  arr.sort((a, b) => a - b);
  return arr;
}

function isWin(drawArr) {
  for (const n of drawArr) {
    if (!selected.has(n)) return false;
  }
  return true;
}

/* =========================
   Render UI
   ========================= */
function renderGrid() {
  const frag = document.createDocumentFragment();
  for (let i = 1; i <= 60; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "num";
    btn.textContent = String(i);
    btn.dataset.n = String(i);
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => toggleNumber(i, btn));
    frag.appendChild(btn);
  }
  grid.appendChild(frag);
}

function toggleNumber(n, btnEl) {
  if (running) return;

  if (selected.has(n)) {
    selected.delete(n);
    btnEl.setAttribute("aria-pressed", "false");
  } else {
    if (selected.size >= 20) {
      showToast("Máximo: 20 números.", "warn");
      shake(grid);
      return;
    }
    selected.add(n);
    btnEl.setAttribute("aria-pressed", "true");
  }
  updateSummary();
}

function updateSummary() {
  const k = selected.size;
  selCountEl.textContent = String(k);

  if (!isValidPickCount(k)) {
    betPriceEl.textContent = "—";
    oddsEl.textContent = "—";
    resultText.textContent = "Selecione de 6 a 20 números para iniciar.";
    setStatus("Seleção incompleta", "warn");
    return;
  }

  const price = PRICE_BY_QTY.get(k);
  costCents = BigInt(price) * 100n;
  betPriceEl.textContent = `R$ ${price.toLocaleString("pt-BR")},00`;

  const odds = computeOdds(k);
  oddsEl.textContent = odds ? `1 em ${odds.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}` : "—";

  resultText.textContent = "Pronto para simular. Clique em Iniciar.";
  setStatus("Pronto", "ok");
}

function renderLastDraw(drawArr, tag = "Sorteio") {
  lastDrawEl.innerHTML = "";
  const frag = document.createDocumentFragment();

  for (const n of drawArr) {
    const b = document.createElement("div");
    b.className = "ball";
    b.textContent = String(n);
    frag.appendChild(b);
  }
  lastDrawEl.appendChild(frag);
  lastTagEl.textContent = tag;
}

function updateRunStats() {
  drawsEl.textContent = draws.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const spent = draws * costCents;
  spentEl.textContent = formatBRLFromCentsBigInt(spent);
  speedEl.textContent = `${Math.round(dps).toLocaleString("pt-BR")} /s`;
}

/* =========================
   Simulation loop (não trava UI)
   ========================= */
let lastFrameTime = 0;
let lastFrameDraws = 0;

function tick() {
  if (!running) return;

  const frameStart = performance.now();
  const budgetMs = 12; // tempo máximo de CPU por frame
  let iters = 0;

  while (performance.now() - frameStart < budgetMs) {
    const d = draw6();
    draws += 1n;
    iters++;

    lastDraw = d;

    if (isWin(d)) {
      running = false;
      btnStart.disabled = false;
      btnStop.disabled = true;

      renderLastDraw(d, "VENCEU");
      updateRunStats();

      setStatus("Venceu", "ok");
      showToast("Você ganhou. Finalmente.", "ok");

      const spent = draws * costCents;
      resultText.textContent =
        `Você ganhou após ${draws.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} sorteios. ` +
        `Gasto total: ${formatBRLFromCentsBigInt(spent)}.`;

      return;
    }
  }

  // Atualiza UI a cada frame (leve)
  if (lastDraw) renderLastDraw(lastDraw, "Último");
  const now = performance.now();

  // Estima velocidade (draws/s) suavizada
  if (lastFrameTime !== 0) {
    const dt = (now - lastFrameTime) / 1000;
    const inst = iters / Math.max(dt, 0.0001);
    dps = dps === 0 ? inst : (dps * 0.85 + inst * 0.15);
  }
  lastFrameTime = now;
  lastFrameDraws = iters;

  updateRunStats();
  requestAnimationFrame(tick);
}

/* =========================
   Controls
   ========================= */
function start() {
  const k = selected.size;
  if (!isValidPickCount(k)) {
    showToast("Selecione entre 6 e 20 números.", "err");
    shake(grid);
    return;
  }

  draws = 0n;
  dps = 0;
  lastFrameTime = 0;
  lastDraw = null;

  btnStart.disabled = true;
  btnStop.disabled = false;

  setStatus("Rodando…", "ok");
  showToast("Simulação iniciada.", "ok");
  resultText.textContent = "Simulando sorteios até ganhar…";

  running = true;
  requestAnimationFrame(tick);
}

function stop() {
  if (!running) return;
  running = false;
  btnStart.disabled = false;
  btnStop.disabled = true;

  setStatus("Pausado", "warn");
  showToast("Simulação pausada.", "warn");
  resultText.textContent = "Pausado. Você pode retomar clicando em Iniciar (zera o contador).";
}

function reset() {
  running = false;
  selected.clear();

  // reset UI grid
  grid.querySelectorAll(".num").forEach((b) => b.setAttribute("aria-pressed", "false"));

  draws = 0n;
  dps = 0;
  lastFrameTime = 0;
  lastDraw = null;

  btnStart.disabled = false;
  btnStop.disabled = true;

  lastDrawEl.innerHTML = "";
  lastTagEl.textContent = "—";
  drawsEl.textContent = "0";
  spentEl.textContent = "R$ 0,00";
  speedEl.textContent = "0 /s";

  costCents = 0n;

  updateSummary();
  setStatus("Resetado", "ok");
  showToast("Tudo zerado.", "ok");
}

/* =========================
   Boot
   ========================= */
renderGrid();
updateSummary();

btnStart.addEventListener("click", start);
btnStop.addEventListener("click", stop);
btnReset.addEventListener("click", reset);
