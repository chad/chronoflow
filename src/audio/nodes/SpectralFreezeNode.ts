// SpectralFreezeNode - FFT-based spectral freeze/blur for infinite sustain textures
// Captures and holds the frequency spectrum of the input signal
// Creates the "PaulStretch" / frozen soundscape effect beloved in ambient music
//
// How it works:
// 1. Continuously FFT-analyzes input audio
// 2. On "freeze", captures the current spectrum
// 3. Resynthesizes the frozen spectrum with randomized phases (to avoid artifacts)
// 4. "Blur" smooths the spectrum over time for evolving textures
// 5. "Shift" moves the spectrum up or down for otherworldly sounds

import type { SynthNode, AudioNodeParams } from './types';

export interface SpectralFreezeParams {
  freeze: boolean;   // Whether the spectrum is frozen
  blur: number;      // Spectral blur/smear amount (0-1)
  shift: number;     // Spectral shift in semitones (-24 to +24)
  brightness: number; // High-frequency emphasis (0-1)
  feedback: number;  // Spectral feedback (0-0.95) - feeds output back for evolution
  mix: number;       // Dry/wet (0-1)
  grainSize: number; // Resynthesis grain size in ms (50-500)
}

const DEFAULT_PARAMS: SpectralFreezeParams = {
  freeze: false,
  blur: 0.5,
  shift: 0,
  brightness: 0.7,
  feedback: 0.3,
  mix: 0.8,
  grainSize: 200,
};

const FFT_SIZE = 2048;

export class SynthSpectralFreezeNode implements SynthNode {
  id: string;
  type = 'spectralfreeze';

  private context: AudioContext;
  private params: SpectralFreezeParams;

  private inputGain: GainNode;
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;

  // FFT analysis
  private analyser: AnalyserNode;
  // Using 'any' to avoid TS5 ArrayBufferLike vs ArrayBuffer incompatibility with Web Audio API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private frequencyData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private frozenSpectrum: any = null;
  private currentSpectrum: Float32Array;
  private blurredSpectrum: Float32Array;

  // Resynthesis via overlapping grains
  private grainInterval: number | null = null;
  private activeGrains: Set<AudioBufferSourceNode> = new Set();

  // Feedback path
  private feedbackGain: GainNode;
  private feedbackAnalyser: AnalyserNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private feedbackData: any;

  constructor(context: AudioContext, id: string, params?: Partial<SpectralFreezeParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // I/O
    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;
    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;
    this.dryGain = context.createGain();
    this.wetGain = context.createGain();

    // Analysis
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.8;

    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    this.currentSpectrum = new Float32Array(this.analyser.frequencyBinCount);
    this.blurredSpectrum = new Float32Array(this.analyser.frequencyBinCount);

    // Feedback
    this.feedbackGain = context.createGain();
    this.feedbackGain.gain.value = this.params.feedback;
    this.feedbackAnalyser = context.createAnalyser();
    this.feedbackAnalyser.fftSize = FFT_SIZE;
    this.feedbackData = new Float32Array(this.feedbackAnalyser.frequencyBinCount);

    // Signal routing
    this.inputGain.connect(this.dryGain);
    this.inputGain.connect(this.analyser);
    this.dryGain.connect(this.outputGain);
    this.wetGain.connect(this.outputGain);

    // Feedback: wet output → feedback gain → feedback analyser
    this.wetGain.connect(this.feedbackGain);
    this.feedbackGain.connect(this.feedbackAnalyser);

    this.updateMix();

    // Start resynthesis
    this.startResynthesis();
  }

  private startResynthesis(): void {
    if (this.grainInterval !== null) {
      window.clearInterval(this.grainInterval);
    }

    const intervalMs = this.params.grainSize / 2; // 50% overlap
    this.grainInterval = window.setInterval(() => this.synthesizeGrain(), intervalMs);
  }

