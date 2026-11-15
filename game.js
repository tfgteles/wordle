"use strict";

const rows = Array.from(document.querySelectorAll("tbody tr"));
const keyboard = document.querySelector("#keyboard");
const message = document.querySelector("#message");
const newGameButton = document.querySelector("#new-game");
const keyButtons = new Map(
  Array.from(keyboard.querySelectorAll("[data-key]"), button => [button.dataset.key, button])
);
const rank = { absent: 1, present: 2, correct: 3 };

let answers = [];
let validWords = new Set();
let answer = "";
let guess = "";
let row = 0;
let gameOver = true;

function showMessage(text) {
  message.textContent = text;
}

function startGame() {
  answer = answers[Math.floor(Math.random() * answers.length)];
  guess = "";
  row = 0;
  gameOver = false;
  for (const cell of document.querySelectorAll("tbody td")) {
    cell.textContent = "";
    cell.className = "";
    cell.removeAttribute("aria-label");
  }
  for (const button of keyButtons.values()) {
    button.className = "";
    button.removeAttribute("aria-label");
    if (button.dataset.key === "Backspace") button.setAttribute("aria-label", "Delete");
  }
  showMessage("Enter a five-letter word.");
}

function renderGuess() {
  for (const [index, cell] of Array.from(rows[row].cells).entries()) {
    cell.textContent = guess[index] ? guess[index].toUpperCase() : "";
  }
}

function submitGuess() {
  if (guess.length !== 5) {
    showMessage("Enter five letters.");
    return;
  }
  if (!validWords.has(guess)) {
    showMessage("That word is not in the word list.");
    return;
  }

  const result = Array(5).fill("absent");
  const remaining = {};
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
    } else {
      remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] !== "correct" && remaining[guess[i]] > 0) {
      result[i] = "present";
      remaining[guess[i]]--;
    }
  }

  for (let i = 0; i < 5; i++) {
    const cell = rows[row].cells[i];
    cell.className = result[i];
    cell.setAttribute("aria-label", `${guess[i].toUpperCase()}: ${result[i]}`);
    const button = keyButtons.get(guess[i]);
    if (!button.className || rank[result[i]] > rank[button.className]) {
      button.className = result[i];
      button.setAttribute("aria-label", `${guess[i].toUpperCase()}: ${result[i]}`);
    }
  }

  row++;
  if (guess === answer) {
    gameOver = true;
    showMessage(`You won in ${row} ${row === 1 ? "guess" : "guesses"}!`);
  } else if (row === rows.length) {
    gameOver = true;
    showMessage(`Game over. The word was ${answer.toUpperCase()}.`);
  } else {
    showMessage("Enter a five-letter word.");
  }
  guess = "";
}

function handleKey(key) {
  if (gameOver) return;
  if (key === "Enter") {
    submitGuess();
  } else if (key === "Backspace") {
    guess = guess.slice(0, -1);
    renderGuess();
    showMessage("Enter a five-letter word.");
  } else if (/^[a-z]$/.test(key) && guess.length < 5) {
    guess += key;
    renderGuess();
  }
}

keyboard.addEventListener("click", event => {
  const button = event.target.closest("button[data-key]");
  if (button) handleKey(button.dataset.key);
});

document.addEventListener("keydown", event => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (event.target instanceof HTMLButtonElement && (event.key === "Enter" || event.key === " ")) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key === "Backspace") event.preventDefault();
  handleKey(key);
});

newGameButton.addEventListener("click", startGame);

async function loadWords() {
  try {
    const response = await fetch("wordle-database.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const database = await response.json();
    const isWord = word => typeof word === "string" && /^[a-z]{5}$/.test(word);
    if (!Array.isArray(database.answers) || database.answers.length === 0 ||
        !database.answers.every(isWord) || !Array.isArray(database.guesses) ||
        !database.guesses.every(isWord)) {
      throw new Error("Invalid word database");
    }
    answers = database.answers;
    validWords = new Set([...database.guesses, ...answers]);
    newGameButton.disabled = false;
    startGame();
  } catch (error) {
    console.error("Could not load the word database:", error);
    showMessage("Could not load words. Serve this folder over HTTP and reload the page.");
  }
}

loadWords();
