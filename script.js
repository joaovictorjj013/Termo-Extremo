/* ===========================
   Configuração de palavras
   =========================== */

let WORD_LIST = [];

async function carregarPalavras() {
  try {
    const resp = await fetch("palavras.txt");
    const texto = await resp.text();
    WORD_LIST = texto.split("\n")
      .map(p => p.trim().toUpperCase())
      .filter(p => p.length === 5);
    iniciarJogo();
  } catch (e) {
    console.error("Erro ao carregar palavras:", e);
  }
}

function iniciarJogo() {
  buildBoards();
}

document.addEventListener("DOMContentLoaded", carregarPalavras);

// Número de tentativas por tabuleiro
const MAX_TRIES = 6;
let currentMode = 1;
let boards = [];
let dailyKey = "";

/* ===========================
   Utilidades
   =========================== */

function getLocalDayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function seededIndices(seed, count, max) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const used = new Set();
  const indices = [];
  while (indices.length < count) {
    h ^= (h << 13);
    h ^= (h >>> 17);
    h ^= (h << 5);
    h >>>= 0;
    const idx = h % max;
    if (!used.has(idx)) {
      used.add(idx);
      indices.push(idx);
    }
  }
  return indices;
}

function getDailyWords(n, dayKey) {
  const seed = `${dayKey}#${n}`;
  const idxs = seededIndices(seed, n, WORD_LIST.length);
  return idxs.map(i => WORD_LIST[i]);
}

/* ===========================
   Construção de UI
   =========================== */

const boardsContainer = document.getElementById("boards");
const statusMsg = document.getElementById("statusMsg");
const dayInfo = document.getElementById("dayInfo");
const guessInput = document.getElementById("guessInput");
const submitBtn = document.getElementById("submitBtn");
const modeButtons = Array.from(document.querySelectorAll(".mode-btn"));

function setMode(mode) {
  currentMode = mode;
  modeButtons.forEach(b => b.classList.toggle("active", Number(b.dataset.mode) === mode));
  buildBoards();
}

function buildBoards() {
  boardsContainer.innerHTML = "";
  boardsContainer.classList.remove("columns-1","columns-2","columns-3","columns-4");
  boardsContainer.classList.add(`columns-${currentMode}`);

  dailyKey = getLocalDayKey();
  const secrets = getDailyWords(currentMode, dailyKey);

  boards = secrets.map(secret => ({ secret, tries: 0, solved: false }));

  secrets.forEach((secret, idx) => {
    const boardEl = document.createElement("div");
    boardEl.className = "board";
    boardEl.dataset.index = String(idx);

    const title = document.createElement("h3");
    title.className = "board-title";
    title.textContent = `Tabuleiro ${idx + 1}`;

    const grid = document.createElement("div");
    grid.className = "grid";

    for (let r = 0; r < MAX_TRIES; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        grid.appendChild(cell);
      }
    }

    boardEl.appendChild(title);
    boardEl.appendChild(grid);
    boardsContainer.appendChild(boardEl);
  });

  statusMsg.textContent = "";
  dayInfo.textContent = `Dia: ${dailyKey} — Palavras diárias definidas.`;
  guessInput.value = "";
  guessInput.disabled = false;
  submitBtn.disabled = false;
}

/* ===========================
   Lógica de jogo
   =========================== */

function applyGuessToBoard(boardIndex, guess) {
  const board = boards[boardIndex];
  const boardEl = boardsContainer.querySelector(`.board[data-index="${boardIndex}"]`);
  const grid = boardEl.querySelector(".grid");
  const row = board.tries;

  for (let c = 0; c < 5; c++) {
    const cell = grid.querySelector(`.cell[data-row="${row}"][data-col="${c}"]`);
    cell.textContent = guess[c];
  }

  const secret = board.secret;
  const result = new Array(5).fill("absent");
  const counts = {};

  for (let i = 0; i < 5; i++) {
    const ch = secret[i];
    counts[ch] = (counts[ch] || 0) + 1;
  }

  for (let i = 0; i < 5; i++) {
    if (guess[i] === secret[i]) {
      result[i] = "correct";
      counts[guess[i]] -= 1;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    const ch = guess[i];
    if ((counts[ch] || 0) > 0) {
      result[i] = "present";
      counts[ch] -= 1;
    }
  }

  for (let c = 0; c < 5; c++) {
    const cell = grid.querySelector(`.cell[data-row="${row}"][data-col="${c}"]`);
    cell.classList.add("revealed", result[c]);

    const ch = guess[c];
    const keyEl = Array.from(document.querySelectorAll(".key"))
      .find(el => el.textContent === ch);
    if (!keyEl) continue;

    if (result[c] === "correct") {
      keyEl.classList.remove("present","absent");
      keyEl.classList.add("correct");
    } else if (result[c] === "present") {
      if (!keyEl.classList.contains("correct")) {
        keyEl.classList.remove("absent");
        keyEl.classList.add("present");
      }
    } else {
      if (!keyEl.classList.contains("correct") && !keyEl.classList.contains("present")) {
        keyEl.classList.add("absent");
      }
    }
  }

  board.tries += 1;
  if (guess === secret) {
    board.solved = true;
  }
}

function allFinished() {
  return boards.every(b => b.solved || b.tries >= MAX_TRIES);
}

function finishMessage() {
  const solvedCount = boards.filter(b => b.solved).length;
  const total = boards.length;
  if (solvedCount === total) {
    return `🎉 Parabéns! Você resolveu todos os ${total} tabuleiros.`;
  }
  const remaining = total - solvedCount;
  return `Fim de jogo. Você resolveu ${solvedCount}/${total}. Restaram ${remaining}.`;
}

/* ===========================
   Validação e eventos
   =========================== */

function sanitizeGuess(raw) {
  const s = (raw || "").trim().toUpperCase();
  if (!/^[A-ZÇÃÕÂÊÎÔÛÁÉÍÓÚÀ]{5}$/.test(s)) return null;
  return s;
}

function onSubmit() {
  if (allFinished()) return;

  const raw = guessInput.value;
  const guess = sanitizeGuess(raw);
  if (!guess) {
    statusMsg.textContent = "Digite exatamente 5 letras (sem números ou espaços).";
    return;
  }

  let applied = 0;
  boards.forEach((b, i) => {
    if (!b.solved && b.tries < MAX_TRIES) {
      applyGuessToBoard(i, guess);
      applied++;
    }
  });

  guessInput.value = "";

  if (allFinished()) {
    statusMsg.textContent = finishMessage();
    guessInput.disabled = true;
    submitBtn.disabled = true;
  } else {
    const remainingBoards = boards.filter(b => !b.solved && b.tries < MAX_TRIES).length;
    statusMsg.textContent = `Palpite aplicado em ${applied} tabuleiro(s). Restam ${remainingBoards} ativo(s).`;
  }
}

function onEnterKey(e) {
  if (e.key === "Enter") {
    onSubmit();
  }
}

/* ===========================
   Inicialização
   =========================== */

function init() {
  submitBtn.addEventListener("click", onSubmit);
  guessInput.addEventListener("keydown", onEnterKey);
  modeButtons.forEach(btn =>
