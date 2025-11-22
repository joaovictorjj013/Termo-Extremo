/* ===========================
   Configuração de palavras
   =========================== */

/**
 * Lista de palavras válidas (5 letras, pt-BR). Em produção, use uma lista maior.
 * Todas em maiúsculas para simplificar a comparação.
 */
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
  // aqui você chama buildBoards() ou init()
  buildBoards();
}

document.addEventListener("DOMContentLoaded", carregarPalavras);

];

// Número de tentativas por tabuleiro
const MAX_TRIES = 6;

// Modo atual: 1 (solo), 2 (dueto), 3 (trio), 4 (quarteto)
let currentMode = 1;

// Estado por tabuleiro
let boards = []; // [{ secret: "XXXXX", tries: 0, solved: false }]

// Cache da data diária (para exibir e persistir)
let dailyKey = ""; // e.g., "2025-11-21"

/* ===========================
   Utilidades de dia e sorteio
   =========================== */

/**
 * Retorna uma string YYYY-MM-DD baseada na data local do usuário.
 * As palavras mudam a cada 24h localmente.
 */
function getLocalDayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Gera um índice pseudo-aleatório determinístico com base em uma seed (string).
 * Usa uma hash simples (FNV-like) para derivar números.
 */
function seededIndices(seed, count, max) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const used = new Set();
  const indices = [];
  let attempts = 0;
  while (indices.length < count && attempts < 10000) {
    h ^= (h << 13);
    h ^= (h >>> 17);
    h ^= (h << 5);
    h >>>= 0;
    const idx = h % max;
    if (!used.has(idx)) {
      used.add(idx);
      indices.push(idx);
    }
    attempts++;
  }
  return indices;
}

/**
 * Obtém N palavras diárias distintas do WORD_LIST para um seed específico (dia + modo).
 */
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

/**
 * Cria os tabuleiros lado a lado conforme o modo atual.
 */
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

    // 6 linhas x 5 colunas
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

/**
 * Aplica um palpite (string 5 letras) em todos os boards ainda não resolvidos.
 * Revela cores por posição:
 * - correct (verde): letra certa no lugar certo
 * - present (laranja): letra existe, mas em outra posição
 * - absent (cinza): letra não existe
 *
 * Trate letras repetidas corretamente usando contagem.
 */
function applyGuessToBoard(boardIndex, guess) {// Atualiza cores do teclado
for (let c = 0; c < 5; c++) {
  const ch = guess[c];
  const keyEl = Array.from(document.querySelectorAll(".key"))
  .find(el => el.textContent === ch);

  // Define prioridade: correto > presente > ausente
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

  const board = boards[boardIndex];
  const boardEl = boardsContainer.querySelector(`.board[data-index="${boardIndex}"]`);
  const grid = boardEl.querySelector(".grid");

  const row = board.tries;
  // Preenche letras da linha
  for (let c = 0; c < 5; c++) {
    const cell = grid.querySelector(`.cell[data-row="${row}"][data-col="${c}"]`);
    cell.textContent = guess[c];
  }

  // Calcula estados com contagem de letras
  const secret = board.secret;
  const result = new Array(5).fill("absent");

  // Primeiro, marca corretas e conta letras faltantes
  const counts = {};
  for (let i = 0; i < 5; i++) {
    const ch = secret[i];
    counts[ch] = (counts[ch] || 0) + 1;
  }

  // Marca corretas
  for (let i = 0; i < 5; i++) {
    if (guess[i] === secret[i]) {
      result[i] = "correct";
      counts[guess[i]] -= 1;
    }
  }

  // Marca presentes
  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    const ch = guess[i];
    if ((counts[ch] || 0) > 0) {
      result[i] = "present";
      counts[ch] -= 1;
    }
  }

  // Revela células
  for (let c = 0; c < 5; c++) {
    const cell = grid.querySelector(`.cell[data-row="${row}"][data-col="${c}"]`);
    cell.classList.add("revealed", result[c]);
  }

  // Atualiza estado
  board.tries += 1;
  if (guess === secret) {
    board.solved = true;
  }
}

/**
 * Verifica se todos os boards estão finalizados (solvidos ou estourou tentativas).
 */
function allFinished() {
  return boards.every(b => b.solved || b.tries >= MAX_TRIES);
}

