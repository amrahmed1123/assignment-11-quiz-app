import { escapeHtml, playSound } from "./helpers.js";

const TIME_LIMIT = 15;
const DIFFICULTY_ICONS = {
  easy: "fa-face-smile",
  medium: "fa-face-meh",
  hard: "fa-skull",
};

export default class Question {
  constructor(quiz, container, onQuizEnd) {
    this.quiz = quiz;
    this.container = container;
    this.onQuizEnd = onQuizEnd;

    this.questionData = quiz.getCurrentQuestion();
    this.index = quiz.currentQuestionIndex;

    this.question = this.decodeHtml(this.questionData.question);
    this.correctAnswer = this.decodeHtml(this.questionData.correct_answer);
    this.category = this.decodeHtml(this.questionData.category);
    this.wrongAnswers = this.questionData.incorrect_answers.map((answer) =>
      this.decodeHtml(answer)
    );
    this.allAnswers = this.shuffleAnswers();

    this.answered = false;
    this.timerInterval = null;
    this.timeRemaining = TIME_LIMIT;
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  decodeHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.documentElement.textContent;
  }

  shuffleAnswers() {
    const answers = [...this.wrongAnswers, this.correctAnswer];

    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }

    return answers;
  }

  getProgress() {
    return Math.round(((this.index + 1) / this.quiz.numberOfQuestions) * 100);
  }

  displayQuestion() {
    const total = this.quiz.numberOfQuestions;
    const difficulty = this.questionData.difficulty;

    const answersHtml = this.allAnswers
      .map(
        (answer, i) => `
          <button class="answer-btn" data-answer="${escapeHtml(answer)}">
            <span class="answer-key">${i + 1}</span>
            <span class="answer-text">${escapeHtml(answer)}</span>
          </button>`
      )
      .join("");

    this.container.innerHTML = `
      <div class="game-card question-card">
        <div class="xp-bar-container">
          <div class="xp-bar-header">
            <span class="xp-label"><i class="fa-solid fa-bolt"></i> Progress</span>
            <span class="xp-value">Question ${this.index + 1}/${total}</span>
          </div>
          <div class="xp-bar">
            <div class="xp-bar-fill" style="width: ${this.getProgress()}%"></div>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-badge category">
            <i class="fa-solid fa-bookmark"></i>
            <span>${escapeHtml(this.category)}</span>
          </div>
          <div class="stat-badge difficulty ${difficulty}">
            <i class="fa-solid ${DIFFICULTY_ICONS[difficulty] || "fa-face-smile"}"></i>
            <span>${difficulty}</span>
          </div>
          <div class="stat-badge timer">
            <i class="fa-solid fa-stopwatch"></i>
            <span class="timer-value">${this.timeRemaining}</span>s
          </div>
          <div class="stat-badge counter">
            <i class="fa-solid fa-gamepad"></i>
            <span>${this.index + 1}/${total}</span>
          </div>
        </div>

        <h2 class="question-text">${escapeHtml(this.question)}</h2>

        <div class="answers-grid">${answersHtml}</div>

        <p class="keyboard-hint">
          <i class="fa-regular fa-keyboard"></i> Press 1-${this.allAnswers.length} to select
        </p>

        <div class="score-panel">
          <div class="score-item">
            <div class="score-item-label">Score</div>
            <div class="score-item-value">${this.quiz.score}</div>
          </div>
        </div>
      </div>
    `;

    this.addEventListeners();
    this.startTimer();
  }

  addEventListeners() {
    this.container.querySelectorAll(".answer-btn").forEach((button) => {
      button.addEventListener("click", () => this.checkAnswer(button));
    });

    document.addEventListener("keydown", this.handleKeyPress);
  }

  handleKeyPress(e) {
    const keys = ["1", "2", "3", "4"];
    if (!keys.includes(e.key)) return;

    const buttons = this.container.querySelectorAll(".answer-btn");
    const button = buttons[Number(e.key) - 1];

    if (button) this.checkAnswer(button);
  }

  removeEventListeners() {
    document.removeEventListener("keydown", this.handleKeyPress);
  }

  startTimer() {
    const timerBadge = this.container.querySelector(".stat-badge.timer");
    const timerValue = this.container.querySelector(".timer-value");

    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      timerValue.textContent = this.timeRemaining;

      if (this.timeRemaining <= 5) {
        timerBadge.classList.add("warning");
      }

      if (this.timeRemaining <= 0) {
        this.stopTimer();
        this.handleTimeUp();
      }
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
  }

  handleTimeUp() {
    this.answered = true;
    this.removeEventListeners();
    playSound("timeup");

    this.container.querySelectorAll(".answer-btn").forEach((button) => {
      if (button.dataset.answer === this.correctAnswer) {
        button.classList.add("correct");
      } else {
        button.classList.add("disabled");
      }
    });

    const message = document.createElement("div");
    message.className = "time-up-message";
    message.innerHTML = `<i class="fa-solid fa-clock"></i> TIME'S UP!`;

    const grid = this.container.querySelector(".answers-grid");
    grid.parentElement.insertBefore(message, grid);

    this.animateQuestion();
  }

  checkAnswer(choiceElement) {
    if (this.answered) return;

    this.answered = true;
    this.stopTimer();
    this.removeEventListeners();

    const selected = choiceElement.dataset.answer;
    const isCorrect = selected.toLowerCase() === this.correctAnswer.toLowerCase();

    if (isCorrect) {
      choiceElement.classList.add("correct");
      this.quiz.incrementScore();
      this.container.querySelector(".score-item-value").textContent =
        this.quiz.score;
      playSound("correct");
    } else {
      choiceElement.classList.add("wrong");
      this.highlightCorrectAnswer();
      playSound("wrong");
    }

    this.container.querySelectorAll(".answer-btn").forEach((button) => {
      if (
        button !== choiceElement &&
        !button.classList.contains("correct-reveal")
      ) {
        button.classList.add("disabled");
      }
    });

    this.animateQuestion();
  }

  highlightCorrectAnswer() {
    this.container.querySelectorAll(".answer-btn").forEach((button) => {
      if (button.dataset.answer === this.correctAnswer) {
        button.classList.add("correct-reveal");
      }
    });
  }

  getNextQuestion() {
    if (this.quiz.nextQuestion()) {
      const next = new Question(this.quiz, this.container, this.onQuizEnd);
      next.displayQuestion();
      return;
    }

    this.container.innerHTML = this.quiz.endQuiz();

    const restartBtn = this.container.querySelector(".btn-restart");
    restartBtn.addEventListener("click", () => this.onQuizEnd());
  }

  animateQuestion(duration = 400) {
    setTimeout(() => {
      const card = this.container.querySelector(".question-card");
      if (card) card.classList.add("exit");

      setTimeout(() => this.getNextQuestion(), duration);
    }, 1500);
  }
}
