// KarplusStrongNode - Physical modeling string synthesis
// Creates realistic plucked string/bell tones using delay + filtered feedback

import type { SynthNode, AudioNodeParams } from './types';

export interface KarplusStrongParams {
  frequency: number; // Pitch in Hz
  damping: number; // High frequency damping (0-1, higher = darker/faster decay)
  feedback: number; // Sustain amount (0-1, higher = longer decay)
  brightness: number; // Exciter brightness (0-1)
  pluck: number; // Pluck position simulation (0-1, affects harmonics)
}

const DEFAULT_PARAMS: KarplusStrongParams = {
  frequency: 220,
  damping: 0.5,
  feedback: 0.99,
  brightness: 0.7,
  pluck: 0.5,
};

export class SynthKarplusStrongNode implements SynthNode {
  id: string;
  type = 'karplusstrong';

  private context: AudioContext;
  private params: KarplusStrongParams;

  // Audio nodes
  private delayNode: DelayNode;
  private feedbackGain: GainNode;
  private dampingFilter: BiquadFilterNode;
  private outputGain: GainNode;
  private inputGain: GainNode;

  // For internal excitation
  private noiseBuffer: AudioBuffer | null = null;

  // For trigger detection
  private triggerInput: GainNode;
  private triggerAnalyser: AnalyserNode;
  private triggerData: Float32Array;
  private lastTriggerValue: number = 0;
  private triggerCheckInterval: number | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<KarplusStrongParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Create the Karplus-Strong feedback loop
    // Signal flow: input/exciter -> delay -> damping filter -> feedback gain -> delay (loop)
    //                                    \-> output

    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    this.delayNode = context.createDelay(1); // Max 1 second delay
    this.updateDelayTime();

    this.dampingFilter = context.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';
    this.updateDamping();

    this.feedbackGain = context.createGain();
    this.updateFeedback();

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 0.8;

    // Create the feedback loop
    // Input goes to delay
    this.inputGain.connect(this.delayNode);

    // Delay output goes to both: output AND damping filter
    this.delayNode.connect(this.outputGain);
    this.delayNode.connect(this.dampingFilter);

