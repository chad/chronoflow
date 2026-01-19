// AudioEngine - manages the AudioContext singleton and audio initialization

class AudioEngine {
  private static instance: AudioEngine | null = null;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private constructor() {}

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  async init(): Promise<AudioContext> {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return this.audioContext;
    }

    this.audioContext = new AudioContext();

    // Create master gain for overall volume control
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.audioContext.destination);

    return this.audioContext;
  }

  getContext(): AudioContext | null {
    return this.audioContext;
  }

  getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  getDestination(): AudioNode {
    if (!this.masterGain) {
      throw new Error('AudioEngine not initialized. Call init() first.');
    }
    return this.masterGain;
  }

  setMasterVolume(value: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  isInitialized(): boolean {
    return this.audioContext !== null;
  }

  getState(): AudioContextState | null {
    return this.audioContext?.state ?? null;
  }

  async suspend(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'running') {
      await this.audioContext.suspend();
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async close(): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
      this.masterGain = null;
    }
  }
}

export const audioEngine = AudioEngine.getInstance();
export default audioEngine;
