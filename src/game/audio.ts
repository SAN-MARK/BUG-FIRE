/**
 * WebAudio Synthesizer for BUG FIRE
 * Generates all SFX and 80s Vice City synthwave ambient audio procedurally.
 * No external sound files needed. Zero 404 risk.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private planeEngineOsc: OscillatorNode | null = null;
  private planeEngineGain: GainNode | null = null;
  private windOsc: AudioNode | null = null;
  private windGain: GainNode | null = null;
  private lobbyMusicTimer: number | null = null;
  private isLobbyMusicPlaying: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser autoplay policy
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('WebAudio init error:', e);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.5, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMasterVolume(vol: number) {
    if (!this.masterGain || !this.ctx || this.isMuted) return;
    this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
  }

  // --- Core SFX ---

  public playGunshot(weaponType: string = 'RIFLE') {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Noise burst for gunshot punch
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(weaponType === 'SHOTGUN' ? 1200 : 2800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.12);

    const gain = this.ctx.createGain();
    const volume = weaponType === 'SHOTGUN' ? 0.8 : weaponType === 'SNIPER' ? 0.9 : 0.45;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    // Sub bass pop
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(weaponType === 'SNIPER' ? 180 : 130, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);

    noise.start(now);
    osc.start(now);
    osc.stop(now + 0.15);
    noise.stop(now + 0.15);
  }

  public playHitMarker(isHeadshot: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = isHeadshot ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isHeadshot ? 1600 : 880, now);
    osc.frequency.exponentialRampToValueAtTime(isHeadshot ? 2400 : 1200, now + 0.06);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isHeadshot ? 0.45 : 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playReload() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Click 1 (mag out)
    this.playClick(now, 600, 0.04);
    // Click 2 (mag in)
    this.playClick(now + 0.35, 950, 0.05);
    // Slide rack
    this.playClick(now + 0.7, 1400, 0.06);
  }

  private playClick(time: number, freq: number, dur: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  public playFootstep(isWater: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isWater ? 220 : 80 + Math.random() * 30, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.05);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isWater ? 0.12 : 0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playJump() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playLand(hard: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(hard ? 120 : 80, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + (hard ? 0.2 : 0.1));

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(hard ? 0.5 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (hard ? 0.2 : 0.1));

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + (hard ? 0.22 : 0.12));
  }

  public playPickup() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const t = now + idx * 0.035;
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.09);
    });
  }

  public playZoneAlarm() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.25);
    osc.frequency.linearRampToValueAtTime(440, now + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playGlooWallPlace() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playExplosion() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + 0.8);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + 0.85);
  }

  // --- Continuous Sounds (Plane & Freefall Wind) ---

  public startPlaneEngine() {
    if (!this.ctx || this.planeEngineOsc) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    this.planeEngineOsc = osc;
    this.planeEngineGain = gain;
  }

  public updatePlaneEngine(throttle: number, speed: number) {
    if (!this.ctx || !this.planeEngineOsc || !this.planeEngineGain) return;
    const now = this.ctx.currentTime;
    const targetFreq = 70 + throttle * 80 + speed * 1.5;
    this.planeEngineOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
    this.planeEngineGain.gain.setTargetAtTime(0.08 + throttle * 0.12, now, 0.1);
  }

  public stopPlaneEngine() {
    if (this.planeEngineOsc) {
      try {
        this.planeEngineOsc.stop();
        this.planeEngineOsc.disconnect();
      } catch (e) {}
      this.planeEngineOsc = null;
      this.planeEngineGain = null;
    }
  }

  public startWindSound() {
    if (!this.ctx || this.windGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start();
    this.windOsc = noise;
    this.windGain = gain;
  }

  public updateWindSound(speed: number) {
    if (!this.ctx || !this.windGain) return;
    const factor = Math.min(1.0, Math.max(0, speed / 50));
    this.windGain.gain.setTargetAtTime(0.02 + factor * 0.25, this.ctx.currentTime, 0.1);
  }

  public stopWindSound() {
    if (this.windOsc) {
      try {
        (this.windOsc as AudioScheduledSourceNode).stop();
        this.windOsc.disconnect();
      } catch (e) {}
      this.windOsc = null;
      this.windGain = null;
    }
  }

  // --- Calm Vice City Synthwave Ambient Melody for Lobby ---

  public startLobbyMusic() {
    if (this.isLobbyMusicPlaying || !this.ctx) return;
    this.isLobbyMusicPlaying = true;

    const chordProgression = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23], // G7
    ];

    let chordIdx = 0;
    let step = 0;

    const playStep = () => {
      if (!this.isLobbyMusicPlaying || !this.ctx || this.isMuted) {
        if (this.isLobbyMusicPlaying) {
          this.lobbyMusicTimer = window.setTimeout(playStep, 400);
        }
        return;
      }

      const now = this.ctx.currentTime;
      const currentChord = chordProgression[chordIdx];
      const noteFreq = currentChord[step % currentChord.length] * 2;

      // Soft arpeggio note
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(noteFreq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.38);

      step++;
      if (step >= 8) {
        step = 0;
        chordIdx = (chordIdx + 1) % chordProgression.length;
      }

      this.lobbyMusicTimer = window.setTimeout(playStep, 260);
    };

    playStep();
  }

  public stopLobbyMusic() {
    this.isLobbyMusicPlaying = false;
    if (this.lobbyMusicTimer) {
      clearTimeout(this.lobbyMusicTimer);
      this.lobbyMusicTimer = null;
    }
  }

  public playWinFanfare() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C E G C E G
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.12;
      const osc = this.ctx!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }
}

export const soundEngine = new SoundEngine();
