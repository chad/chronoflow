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
  private averagingDelay: DelayNode; // One-sample delay for averaging filter
  private averagingGain1: GainNode;  // Current sample weight
  private averagingGain2: GainNode;  // Delayed sample weight
  private averagingMerge: GainNode;  // Merge point for averaging
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

    // Create the Karplus-Strong feedback loop using classic averaging filter
    // The averaging filter: y[n] = a * x[n] + (1-a) * x[n-1]
    // This is stable by design and provides natural high-frequency damping

    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    this.delayNode = context.createDelay(1); // Max 1 second delay
    this.updateDelayTime();

    // Classic Karplus-Strong averaging filter
    // Mix current sample with one-sample-delayed sample
    this.averagingMerge = context.createGain();
    this.averagingMerge.gain.value = 1;

    this.averagingGain1 = context.createGain(); // Weight for current sample
    this.averagingGain2 = context.createGain(); // Weight for delayed sample
    this.updateDamping(); // Sets the weights

    // One-sample delay for averaging
    this.averagingDelay = context.createDelay(0.1);
    this.averagingDelay.delayTime.value = 1 / context.sampleRate; // One sample

    this.feedbackGain = context.createGain();
    this.updateFeedback();

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1.0;

    // Create the feedback loop
    // Input goes to main delay
    this.inputGain.connect(this.delayNode);

    // Delay output goes to output AND to averaging filter
    this.delayNode.connect(this.outputGain);

    // Averaging filter: current + delayed sample
    this.delayNode.connect(this.averagingGain1);
    this.delayNode.connect(this.averagingDelay);
    this.averagingDelay.connect(this.averagingGain2);
    this.averagingGain1.connect(this.averagingMerge);
    this.averagingGain2.connect(this.averagingMerge);

    // Merged signal -> feedback gain -> back to delay
    this.averagingMerge.connect(this.feedbackGain);
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

    // Find the maximum value in the buffer (pulse might be anywhere in the window)
    let maxValue = 0;
    for (let i = 0; i < this.triggerData.length; i++) {
      const val = this.triggerData[i];
      if (val > maxValue) {
        maxValue = val;
      }
    }

    // Detect rising edge (crossing threshold from below)
    const threshold = 0.5;
    if (maxValue > threshold && this.lastTriggerValue <= threshold) {
      console.log(`[KarplusStrong ${this.id}] Trigger detected, peak: ${maxValue.toFixed(3)}`);
      this.trigger(Math.min(1, maxValue)); // Use signal amplitude as velocity
    }

    this.lastTriggerValue = maxValue;
  }

  // Get trigger input node for external connections
  getTriggerInput(): AudioNode {
    return this.triggerInput;
  }

  private createNoiseBuffer(): void {
    // Create noise burst for excitation - needs enough energy to start the string
    const duration = 0.015; // 15ms burst
    const sampleRate = this.context.sampleRate;
    const length = Math.floor(duration * sampleRate);
    this.noiseBuffer = this.context.createBuffer(1, length, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);

    // Generate noise with linear decay envelope - full amplitude
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Linear decay
      const envelope = 1 - t;
      // Full amplitude noise
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
    // Damping controls the averaging filter blend
    // Classic K-S uses 0.5/0.5 blend. We vary this based on damping:
    // Higher damping = more weight on delayed sample = more HF rolloff
    // damping 0 -> weights 0.5/0.5 (even mix, bright)
    // damping 1 -> weights 0.2/0.8 (more smoothing, dark)
    const currentWeight = 0.5 - this.params.damping * 0.3; // 0.5 to 0.2
    const delayedWeight = 0.5 + this.params.damping * 0.3; // 0.5 to 0.8

    if (this.averagingGain1) {
      this.averagingGain1.gain.setValueAtTime(currentWeight, this.context.currentTime);
    }
    if (this.averagingGain2) {
      this.averagingGain2.gain.setValueAtTime(delayedWeight, this.context.currentTime);
    }
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

    console.log(`[KarplusStrong ${this.id}] Plucking at velocity ${velocity}`);

    // Create noise burst source
    const noiseSource = this.context.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    // Velocity gain - full strength
    const velocityGain = this.context.createGain();
    velocityGain.gain.value = velocity;

    // Direct connection: noise -> velocity -> input
    noiseSource.connect(velocityGain);
    velocityGain.connect(this.inputGain);

    noiseSource.start();
    noiseSource.stop(this.context.currentTime + 0.02);
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
    this.averagingGain1.disconnect();
    this.averagingGain2.disconnect();
    this.averagingDelay.disconnect();
    this.averagingMerge.disconnect();
    this.feedbackGain.disconnect();
    this.outputGain.disconnect();
    this.triggerInput.disconnect();
    this.triggerAnalyser.disconnect();
  }
}
