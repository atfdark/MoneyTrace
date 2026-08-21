/**
 * Web Audio API Sound Synthesizer for MoneyTrace Tactical SOC Operations.
 * 100% Client-side synthetic audio — zero external file dependencies or 404s.
 */

class SoundAlarmService {
  private ctx: AudioContext | null = null;
  private sirenOsc1: OscillatorNode | null = null;
  private sirenOsc2: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenInterval: any = null;
  private isSirenActive: boolean = false;
  private isMuted: boolean = false;
  private snoozeUntil: number = 0;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopSiren();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public snooze(minutes: number = 5) {
    this.snoozeUntil = Date.now() + minutes * 60 * 1000;
    this.stopSiren();
  }

  public isSnoozed(): boolean {
    return Date.now() < this.snoozeUntil;
  }

  /**
   * Start continuous high-urgency tactical siren for CRITICAL / HIGH fraud alerts.
   * Modulates dual oscillators between 720Hz and 980Hz in an alternating warble.
   */
  public startSiren() {
    if (this.isMuted || this.isSnoozed() || this.isSirenActive) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      this.isSirenActive = true;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.18, ctx.currentTime);
      gainNode.connect(ctx.destination);
      this.sirenGain = gainNode;

      let highPitch = false;
      const playPulse = () => {
        if (!this.isSirenActive || !this.sirenGain) return;

        const osc = ctx.createOscillator();
        osc.type = highPitch ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(highPitch ? 960 : 740, ctx.currentTime);
        osc.connect(this.sirenGain);

        osc.start();
        osc.stop(ctx.currentTime + 0.38);

        highPitch = !highPitch;
      };

      playPulse();
      this.sirenInterval = setInterval(playPulse, 420);
    } catch (e) {
      console.warn('Unable to initialize Web Audio siren:', e);
    }
  }

  /**
   * Stop repeating alarm.
   */
  public stopSiren() {
    this.isSirenActive = false;
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.sirenGain) {
      try {
        this.sirenGain.disconnect();
      } catch {}
      this.sirenGain = null;
    }
  }

  /**
   * Play single short warning double-beep (e.g. for medium/high risk notification).
   */
  public playWarningBeep() {
    if (this.isMuted || this.isSnoozed()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.connect(ctx.destination);

      // Beep 1
      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      osc1.connect(gain);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Beep 2
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1100, now + 0.16);
      osc2.connect(gain);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.28);
    } catch {}
  }

  /**
   * Play positive melodic success chime (e.g. payment completed, alert resolved).
   */
  public playSuccessChime() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.connect(ctx.destination);

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        osc.connect(gain);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.2);
      });
    } catch {}
  }

  /**
   * Play subtle blip for live transaction feed / presence notification.
   */
  public playBlip() {
    if (this.isMuted || this.isSnoozed()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.06, now);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }
}

export const soundAlarm = new SoundAlarmService();