/**
 * Mensagem de encerramento
 */
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
  // Apenas A-Z, 5 letras
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

  // Aplica palpite em todos os boards ativos
  let applied = 0;
  boards.forEach((b, i) => {
    if (!b.solved && b.tries < MAX_TRIES) {
      applyGuessToBoard(i, guess);
      applied++;
    }
  });

  // Limpa input
  guessInput.value = "";

  // Checa término
  if (allFinished()) {
    statusMsg.textContent = finishMessage();function finishMessage() {
  const solvedCount = boards.filter(b => b.solved).length;
  const total = boards.length;
  let msg = "";
  if (solvedCount === total) {
    msg = `🎉 Parabéns! Você resolveu todos os ${total} tabuleiros.`;
  } else {
    const remaining = total - solvedCount;
    msg = `Fim de jogo. Você resolveu ${solvedCount}/${total}. Restaram ${remaining}.`;
  }
  const secrets = boards.map(b => b.secret).join(" | ");
  return msg + ` As palavras eram: ${secrets}`;
}

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
   Persistência mínima (opcional)
   =========================== */

/**
 * Salva progresso no localStorage por dia e modo, para permitir continuar no mesmo dia.
 */
function saveProgress() {
  const data = {
    day: dailyKey,
    mode: currentMode,
    boards
  };
  try {
    localStorage.setItem("daily-progress", JSON.stringify(data));
  } catch { /* ignore */ }
}

function loadProgressIfSameDayAndMode() {
  try {
    const raw = localStorage.getItem("daily-progress");
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || data.day !== getLocalDayKey()) return false;
    if (typeof data.mode !== "number") return false;

    currentMode = data.mode;
    modeButtons.forEach(b => b.classList.toggle("active", Number(b.dataset.mode) === currentMode));
    boardsContainer.innerHTML = "";
    boardsContainer.classList.remove("columns-1","columns-2","columns-3","columns-4");
    boardsContainer.classList.add(`columns-${currentMode}`);

    dailyKey = data.day;
    const secrets = getDailyWords(currentMode, dailyKey);
    boards = secrets.map((secret, idx) => {
      const saved = data.boards?.[idx];
      return saved ? { secret, tries: saved.tries, solved: saved.solved } : { secret, tries: 0, solved: false };
    });

    // Reconstruir UI com progresso
    boards.forEach((board, idx) => {
      const boardEl = document.createElement("div");
      boardEl.className = "board";
      boardEl.dataset.index = String(idx);

      const title = document.createElement("h3");
      title.className = "board-title";
      title.textContent = `Tabuleiro ${idx + 1}`;

      const grid = document.createElement("div");
      grid.className = "grid";

      // 6 x 5
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

    // Não temos histórico de letras por linha, então apenas marcamos linhas vazias.
    // Para uma persistência completa, seria necessário salvar os palpites feitos.
    // Aqui, marcamos visualmente as linhas já usadas com traço "•" para dar noção.
    boards.forEach((board, idx) => {
      const grid = boardsContainer.querySelector(`.board[data-index="${idx}"] .grid`);
      for (let r = 0; r < board.tries; r++) {
        for (let c = 0; c < 5; c++) {
          const cell = grid.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
          cell.textContent = "•";
          cell.classList.add("revealed","absent");
        }
      }
    });

    dayInfo.textContent = `Dia: ${dailyKey} — Progresso carregado.`;
    if (boards.every(b => b.solved || b.tries >= MAX_TRIES)) {
      statusMsg.textContent = finishMessage();
      guessInput.disabled = true;
      submitBtn.disabled = true;
    } else {
      statusMsg.textContent = "Progresso do dia restaurado. Continue jogando!";
      guessInput.disabled = false;
      submitBtn.disabled = false;
    }

    return true;
  } catch {
    return false;
  }
}

/* ===========================
   Inicialização
   =========================== */

function init() {
  // Liga eventos
  submitBtn.addEventListener("click", onSubmit);
  guessInput.addEventListener("keydown", onEnterKey);
  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => setMode(Number(btn.dataset.mode)));
  });

  // Tenta carregar progresso do dia. Se não, inicia no modo Solo.
  const loaded = loadProgressIfSameDayAndMode();
  if (!loaded) {
    setMode(1);
  }

  // Salva progresso ao sair/navegar
  window.addEventListener("beforeunload", saveProgress);
}

document.addEventListener("DOMContentLoaded", init);
/* ===========================
   Teclado virtual
   =========================== */

const KEY_LAYOUT = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["Z","X","C","V","B","N","M","⌫","ENTER"]
];

function buildKeyboard() {
  const kb = document.getElementById("keyboard");
  kb.innerHTML = "";
  KEY_LAYOUT.forEach(row => {
    const rowEl = document.createElement("div");
    rowEl.className = "key-row";
    row.forEach(k => {
      const keyEl = document.createElement("div");
      keyEl.className = "key";
      keyEl.textContent = k;
      if (k === "⌫" || k === "ENTER") keyEl.classList.add("special");
      keyEl.addEventListener("click", () => onVirtualKey(k));
      rowEl.appendChild(keyEl);
    });
    kb.appendChild(rowEl);
  });
}

function onVirtualKey(k) {
  if (k === "⌫") {
    guessInput.value = guessInput.value.slice(0, -1);
  } else if (k === "ENTER") {
    onSubmit();
  } else {
    if (guessInput.value.length < 5) {
      guessInput.value += k;
    }
  }
}

