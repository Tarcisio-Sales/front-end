"use strict";

/* ===== Cache DOM ===== */
const $ = (sel) => document.querySelector(sel);

const form = $("#form");
const input = $("#fnum");
const list = $("#flista");
const resCard = $("#stats");
const note = $("#note");
const toast = $("#toast");
const chip = $("#chipStatus");

const btnFinish = $("#btnFinish");
const btnClear = $("#btnClear");

/* ===== State ===== */
const valores = [];

/* ===== Utils ===== */
function isIntBetween1and100(x) {
  return Number.isInteger(x) && x >= 1 && x <= 100;
}

function showToast(message, type = "ok") {
  // type: ok | warn | err
  toast.innerHTML = `
    <span class="toast__dot" style="background:${type === "ok" ? "#22c55e" : type === "warn" ? "#f59e0b" : "#ef4444"}"></span>
    <div>${message}</div>
  `;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 1600);
}

function setStatus(text, good = true) {
  chip.textContent = text;
  // bolinha do chip via ::after (não dá para setar direto), então só muda texto aqui.
  chip.style.opacity = good ? "1" : ".92";
}

function shake(el) {
  el.classList.remove("shake");
  // reflow para reiniciar animação
  void el.offsetWidth;
  el.classList.add("shake");
}

function animateNumber(el, toValue, decimals = 0) {
  const from = Number(el.dataset._v ?? 0);
  const to = Number(toValue);
  const start = performance.now();
  const dur = 350;

  function step(t) {
    const p = Math.min(1, (t - start) / dur);
    const v = from + (to - from) * (1 - Math.pow(1 - p, 3)); // easeOutCubic
    el.textContent = decimals ? v.toFixed(decimals) : Math.round(v).toString();
    if (p < 1) requestAnimationFrame(step);
    else el.dataset._v = String(to);
  }
  requestAnimationFrame(step);
}

/* ===== Render ===== */
function renderListItem(n) {
  const opt = document.createElement("option");
  opt.value = String(n);
  opt.textContent = `Valor ${n} adicionado.`;
  return opt;
}

function computeStats(arr) {
  let sum = 0;
  let min = arr[0];
  let max = arr[0];

  for (const v of arr) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { total: arr.length, min, max, sum, avg: sum / arr.length };
}

function renderStats(stats) {
  const totalEl = resCard.querySelector('[data-k="total"]');
  const maxEl = resCard.querySelector('[data-k="max"]');
  const minEl = resCard.querySelector('[data-k="min"]');
  const sumEl = resCard.querySelector('[data-k="sum"]');
  const avgEl = resCard.querySelector('[data-k="avg"]');

  animateNumber(totalEl, stats.total, 0);
  maxEl.textContent = String(stats.max);
  minEl.textContent = String(stats.min);
  animateNumber(sumEl, stats.sum, 0);
  // média com 2 casas
  // animar float: faz manual
  const fromAvg = Number(avgEl.dataset._v ?? 0);
  const toAvg = stats.avg;
  const start = performance.now();
  const dur = 420;

  function step(t) {
    const p = Math.min(1, (t - start) / dur);
    const v = fromAvg + (toAvg - fromAvg) * (1 - Math.pow(1 - p, 3));
    avgEl.textContent = v.toFixed(2);
    if (p < 1) requestAnimationFrame(step);
    else avgEl.dataset._v = String(toAvg);
  }
  requestAnimationFrame(step);

  note.textContent = "Estatísticas atualizadas.";
}

/* ===== Actions ===== */
function addNumber() {
  const n = Number(input.value);

  if (!isIntBetween1and100(n)) {
    setStatus("Entrada inválida", false);
    showToast("Digite um inteiro entre 1 e 100.", "err");
    shake(input);
    input.focus();
    return;
  }

  if (valores.includes(n)) {
    setStatus("Duplicado bloqueado", false);
    showToast("Esse número já existe na lista.", "warn");
    shake(list);
    input.select();
    return;
  }

  valores.push(n);

  // render eficiente
  const frag = document.createDocumentFragment();
  frag.appendChild(renderListItem(n));
  list.appendChild(frag);

  setStatus("Adicionado", true);
  showToast(`Adicionado: ${n}`, "ok");

  // limpar e focar
  input.value = "";
  input.focus();

  // reset de resultados
  note.textContent = "Clique em Finalizar para calcular estatísticas.";
}

function finish() {
  if (valores.length === 0) {
    setStatus("Sem dados", false);
    showToast("Adicione valores antes de finalizar.", "warn");
    shake(btnFinish);
    return;
  }

  const stats = computeStats(valores);
  renderStats(stats);
  setStatus("Finalizado", true);
  showToast("Cálculo concluído.", "ok");
}

function clearAll() {
  if (valores.length === 0 && list.options.length === 0) {
    showToast("Nada para limpar.", "warn");
    return;
  }

  valores.length = 0;
  list.innerHTML = "";
  setStatus("Limpo", true);
  showToast("Lista limpa.", "ok");

  // reset stats
  resCard.querySelector('[data-k="total"]').textContent = "0";
  resCard.querySelector('[data-k="max"]').textContent = "–";
  resCard.querySelector('[data-k="min"]').textContent = "–";
  resCard.querySelector('[data-k="sum"]').textContent = "0";
  resCard.querySelector('[data-k="avg"]').textContent = "0.00";
  note.textContent = "Adicione números para ver as estatísticas.";

  input.focus();
}

/* ===== Events ===== */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  addNumber();
});

btnFinish.addEventListener("click", finish);
btnClear.addEventListener("click", clearAll);

// Atalho: Enter já adiciona pelo submit.
// Extra: ESC limpa o input.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    input.value = "";
    input.focus();
    showToast("Entrada limpa.", "ok");
  }
});