  private synthesizeGrain(): void {
    // Get current input spectrum
    this.analyser.getFloatFrequencyData(this.frequencyData);

    // Convert from dB to linear magnitude
    const binCount = this.analyser.frequencyBinCount;
    for (let i = 0; i < binCount; i++) {
      this.currentSpectrum[i] = Math.pow(10, this.frequencyData[i] / 20);
    }

    // Use frozen spectrum if frozen, otherwise use live spectrum
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sourceSpectrum: any;
    if (this.params.freeze && this.frozenSpectrum) {
      sourceSpectrum = this.frozenSpectrum;
    } else {
      sourceSpectrum = this.currentSpectrum;
      // Capture spectrum for freeze
      if (!this.frozenSpectrum) {
        this.frozenSpectrum = new Float32Array(binCount);
      }
      this.frozenSpectrum.set(this.currentSpectrum);
    }

    // Apply spectral blur (smooth magnitudes across bins)
    const blur = this.params.blur;
    if (blur > 0) {
      const blurWidth = Math.floor(blur * 20) + 1;
      for (let i = 0; i < binCount; i++) {
        let sum = 0;
        let count = 0;
        for (let j = -blurWidth; j <= blurWidth; j++) {
          const idx = i + j;
          if (idx >= 0 && idx < binCount) {
            sum += sourceSpectrum[idx];
            count++;
          }
        }
        this.blurredSpectrum[i] = sum / count;
      }
    } else {
      this.blurredSpectrum.set(sourceSpectrum);
    }

    // Mix with feedback spectrum for evolution
    if (this.params.feedback > 0) {
      this.feedbackAnalyser.getFloatFrequencyData(this.feedbackData);
      for (let i = 0; i < binCount; i++) {
        const fbMag = Math.pow(10, this.feedbackData[i] / 20);
        this.blurredSpectrum[i] = this.blurredSpectrum[i] * (1 - this.params.feedback * 0.5) +
                                   fbMag * this.params.feedback * 0.5;
      }
    }

    // Apply spectral shift
    if (this.params.shift !== 0) {
      const shiftBins = Math.round(this.params.shift * binCount / 48); // Approximate semitone mapping
      const shifted = new Float32Array(binCount);
      for (let i = 0; i < binCount; i++) {
        const srcIdx = i - shiftBins;
        if (srcIdx >= 0 && srcIdx < binCount) {
          shifted[i] = this.blurredSpectrum[srcIdx];
        }
      }
      this.blurredSpectrum.set(shifted);
    }

    // Apply brightness
    const brightness = this.params.brightness;
    for (let i = 0; i < binCount; i++) {
      const freqFraction = i / binCount;
      // Tilt: brightness > 0.5 boosts highs, < 0.5 cuts highs
      const tilt = Math.pow(freqFraction, 2 - brightness * 4);
      this.blurredSpectrum[i] *= Math.max(0.01, tilt);
    }

    // Resynthesize as a grain with randomized phases
    const grainDuration = this.params.grainSize / 1000;
    const grainSamples = Math.floor(grainDuration * this.context.sampleRate);
    const grainBuffer = this.context.createBuffer(2, grainSamples, this.context.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = grainBuffer.getChannelData(ch);

      // Additive synthesis from spectrum
      // Use a subset of bins for efficiency
      const maxBins = Math.min(256, binCount);
      const binStep = Math.max(1, Math.floor(binCount / maxBins));

      for (let i = 0; i < grainSamples; i++) {
        let sample = 0;
        const t = i / this.context.sampleRate;

        // Apply Hann window
        const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / grainSamples));

        for (let bin = 1; bin < maxBins; bin += 1) {
          const binIdx = bin * binStep;
          if (binIdx >= binCount) break;

          const magnitude = this.blurredSpectrum[binIdx];
          if (magnitude < 0.0001) continue; // Skip silent bins

          const frequency = binIdx * this.context.sampleRate / FFT_SIZE;
          // Random phase per bin per grain (this is what makes it sound like PaulStretch)
          const phase = (ch === 0 ? 0 : Math.PI * 0.3) + bin * 12345.6789; // Deterministic-ish per grain

          sample += magnitude * Math.sin(2 * Math.PI * frequency * t + phase);
        }

        data[i] = sample * window * 0.02; // Scale down to prevent clipping
      }
    }

    // Play the grain
    const source = this.context.createBufferSource();
    source.buffer = grainBuffer;
    source.connect(this.wetGain);

    this.activeGrains.add(source);
    source.onended = () => {
      this.activeGrains.delete(source);
    };

    source.start();
  }

  private updateMix(): void {
    const now = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, now, 0.01);
    this.wetGain.gain.setTargetAtTime(this.params.mix, now, 0.01);
  }

  // Capture current spectrum and freeze
  captureAndFreeze(): void {
    this.params.freeze = true;
    // Force capture on next grain
    this.frozenSpectrum = null;
  }

  // Release freeze
  unfreeze(): void {
    this.params.freeze = false;
  }

  getOutputNode(): AudioNode { return this.outputGain; }
  getInputNode(): AudioNode { return this.inputGain; }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'mix_mod': return this.wetGain.gain;
      case 'feedback_mod': return this.feedbackGain.gain;
      default: return null;
    }
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) this.outputGain.connect(input);
    } else {
      this.outputGain.connect(destination);
    }
  }

  disconnect(): void { this.outputGain.disconnect(); }

  setParam(name: string, value: number | string | boolean): void {
    switch (name) {
      case 'freeze':
        this.params.freeze = value === true || value === 'true' || value === 1;
        if (this.params.freeze) {
          // Capture on next grain cycle
          this.frozenSpectrum = null;
        }
        break;
      case 'blur':
        this.params.blur = Math.max(0, Math.min(1, value as number));
        break;
      case 'shift':
        this.params.shift = Math.max(-24, Math.min(24, value as number));
        break;
      case 'brightness':
        this.params.brightness = Math.max(0, Math.min(1, value as number));
        break;
      case 'feedback':
        this.params.feedback = Math.max(0, Math.min(0.95, value as number));
        this.feedbackGain.gain.setTargetAtTime(this.params.feedback, this.context.currentTime, 0.01);
        break;
      case 'mix':
        this.params.mix = Math.max(0, Math.min(1, value as number));
        this.updateMix();
        break;
      case 'grainSize':
        this.params.grainSize = Math.max(50, Math.min(500, value as number));
        this.startResynthesis(); // Restart with new grain size
        break;
    }
  }

  getParams(): AudioNodeParams { return { ...this.params }; }

  // Trigger: toggle freeze
  trigger(): void {
    if (this.params.freeze) {
      this.unfreeze();
    } else {
      this.captureAndFreeze();
    }
  }

  dispose(): void {
    if (this.grainInterval !== null) {
      window.clearInterval(this.grainInterval);
    }

    this.activeGrains.forEach(source => {
      try { source.stop(); } catch { /* ok */ }
    });
    this.activeGrains.clear();

    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.analyser.disconnect();
    this.feedbackGain.disconnect();
    this.feedbackAnalyser.disconnect();
  }
}
