/**
 * Web Audio API Sound Synthesizer for MoneyTrace Tactical SOC Operations.
 * 100% Client-side synthetic audio — zero external file dependencies or 404s.
 */

class SoundAlarmService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenInterval: any = null;
  private isSirenActive: boolean = false;
  private isMuted: boolean = false;
  private snoozeUntil: number = 0;
  private activeOscillators: Set<OscillatorNode> = new Set();

  /**
   * Lazily obtain an active AudioContext with a dedicated master gain node.
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.isMuted || this.isSnoozed()) return null;

    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        const mg = this.ctx.createGain();
        mg.gain.setValueAtTime(1.0, this.ctx.currentTime);
        mg.connect(this.ctx.destination);
        this.masterGain = mg;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended' && !this.isSnoozed()) {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public snooze(minutes: number = 5) {
    this.snoozeUntil = Date.now() + minutes * 60 * 1000;
    this.stopAll();
  }

  public unsnooze() {
    this.snoozeUntil = 0;
  }

  public isSnoozed(): boolean {
    return Date.now() < this.snoozeUntil;
  }

  /**
   * Start continuous high-urgency tactical siren for CRITICAL / HIGH fraud alerts.
   * Alternates dual oscillators between 740Hz and 960Hz in a distinct warble.
   */
  public startSiren() {
    if (this.isMuted || this.isSnoozed() || this.isSirenActive) return;

    // Clear any previous interval before starting
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }

    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    try {
      this.isSirenActive = true;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.20, ctx.currentTime);
      gainNode.connect(this.masterGain);
      this.sirenGain = gainNode;

      let highPitch = false;
      const playPulse = () => {
        if (!this.isSirenActive || !this.sirenGain || this.isMuted || this.isSnoozed()) {
          this.stopAll();
          return;
        }

        try {
          if (!this.ctx || this.ctx.state === 'closed') return;
          const osc = this.ctx.createOscillator();
          osc.type = highPitch ? 'sawtooth' : 'sine';
          osc.frequency.setValueAtTime(highPitch ? 960 : 740, this.ctx.currentTime);
          osc.connect(this.sirenGain);

          this.activeOscillators.add(osc);
          osc.onended = () => this.activeOscillators.delete(osc);

          osc.start();
          osc.stop(this.ctx.currentTime + 0.38);

          highPitch = !highPitch;
        } catch {
          // Ignore context errors
        }
      };

      playPulse();
      this.sirenInterval = setInterval(playPulse, 420);
    } catch (e) {
      console.warn('Unable to initialize Web Audio siren:', e);
    }
  }

  /**
   * Immediately halts all siren, beeping, intervals, and active oscillators with 100% guarantee.
   * Keeps AudioContext alive so subsequent fraud alerts can sound without browser autoplay lockout.
   */
  public stopAll() {
    // 1. Immediately deactivate siren flags and clear interval loop
    this.isSirenActive = false;
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }

    // 2. Silence and disconnect siren gain
    if (this.sirenGain) {
      try {
        if (this.ctx) {
          this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
        this.sirenGain.disconnect();
      } catch {}
      this.sirenGain = null;
    }

    // 3. Disconnect all active oscillators FIRST, then stop
    this.activeOscillators.forEach((osc) => {
      try {
        osc.disconnect();
      } catch {}
      try {
        osc.stop();
      } catch {}
    });
    this.activeOscillators.clear();

    // 4. Ensure master gain is restored to unity for future sounds
    if (this.masterGain && this.ctx && this.ctx.state !== 'closed') {
      try {
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      } catch {}
    }

    // 5. Reset snooze timer so future new fraud alerts will sound the alarm immediately
    this.snoozeUntil = 0;
  }

  /**
   * Unlock AudioContext from user gesture
   */
  public unlockAudio() {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
  }

  /**
   * Alias for stopAll
   */
  public stopSiren() {
    this.stopAll();
  }

  /**
   * Play single short warning double-beep (e.g. for high risk notification).
   */
  public playWarningBeep() {
    if (this.isMuted || this.isSnoozed() || this.isSirenActive) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.connect(this.masterGain);

      // Beep 1
      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      osc1.connect(gain);
      this.activeOscillators.add(osc1);
      osc1.onended = () => this.activeOscillators.delete(osc1);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Beep 2
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1100, now + 0.16);
      osc2.connect(gain);
      this.activeOscillators.add(osc2);
      osc2.onended = () => this.activeOscillators.delete(osc2);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.28);
    } catch {}
  }

  /**
   * Play positive melodic success chime.
   */
  public playSuccessChime() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.connect(this.masterGain);

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        osc.connect(gain);
        this.activeOscillators.add(osc);
        osc.onended = () => this.activeOscillators.delete(osc);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.2);
      });
    } catch {}
  }

  /**
   * Play subtle blip for live transaction feed.
   */
  public playBlip() {
    if (this.isMuted || this.isSnoozed() || this.isSirenActive) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.06, now);
      gain.connect(this.masterGain);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.connect(gain);
      this.activeOscillators.add(osc);
      osc.onended = () => this.activeOscillators.delete(osc);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }
}

export const soundAlarm = new SoundAlarmService();

// Expose emergency kill-switch globally on window and auto-unlock on user gesture
if (typeof window !== 'undefined') {
  (window as any).__moneytrace_soundAlarm = soundAlarm;

  const unlockAudioOnGesture = () => {
    soundAlarm.unlockAudio();
    window.removeEventListener('click', unlockAudioOnGesture);
    window.removeEventListener('keydown', unlockAudioOnGesture);
    window.removeEventListener('touchstart', unlockAudioOnGesture);
  };
  window.addEventListener('click', unlockAudioOnGesture, { passive: true });
  window.addEventListener('keydown', unlockAudioOnGesture, { passive: true });
  window.addEventListener('touchstart', unlockAudioOnGesture, { passive: true });
}
