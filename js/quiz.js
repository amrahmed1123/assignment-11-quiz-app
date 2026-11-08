import { escapeHtml } from "./helpers.js";

export default class Quiz {
  constructor(category, difficulty, numberOfQuestions, playerName) {
    this.category = category;
    this.difficulty = difficulty;
    this.numberOfQuestions = numberOfQuestions;
    this.playerName = playerName;
    this.score = 0;
    this.questions = [];
    this.currentQuestionIndex = 0;
  }

  buildApiUrl() {
    const params = new URLSearchParams({
      amount: this.numberOfQuestions,
      difficulty: this.difficulty,
    });

    if (this.category) {
      params.append("category", this.category);
    }

    return `https://opentdb.com/api.php?${params.toString()}`;
  }

  async getQuestions() {
    const response = await fetch(this.buildApiUrl());

    if (response.status === 429) {
      throw new Error("Too many requests. Wait a few seconds and try again.");
    }

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.response_code === 1) {
      throw new Error(
        "Not enough questions for this selection. Try fewer questions or another category."
      );
    }

    if (data.response_code === 5) {
      throw new Error("Too many requests. Wait a few seconds and try again.");
    }

    if (data.response_code !== 0) {
      throw new Error("Could not load questions. Please try again.");
    }

    this.questions = data.results;
    return this.questions;
  }

  incrementScore() {
    this.score++;
  }

  getCurrentQuestion() {
    return this.questions[this.currentQuestionIndex] || null;
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    return !this.isComplete();
  }

  isComplete() {
    return this.currentQuestionIndex >= this.questions.length;
  }

  getScorePercentage() {
    return Math.round((this.score / this.numberOfQuestions) * 100);
  }

  getHighScores() {
    try {
      const saved = localStorage.getItem("quizHighScores");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  saveHighScore() {
    const scores = this.getHighScores();

    scores.push({
      name: this.playerName,
      score: this.score,
      total: this.numberOfQuestions,
      percentage: this.getScorePercentage(),
      difficulty: this.difficulty,
      date: new Date().toISOString(),
    });

    scores.sort((a, b) => b.percentage - a.percentage);

    try {
      localStorage.setItem("quizHighScores", JSON.stringify(scores.slice(0, 10)));
    } catch (err) {
      console.warn("Could not save high score", err);
    }
  }

  isHighScore() {
    const scores = this.getHighScores();
    if (scores.length < 10) return true;
    return this.getScorePercentage() > scores[scores.length - 1].percentage;
  }

  endQuiz() {
    const percentage = this.getScorePercentage();
    const previousBest = this.getHighScores()[0];
    const isNewRecord = !previousBest || percentage > previousBest.percentage;

    if (this.isHighScore()) {
      this.saveHighScore();
    }

    const scores = this.getHighScores();
    const medals = ["gold", "silver", "bronze"];

    const leaderboardItems = scores
      .map(
        (item, i) => `
          <li class="leaderboard-item ${medals[i] || ""}">
            <span class="leaderboard-rank">#${i + 1}</span>
            <span class="leaderboard-name">${escapeHtml(item.name)}</span>
            <span class="leaderboard-score">${item.percentage}%</span>
          </li>`
      )
      .join("");

    const recordBadge =
      isNewRecord && percentage > 0
        ? `<div class="new-record-badge">
            <i class="fa-solid fa-star"></i> New High Score!
          </div>`
        : "";

    return `
      <div class="game-card results-card">
        <h2 class="results-title">Quiz Complete!</h2>
        <p class="results-score-display">${this.score}/${this.numberOfQuestions}</p>
        <p class="results-percentage">${percentage}% Accuracy</p>
        ${recordBadge}
        <div class="leaderboard">
          <h4 class="leaderboard-title">
            <i class="fa-solid fa-trophy"></i> Leaderboard
          </h4>
          <ul class="leaderboard-list">${leaderboardItems}</ul>
        </div>
        <div class="action-buttons">
          <button class="btn-restart">
            <i class="fa-solid fa-rotate-right"></i> Play Again
          </button>
        </div>
      </div>
    `;
  }
}
