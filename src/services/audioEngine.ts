/**
 * Audio Engine: Web Audio synthesizer for background music + Speech synthesis synchronization
 */

export type AudioMood = 'ambient' | 'energetic' | 'lofi' | 'cinematic' | 'acoustic' | 'mute';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private isPlaying = false;
  private currentMood: AudioMood = 'cinematic';
  private timerId: number | null = null;
  private step = 0;
  private masterGain: GainNode | null = null;

  public init(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.destination) {
      this.destination = this.ctx.createMediaStreamDestination();
    }
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.35;
      // Connect to speakers and to media stream destination for recording
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.connect(this.destination);
    }
    return this.ctx;
  }

  public getAudioStream(): MediaStream | null {
    if (!this.destination) {
      this.init();
    }
    return this.destination?.stream || null;
  }

  public setMood(mood: AudioMood) {
    this.currentMood = mood;
  }

  public start(mood: AudioMood = 'cinematic') {
    this.currentMood = mood;
    if (this.currentMood === 'mute') return;

    this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.step = 0;

    const tempoMs = mood === 'energetic' ? 320 : mood === 'lofi' ? 480 : 600;

    this.playChordStep();
    this.timerId = window.setInterval(() => {
      if (!this.isPlaying) return;
      this.step++;
      this.playChordStep();
    }, tempoMs);
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private playChordStep() {
    if (!this.ctx || !this.masterGain || this.currentMood === 'mute') return;
    const now = this.ctx.currentTime;

    // Chord progressions in D minor / F major
    const chordProgressions = [
      [146.83, 220.0, 261.63, 329.63, 440.0], // Dm9
      [174.61, 261.63, 329.63, 392.0, 523.25], // Fmaj9
      [196.0, 293.66, 349.23, 440.0, 587.33],  // Gm9
      [220.0, 329.63, 392.0, 493.88, 659.25],  // Am9
    ];

    const chordIndex = Math.floor(this.step / 4) % chordProgressions.length;
    const currentChord = chordProgressions[chordIndex];
    const isNewChord = this.step % 4 === 0;

    // 1. Warm background pad on new chord
    if (isNewChord) {
      currentChord.slice(0, 3).forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = this.currentMood === 'lofi' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(this.currentMood === 'ambient' ? 600 : 1200, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 2.4);
      });

      // Deep Sub Bass note
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(currentChord[0] / 2, now);
      bassGain.gain.setValueAtTime(0.001, now);
      bassGain.gain.exponentialRampToValueAtTime(0.12, now + 0.1);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      bassOsc.connect(bassGain);
      bassGain.connect(this.masterGain);
      bassOsc.start(now);
      bassOsc.stop(now + 2.0);
    }

    // 2. Melodic arpeggio plucks
    const arpFreq = currentChord[(this.step % currentChord.length)];
    const arpOsc = this.ctx.createOscillator();
    const arpGain = this.ctx.createGain();

    arpOsc.type = this.currentMood === 'energetic' ? 'sawtooth' : 'triangle';
    arpOsc.frequency.setValueAtTime(arpFreq * 2, now);

    arpGain.gain.setValueAtTime(0.001, now);
    arpGain.gain.linearRampToValueAtTime(0.05, now + 0.02);
    arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    arpOsc.connect(arpGain);
    arpGain.connect(this.masterGain);

    arpOsc.start(now);
    arpOsc.stop(now + 0.4);

    // 3. Subtle percussion tick for beat
    if (this.currentMood === 'energetic' || this.currentMood === 'lofi') {
      const isKick = this.step % 4 === 0;
      const isSnare = this.step % 4 === 2;

      if (isKick) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(120, now);
        kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        kickGain.gain.setValueAtTime(0.15, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        kickOsc.connect(kickGain);
        kickGain.connect(this.masterGain);
        kickOsc.start(now);
        kickOsc.stop(now + 0.2);
      } else if (isSnare) {
        const snareOsc = this.ctx.createOscillator();
        const snareGain = this.ctx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(240, now);
        snareGain.gain.setValueAtTime(0.04, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        snareOsc.connect(snareGain);
        snareGain.connect(this.masterGain);
        snareOsc.start(now);
        snareOsc.stop(now + 0.12);
      }
    }
  }

  public isSpeechSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public getAvailableVoices(): {
    voiceURI: string;
    name: string;
    lang: string;
    localService: boolean;
  }[] {
    if (!this.isSpeechSynthesisSupported()) return [];
    const voices = window.speechSynthesis.getVoices();
    const sorted = [...voices].sort((a, b) => {
      const aEn = a.lang.toLowerCase().startsWith('en') ? 0 : 1;
      const bEn = b.lang.toLowerCase().startsWith('en') ? 0 : 1;
      if (aEn !== bEn) return aEn - bEn;
      return a.name.localeCompare(b.name);
    });
    return sorted.map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      localService: v.localService,
    }));
  }

  public subscribeVoicesChanged(callback: () => void): () => void {
    if (!this.isSpeechSynthesisSupported()) return () => {};
    const synth = window.speechSynthesis;
    synth.addEventListener('voiceschanged', callback);
    return () => {
      synth.removeEventListener('voiceschanged', callback);
    };
  }

  public isSpeaking(): boolean {
    return this.isSpeechSynthesisSupported() && window.speechSynthesis.speaking;
  }

  /**
   * Speak narration using Web Speech Synthesis API
   */
  public speakNarration(
    text: string,
    voiceIndexOrOptions:
      | number
      | {
          voiceIndex?: number;
          voiceURI?: string;
          rate?: number;
          pitch?: number;
          onStart?: () => void;
          onEnd?: () => void;
          onError?: (message: string) => void;
        } = 0,
    rateArg = 1.0
  ): Promise<void> {
    return new Promise((resolve) => {
      const opts =
        typeof voiceIndexOrOptions === 'number'
          ? { voiceIndex: voiceIndexOrOptions, rate: rateArg }
          : voiceIndexOrOptions || {};

      const cleanText = text.trim();
      if (!cleanText || !this.isSpeechSynthesisSupported()) {
        if (!this.isSpeechSynthesisSupported()) {
          opts.onError?.('Web Speech API is not supported in this browser.');
        }
        opts.onEnd?.();
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = opts.rate ?? 1.0;
      utterance.pitch = opts.pitch ?? 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (opts.voiceURI) {
        const matched = voices.find((v) => v.voiceURI === opts.voiceURI);
        if (matched) utterance.voice = matched;
      } else {
        const englishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
        if (englishVoices.length > 0) {
          const idx = opts.voiceIndex ?? 0;
          utterance.voice = englishVoices[idx % englishVoices.length] || englishVoices[0];
        }
      }

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        opts.onEnd?.();
        resolve();
      };

      utterance.onstart = () => {
        opts.onStart?.();
      };
      utterance.onend = () => finish();
      utterance.onerror = (ev) => {
        if (ev.error && ev.error !== 'interrupted' && ev.error !== 'canceled') {
          opts.onError?.(`Speech preview error: ${ev.error}`);
        }
        finish();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopNarration() {
    if (this.isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}

export const audioEngine = new AudioEngine();
