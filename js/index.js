import Quiz from "./quiz.js";
import Question from "./question.js";
import { escapeHtml } from "./helpers.js";

const quizOptionsForm = document.getElementById("quizOptions");
const playerNameInput = document.getElementById("playerName");
const categoryInput = document.getElementById("categoryMenu");
const difficultyOptions = document.getElementById("difficultyOptions");
const questionsNumber = document.getElementById("questionsNumber");
const startQuizBtn = document.getElementById("startQuiz");
const questionsContainer = document.querySelector(".questions-container");

let currentQuiz = null;
let isStarting = false;

function showLoading() {
  questionsContainer.innerHTML = `
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading Questions...</p>
    </div>
  `;
}

function hideLoading() {
  const overlay = document.querySelector(".loading-overlay");
  if (overlay) overlay.remove();
}

function showError(message) {
  questionsContainer.innerHTML = `
    <div class="game-card error-card">
      <div class="error-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h3 class="error-title">Oops! Something went wrong</h3>
      <p class="error-message">${escapeHtml(message)}</p>
      <button class="btn-play retry-btn">
        <i class="fa-solid fa-rotate-right"></i> Try Again
      </button>
    </div>
  `;

  questionsContainer
    .querySelector(".retry-btn")
    .addEventListener("click", resetToStart);
}

function validateForm() {
  const rawValue = questionsNumber.value.trim();

  if (rawValue === "") {
    return { isValid: false, error: "Please enter the number of questions." };
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < 1) {
    return { isValid: false, error: "You need at least 1 question." };
  }

  if (value > 50) {
    return { isValid: false, error: "Maximum is 50 questions." };
  }

  return { isValid: true, error: null };
}

function showFormError(message) {
  const old = quizOptionsForm.querySelector(".form-error");
  if (old) old.remove();

  const errorDiv = document.createElement("div");
  errorDiv.className = "form-error";
  errorDiv.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(message)}`;

  quizOptionsForm.insertBefore(errorDiv, startQuizBtn);

  setTimeout(() => {
    errorDiv.style.transition = "opacity 0.4s ease";
    errorDiv.style.opacity = "0";
    setTimeout(() => errorDiv.remove(), 400);
  }, 3000);
}

function resetToStart() {
  questionsContainer.innerHTML = "";
  questionsNumber.value = 10;
  quizOptionsForm.classList.remove("hidden");
  currentQuiz = null;
}

async function startQuiz() {
  if (isStarting) return;

  const { isValid, error } = validateForm();

  if (!isValid) {
    showFormError(error);
    return;
  }

  const playerName = playerNameInput.value.trim() || "Player";
  const category = categoryInput.value;
  const difficulty = difficultyOptions.value;
  const numberOfQuestions = Number(questionsNumber.value);

  currentQuiz = new Quiz(category, difficulty, numberOfQuestions, playerName);

  isStarting = true;
  quizOptionsForm.classList.add("hidden");
  showLoading();

  try {
    await currentQuiz.getQuestions();
    hideLoading();

    if (!currentQuiz.questions.length) {
      throw new Error("No questions were returned.");
    }

    const question = new Question(currentQuiz, questionsContainer, resetToStart);
    question.displayQuestion();
  } catch (err) {
    hideLoading();
    showError(err.message || "Failed to load questions. Please try again.");
  } finally {
    isStarting = false;
  }
}

startQuizBtn.addEventListener("click", startQuiz);

questionsNumber.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    startQuiz();
  }
});

quizOptionsForm.addEventListener("submit", (e) => e.preventDefault());
