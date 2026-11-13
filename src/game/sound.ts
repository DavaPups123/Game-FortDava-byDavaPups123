export class SoundEngine {
  private ctx: AudioContext | null = null;
  private volume = 0.7;
  private muted = false;
  private danceTimer = 0;

  init(): void {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }) : undefined;
    if (nav?.userActivation && !nav.userActivation.hasBeenActive) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
  }

  setMuted(m: boolean): void {
    this.muted = m;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private get effectiveVolume(): number {
    return this.muted ? 0 : this.volume;
  }

  playShoot(weaponId: string, distance = 0): void {
    if (!this.ctx || this.effectiveVolume <= 0.01) return;
    const atten = Math.max(0, 1 - distance / 210);
    if (atten <= 0.02) return;
    const now = this.ctx.currentTime;
    const gainVal =
      this.effectiveVolume *
      atten *
      (weaponId === 'shotgun' || weaponId === 'rpg' ? 0.42 : weaponId === 'sniper' ? 0.48 : 0.25);

    const dur = weaponId === 'rpg' ? 0.35 : weaponId === 'sniper' ? 0.28 : weaponId === 'shotgun' ? 0.22 : 0.1;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(weaponId === 'smg' ? 2500 : weaponId === 'shotgun' ? 1200 : 1850, now);
    filter.frequency.exponentialRampToValueAtTime(190, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    const startFreq = weaponId === 'sniper' ? 195 : weaponId === 'shotgun' ? 130 : 165;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + dur * 0.8);
    oscGain.gain.setValueAtTime(gainVal * 0.85, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.8);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur * 0.8);
  }

  playExplosion(distance = 0): void {
    if (!this.ctx || this.effectiveVolume <= 0.01) return;
    const atten = Math.max(0, 1 - distance / 240);
    if (atten <= 0.02) return;
    const now = this.ctx.currentTime;
    const dur = 0.55;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(55, now + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.effectiveVolume * atten * 0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playHit(isShield = false, isKill = false): void {
    if (!this.ctx || this.effectiveVolume <= 0.01) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isKill ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isKill ? 960 : isShield ? 1380 : 800, now);
    osc.frequency.exponentialRampToValueAtTime(isKill ? 420 : 310, now + 0.09);
    gain.gain.setValueAtTime(this.effectiveVolume * 0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playChestOpen(isTokenChest = false): void {
    if (!this.ctx || this.effectiveVolume <= 0.01) return;
    const now = this.ctx.currentTime;
    const notes = isTokenChest ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(this.effectiveVolume * 0.22, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.28);
    });
  }

  playBusHorn(): void {
    if (!this.ctx || this.effectiveVolume <= 0.01) return;
    const now = this.ctx.currentTime;
    [220, 277.18].forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(this.effectiveVolume * 0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);
    });
  }

  playLaunchPad(): void {
    if (!this.ctx || this.effectiveVolume <= 0.01) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
    gain.gain.setValueAtTime(this.effectiveVolume * 0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  playBuild(): void {
    if (!this.ctx || this.effectiveVolume <= 0.01) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(215, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.08);
    gain.gain.setValueAtTime(this.effectiveVolume * 0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playPickup(): void {
    if (!this.ctx || this.effectiveVolume <= 0.01) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(780, now + 0.06);
    gain.gain.setValueAtTime(this.effectiveVolume * 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  playReload(): void {
    if (!this.ctx || this.effectiveVolume <= 0.01) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.setValueAtTime(640, now + 0.07);
    gain.gain.setValueAtTime(this.effectiveVolume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playVictoryFanfare(): void {
    if (!this.ctx || this.effectiveVolume <= 0.01) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.09);
      gain.gain.setValueAtTime(this.effectiveVolume * 0.24, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.5);
    });
  }

  tickDanceBeat(dt: number, emoteId: string | null): void {
    if (!emoteId || !this.ctx || this.effectiveVolume <= 0.01) {
      this.danceTimer = 0;
      return;
    }
    this.danceTimer += dt;
    const stepInterval = emoteId === 'hyper_jump' ? 0.24 : emoteId === 'robot' ? 0.36 : 0.3;
    if (this.danceTimer >= stepInterval) {
      this.danceTimer -= stepInterval;
      const now = this.ctx.currentTime;
      const scale = emoteId === 'robot' ? [220, 330, 261.6, 440] : [330, 392, 440, 523.25, 659.25];
      const freq = scale[Math.floor(Math.random() * scale.length)];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = emoteId === 'robot' ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(this.effectiveVolume * 0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    }
  }
}
