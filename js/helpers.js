export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let audioCtx = null;

const SOUNDS = {
  correct: [
    { freq: 523.25, start: 0, duration: 0.12, type: "sine" },
    { freq: 659.25, start: 0.12, duration: 0.12, type: "sine" },
    { freq: 783.99, start: 0.24, duration: 0.25, type: "sine" },
  ],
  wrong: [
    { freq: 220, start: 0, duration: 0.18, type: "sawtooth" },
    { freq: 164.81, start: 0.18, duration: 0.3, type: "sawtooth" },
  ],
  timeup: [
    { freq: 440, start: 0, duration: 0.15, type: "square" },
    { freq: 330, start: 0.18, duration: 0.15, type: "square" },
    { freq: 220, start: 0.36, duration: 0.3, type: "square" },
  ],
};

export function playSound(name) {
  const notes = SOUNDS[name];
  if (!notes) return;

  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();

    const now = audioCtx.currentTime;

    notes.forEach((note) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = note.type;
      osc.frequency.value = note.freq;

      gain.gain.setValueAtTime(0.0001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.2, now + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + note.start + note.duration
      );

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.05);
    });
  } catch (err) {
    console.warn("Sound unavailable", err);
  }
}
