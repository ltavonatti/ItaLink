/**
 * Native Audio Service for Italian Pronunciation & Web Audio Sound Effects
 * Zero external dependencies. Runs completely offline in modern browsers.
 */

class AudioService {
  private synth: SpeechSynthesis | null = null;
  private italianVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded: boolean = false;
  private audioCtx: AudioContext | null = null;
  private sfxEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.initVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.initVoices();
        }
      }

      // Check saved SFX preference
      const savedSfx = localStorage.getItem('zen_sfx_enabled');
      if (savedSfx !== null) {
        this.sfxEnabled = savedSfx === 'true';
      }
    }
  }

  private initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (voices.length > 0) {
      this.voicesLoaded = true;
      // Prioritize authentic Italian voices
      this.italianVoice =
        voices.find((v) => v.lang === 'it-IT' || v.lang.startsWith('it')) || null;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('zen_sfx_enabled', String(enabled));
    }
  }

  public toggleSfx(): boolean {
    this.setSfxEnabled(!this.sfxEnabled);
    return this.sfxEnabled;
  }

  /**
   * Play crisp card flip snap using Web Audio oscillator sweep
   */
  public playFlipSound(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // AudioContext policy catch
    }
  }

  /**
   * Play warm melodic chime for Mastered card
   */
  public playMasteredSound(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Dual harmonic chime: C5 (523Hz) & E5 (659Hz)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.08, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.35);
      });
    } catch {
      // AudioContext policy catch
    }
  }

  /**
   * Play gentle wooden knock / neutral tap for Need Practice
   */
  public playReviewSound(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // AudioContext policy catch
    }
  }

  /**
   * Speak Italian text at specified rate (normal = 1.0, slow = 0.8)
   */
  public speak(text: string, rate: number = 1.0): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }

      // Cancel any ongoing utterance to avoid queuing lag
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'it-IT';
      utterance.rate = Math.max(0.5, Math.min(rate, 1.5));
      utterance.pitch = 1.0;

      if (!this.italianVoice && !this.voicesLoaded) {
        this.initVoices();
      }

      if (this.italianVoice) {
        utterance.voice = this.italianVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      // Some browsers pause synthesis if window is blurred; resume handles this
      if (this.synth.paused) {
        this.synth.resume();
      }

      this.synth.speak(utterance);
    });
  }

  /**
   * Play Italian text at standard conversational speed (1.0x)
   */
  public playNormal(text: string): Promise<void> {
    return this.speak(text, 1.0);
  }

  /**
   * Play Italian text at slow deliberate speed (0.8x) to isolate phonetics
   */
  public playSlow(text: string): Promise<void> {
    return this.speak(text, 0.78);
  }

  /**
   * Play local audio file with automatic fallback handling
   */
  public playAudioFile(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(url);
        audio.onended = () => resolve(true);
        audio.onerror = () => resolve(false);
        audio.play().catch(() => resolve(false));
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Stop any playing audio immediately
   */
  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const audioService = new AudioService();
export default audioService;