    // Damping filter -> feedback gain -> back to delay
    this.dampingFilter.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);

    // Create noise buffer for plucking
    this.createNoiseBuffer();

    // Set up trigger input detection
    this.triggerInput = context.createGain();
    this.triggerInput.gain.value = 1;
    this.triggerAnalyser = context.createAnalyser();
    this.triggerAnalyser.fftSize = 256;
    this.triggerData = new Float32Array(this.triggerAnalyser.fftSize);
    this.triggerInput.connect(this.triggerAnalyser);

    // Start trigger detection
    this.startTriggerDetection();
  }

  private startTriggerDetection(): void {
    // Check for triggers at 120Hz (fast enough for musical timing)
    this.triggerCheckInterval = window.setInterval(() => {
      this.checkTrigger();
    }, 8);
  }

  private checkTrigger(): void {
    this.triggerAnalyser.getFloatTimeDomainData(this.triggerData as Float32Array<ArrayBuffer>);
    const currentValue = this.triggerData[0] || 0;

    // Detect rising edge (crossing threshold from below)
    const threshold = 0.1;
    if (currentValue > threshold && this.lastTriggerValue <= threshold) {
      this.trigger(Math.min(1, currentValue)); // Use signal amplitude as velocity
    }

    this.lastTriggerValue = currentValue;
  }

  // Get trigger input node for external connections
  getTriggerInput(): AudioNode {
    return this.triggerInput;
  }

  private createNoiseBuffer(): void {
    // Create a short burst of filtered noise for excitation
    const duration = 0.05; // 50ms burst
    const sampleRate = this.context.sampleRate;
    const length = Math.floor(duration * sampleRate);
    this.noiseBuffer = this.context.createBuffer(1, length, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);

    // Generate noise with envelope
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Quick attack, quick decay envelope
      const envelope = t < 0.1 ? t * 10 : Math.pow(1 - (t - 0.1) / 0.9, 2);
      // Noise
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }

  private updateDelayTime(): void {
    // Delay time = 1 / frequency (period of the wave)
    const delayTime = 1 / this.params.frequency;
    // Clamp to valid range
    const clampedDelay = Math.max(0.001, Math.min(1, delayTime));
    this.delayNode.delayTime.setValueAtTime(clampedDelay, this.context.currentTime);
  }

  private updateDamping(): void {
    // Damping controls the lowpass filter cutoff
    // Higher damping = lower cutoff = faster high frequency decay = darker sound
    const minCutoff = 200;
    const maxCutoff = 8000;
    // Invert damping so higher damping = lower cutoff
    const cutoff = minCutoff + (1 - this.params.damping) * (maxCutoff - minCutoff);
    this.dampingFilter.frequency.setValueAtTime(cutoff, this.context.currentTime);
    this.dampingFilter.Q.value = 0.5;
  }

  private updateFeedback(): void {
    // Feedback controls sustain - how long the string rings
    // Slightly reduce feedback for higher frequencies (natural behavior)
    const baseFeedback = this.params.feedback;
    this.feedbackGain.gain.setValueAtTime(baseFeedback, this.context.currentTime);
  }

  // Trigger a pluck (internal excitation)
  trigger(velocity: number = 1): void {
    if (!this.noiseBuffer) return;

    // Create noise burst source
    const noiseSource = this.context.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    // Brightness filter - filters the exciter noise
    const brightnessFilter = this.context.createBiquadFilter();
    brightnessFilter.type = 'lowpass';
    const brightnessFreq = 500 + this.params.brightness * 7500; // 500 - 8000 Hz
    brightnessFilter.frequency.value = brightnessFreq;

    // Pluck position filter - comb filter effect
    // Position affects which harmonics are emphasized
    const pluckDelay = this.context.createDelay(0.02);
    const pluckTime = this.params.pluck * 0.01; // 0-10ms
    pluckDelay.delayTime.value = pluckTime;
    const pluckMix = this.context.createGain();
    pluckMix.gain.value = 0.5;

    // Velocity affects amplitude
    const velocityGain = this.context.createGain();
    velocityGain.gain.value = velocity;

    // Connect exciter chain
    noiseSource.connect(brightnessFilter);
    brightnessFilter.connect(velocityGain);
    brightnessFilter.connect(pluckDelay);
    pluckDelay.connect(pluckMix);
    pluckMix.connect(velocityGain);
    velocityGain.connect(this.inputGain);

    noiseSource.start();
    noiseSource.stop(this.context.currentTime + 0.05);
  }

  // Set frequency via external CV (for sequencer connection)
  setFrequency(freq: number): void {
    this.params.frequency = Math.max(20, Math.min(2000, freq));
    this.updateDelayTime();
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    // External input goes through the delay line (can be used for external excitation)
    return this.inputGain;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'freq_mod':
        // For frequency modulation, return delay time (inverse relationship)
        return this.delayNode.delayTime;
      case 'feedback_mod':
        return this.feedbackGain.gain;
      default:
        return null;
    }
  }

  connect(destination: AudioNode | SynthNode): void {
    if ('getInputNode' in destination) {
      const input = destination.getInputNode();
      if (input) {
        this.outputGain.connect(input);
      }
    } else {
      this.outputGain.connect(destination);
    }
  }

  disconnect(): void {
    this.outputGain.disconnect();
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'frequency':
        this.params.frequency = Math.max(20, Math.min(2000, value as number));
        this.updateDelayTime();
        break;
      case 'damping':
        this.params.damping = Math.max(0, Math.min(1, value as number));
        this.updateDamping();
        break;
      case 'feedback':
        this.params.feedback = Math.max(0, Math.min(0.999, value as number));
        this.updateFeedback();
        break;
      case 'brightness':
        this.params.brightness = Math.max(0, Math.min(1, value as number));
        break;
      case 'pluck':
        this.params.pluck = Math.max(0, Math.min(1, value as number));
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    if (this.triggerCheckInterval !== null) {
      window.clearInterval(this.triggerCheckInterval);
    }
    this.inputGain.disconnect();
    this.delayNode.disconnect();
    this.dampingFilter.disconnect();
    this.feedbackGain.disconnect();
    this.outputGain.disconnect();
    this.triggerInput.disconnect();
    this.triggerAnalyser.disconnect();
  }
}
