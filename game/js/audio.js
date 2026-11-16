// audio.js — every sound in Lanternkeeper is synthesised with WebAudio
// oscillators; the game ships no audio files at all. The bank stays silent
// until the first user gesture creates the context, as browsers require.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  // Called from the first click or key press of a session.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    this.ctx = new AudioCtor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.16;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.16;
    return this.muted;
  }

  // One short oscillator voice with an exponential decay envelope.
  tone(freqFrom, freqTo, seconds, type, volume) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  shoot() {
    this.tone(920, 340, 0.07, 'square', 0.25);
  }

  hit() {
    this.tone(300, 140, 0.05, 'triangle', 0.3);
  }

  banish() {
    this.tone(520, 1180, 0.14, 'sine', 0.35);
  }

  ember() {
    this.tone(1240, 1760, 0.12, 'sine', 0.3);
  }

  hurt() {
    this.tone(160, 70, 0.18, 'sawtooth', 0.4);
  }

  flameHurt() {
    this.tone(220, 90, 0.22, 'sawtooth', 0.3);
  }

  waveHorn() {
    this.tone(196, 196, 0.28, 'triangle', 0.4);
    this.tone(294, 294, 0.28, 'triangle', 0.25);
  }

  dawn() {
    this.tone(392, 392, 0.5, 'sine', 0.3);
    this.tone(494, 494, 0.5, 'sine', 0.25);
    this.tone(587, 587, 0.7, 'sine', 0.25);
  }

  gameOver() {
    this.tone(330, 82, 0.8, 'triangle', 0.35);
  }
}
