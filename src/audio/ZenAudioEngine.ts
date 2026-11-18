import { SoundscapeType } from '../types/zen';

/**
 * Procedural Web Audio API sound engine for ZenVista.
 * Zero external audio files — synthesizes warm ambient drone pads,
 * pentatonic crystal chimes, and 4 dynamic nature soundscapes
 * (water stream, ocean waves, gentle breeze, bird chimes).
 */
export class ZenAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private droneOscs: OscillatorNode[] = [];
  private lfoOsc: OscillatorNode | null = null;

  // Nature Soundscape Nodes
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private waveLfo: OscillatorNode | null = null;
  private waveLfoGain: GainNode | null = null;
  private birdTimerId = 0;

  private muted = false;
  private initialized = false;
  private chimeIndex = 0;
  private currentSoundscape: SoundscapeType = 'water_stream';
  private bgMusic: HTMLAudioElement | null = null;
  private readonly bgMusicUrl =
    '/assets/aistudio/juliush-piano-drops-piano-soft-rain-or-flowing-water-interpretation-182329_2e6fd236.mp3';

  private readonly chimeScale = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1318.51, 1479.98];

  public ensureMusicPlaying(): void {
    if (typeof window === 'undefined') return;
    if (!this.bgMusic) {
      const music = new Audio(this.bgMusicUrl);
      music.loop = true;
      music.preload = 'auto';
      music.volume = this.muted ? 0 : 0.36;
      music.muted = this.muted;
      this.bgMusic = music;
    }
    if (!this.muted && this.bgMusic.paused) {
      void this.bgMusic.play().catch(() => {
        // Autoplay may require a user gesture; unlocked on first click/key
      });
    }
  }

  public init(): void {
    this.ensureMusicPlaying();
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.72;
    master.connect(ctx.destination);
    this.masterGain = master;

    // Gentle echo feedback network
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.34;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2100;

    delay.connect(delayFilter);
    delayFilter.connect(feedback);
    feedback.connect(delay);
    delayFilter.connect(master);
    this.delayNode = delay;

    // Warm ambient drone pad (D2, A2, E3, F#3)
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.0;
    this.droneGain = droneGain;

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 400;
    padFilter.Q.value = 0.7;

    droneGain.connect(padFilter);
    padFilter.connect(master);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 150;
    lfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    lfo.start();
    this.lfoOsc = lfo;

    const droneNotes: Array<{ freq: number; type: OscillatorType; detune: number; amp: number }> = [
      { freq: 73.42, type: 'sine', detune: -3, amp: 0.32 },
      { freq: 73.42, type: 'triangle', detune: 3, amp: 0.1 },
      { freq: 110.0, type: 'sine', detune: 2, amp: 0.22 },
      { freq: 164.81, type: 'sine', detune: -4, amp: 0.1 },
      { freq: 185.0, type: 'sine', detune: 4, amp: 0.07 },
    ];

    for (const n of droneNotes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.type;
      osc.frequency.value = n.freq;
      osc.detune.value = n.detune;
      g.gain.value = n.amp;
      osc.connect(g);
      g.connect(droneGain);
      osc.start();
      this.droneOscs.push(osc);
    }

    droneGain.gain.setTargetAtTime(0.08, ctx.currentTime, 1.8);

    // Synthesize 4-second looping pink-noise buffer for nature soundscapes
    const sampleRate = ctx.sampleRate;
    const bufferLen = sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferLen, sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < bufferLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.value = 780;
    nFilter.Q.value = 0.65;

    const nGain = ctx.createGain();
    nGain.gain.value = 0.001;

    const waveLfo = ctx.createOscillator();
    waveLfo.type = 'sine';
    waveLfo.frequency.value = 0.12;
    const waveLfoGain = ctx.createGain();
    waveLfoGain.gain.value = 0.04;
    waveLfo.connect(waveLfoGain);
    waveLfoGain.connect(nGain.gain);
    waveLfo.start();

    noiseSrc.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(master);
    noiseSrc.start();

    this.noiseSource = noiseSrc;
    this.noiseFilter = nFilter;
    this.noiseGain = nGain;
    this.waveLfo = waveLfo;
    this.waveLfoGain = waveLfoGain;

    this.initialized = true;
    this.applySoundscapeParams(this.currentSoundscape);
    this.scheduleBirdLoop();
  }

  public setSoundscape(soundscape: SoundscapeType): void {
    this.currentSoundscape = soundscape;
    if (this.initialized) {
      this.applySoundscapeParams(soundscape);
    }
  }

  public getSoundscape(): SoundscapeType {
    return this.currentSoundscape;
  }

  private applySoundscapeParams(soundscape: SoundscapeType): void {
    if (!this.ctx || !this.noiseFilter || !this.noiseGain || !this.waveLfo || !this.waveLfoGain) {
      return;
    }
    const now = this.ctx.currentTime;

    if (soundscape === 'water_stream') {
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.setTargetAtTime(920, now, 0.4);
      this.noiseFilter.Q.setTargetAtTime(0.55, now, 0.4);
      this.noiseGain.gain.setTargetAtTime(0.065, now, 0.5);
      this.waveLfo.frequency.setTargetAtTime(0.32, now, 0.4);
      this.waveLfoGain.gain.setTargetAtTime(0.02, now, 0.4);
    } else if (soundscape === 'ocean_waves') {
      this.noiseFilter.type = 'lowpass';
      this.noiseFilter.frequency.setTargetAtTime(520, now, 0.4);
      this.noiseFilter.Q.setTargetAtTime(0.7, now, 0.4);
      this.noiseGain.gain.setTargetAtTime(0.09, now, 0.5);
      this.waveLfo.frequency.setTargetAtTime(0.11, now, 0.4); // ~9-second slow ocean surf swell
      this.waveLfoGain.gain.setTargetAtTime(0.06, now, 0.4);
    } else if (soundscape === 'gentle_breeze') {
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.setTargetAtTime(420, now, 0.4);
      this.noiseFilter.Q.setTargetAtTime(1.15, now, 0.4);
      this.noiseGain.gain.setTargetAtTime(0.055, now, 0.5);
      this.waveLfo.frequency.setTargetAtTime(0.17, now, 0.4);
      this.waveLfoGain.gain.setTargetAtTime(0.03, now, 0.4);
    } else {
      // bird_chimes: airy rustle + soft periodic songbird chirps
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.setTargetAtTime(560, now, 0.4);
      this.noiseFilter.Q.setTargetAtTime(0.85, now, 0.4);
      this.noiseGain.gain.setTargetAtTime(0.045, now, 0.5);
      this.waveLfo.frequency.setTargetAtTime(0.14, now, 0.4);
      this.waveLfoGain.gain.setTargetAtTime(0.02, now, 0.4);
    }
  }

  private scheduleBirdLoop(): void {
    window.clearTimeout(this.birdTimerId);
    const nextMs = 3200 + Math.random() * 4200;
    this.birdTimerId = window.setTimeout(() => {
      if (this.initialized && !this.muted && this.currentSoundscape === 'bird_chimes') {
        this.playGentleBirdChirp();
      }
      if (this.initialized) {
        this.scheduleBirdLoop();
      }
    }, nextMs);
  }

  private playGentleBirdChirp(): void {
    if (!this.ctx || !this.masterGain || !this.delayNode) return;
    const now = this.ctx.currentTime;
    const base = 1320 + Math.random() * 520;
    const notes = [base, base * 1.18, base * 1.33];

    notes.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain || !this.delayNode) return;
      const t = now + i * 0.11;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.09, t + 0.07);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.032, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

      osc.connect(g);
      g.connect(this.masterGain);
      g.connect(this.delayNode);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.72, this.ctx.currentTime, 0.08);
    }
    if (this.bgMusic) {
      this.bgMusic.muted = mute;
      this.bgMusic.volume = mute ? 0 : 0.36;
      if (!mute && this.bgMusic.paused) {
        void this.bgMusic.play().catch(() => {});
      }
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playCrystalChime(pitchOffset = 0): void {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.masterGain || !this.delayNode) return;

    const now = this.ctx.currentTime;
    const baseFreq = this.chimeScale[(this.chimeIndex + pitchOffset) % this.chimeScale.length];
    this.chimeIndex = (this.chimeIndex + 1) % this.chimeScale.length;

    const partials = [
      { ratio: 1.0, gain: 0.22, dur: 2.1 },
      { ratio: 2.0, gain: 0.08, dur: 1.3 },
      { ratio: 3.01, gain: 0.035, dur: 0.75 },
    ];

    for (const p of partials) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * p.ratio, now);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(p.gain, now + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);

      osc.connect(g);
      g.connect(this.masterGain);
      g.connect(this.delayNode);

      osc.start(now);
      osc.stop(now + p.dur + 0.05);
    }
  }

  public playCycleCompleteChord(): void {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.masterGain || !this.delayNode) return;

    const now = this.ctx.currentTime;
    const chord = [293.66, 440.0, 587.33, 739.99];

    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain || !this.delayNode) return;
      const start = now + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.11, start + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 2.8);

      osc.connect(g);
      g.connect(this.masterGain);
      g.connect(this.delayNode);

      osc.start(start);
      osc.stop(start + 2.9);
    });
  }

  public playUiTap(high = false): void {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(high ? 880 : 520, now);
    osc.frequency.exponentialRampToValueAtTime(high ? 1040 : 410, now + 0.09);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.14, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(g);
    g.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playPhaseCue(phase: 'inhale' | 'hold' | 'exhale'): void {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.masterGain || !this.delayNode) return;

    const now = this.ctx.currentTime;
    const freqMap = {
      inhale: 440.0,
      hold: 587.33,
      exhale: 369.99,
    };
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqMap[phase], now);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.08, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

    osc.connect(g);
    g.connect(this.masterGain);
    g.connect(this.delayNode);

    osc.start(now);
    osc.stop(now + 1.15);
  }

  public dispose(): void {
    window.clearTimeout(this.birdTimerId);
    for (const osc of this.droneOscs) {
      try {
        osc.stop();
      } catch {
        // ignore
      }
    }
    try {
      this.lfoOsc?.stop();
    } catch {
      // ignore
    }
    try {
      this.noiseSource?.stop();
    } catch {
      // ignore
    }
    try {
      this.waveLfo?.stop();
    } catch {
      // ignore
    }
    this.droneOscs = [];
    this.lfoOsc = null;
    this.noiseSource = null;
    this.waveLfo = null;
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic.src = '';
      this.bgMusic = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
