// ShimmerReverbNode - Reverb with pitch-shifted feedback for ethereal textures
// Creates lush, evolving pads by feeding pitch-shifted reverb tail back into itself
// Classic technique: reverb → pitch shift up an octave → feed back → infinite shimmer

import type { SynthNode, AudioNodeParams } from './types';

export interface ShimmerReverbParams {
  decay: number;       // Reverb decay time (0.5-15 seconds)
  shimmer: number;     // Amount of pitch-shifted feedback (0-1)
  pitchShift: number;  // Shift interval in semitones (typically 12 for octave up)
  damping: number;     // High-frequency damping (0-1, 1 = dark)
  mix: number;         // Dry/wet (0-1)
  diffusion: number;   // Early reflection density (0-1)
}

const DEFAULT_PARAMS: ShimmerReverbParams = {
  decay: 4,
  shimmer: 0.5,
  pitchShift: 12,
  damping: 0.3,
  mix: 0.5,
  diffusion: 0.7,
};

// Number of allpass stages for diffusion
const NUM_ALLPASS = 4;
export class SynthShimmerReverbNode implements SynthNode {
  id: string;
  type = 'shimmerreverb';

  private context: AudioContext;
  private params: ShimmerReverbParams;

  private inputGain: GainNode;
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;

  // Main reverb (convolution)
  private convolver: ConvolverNode;

  // Shimmer feedback path: reverb output → pitch shift → feedback → reverb input
  private shimmerGain: GainNode;      // Controls shimmer amount
  private shimmerDelay: DelayNode;    // Small delay to prevent instantaneous feedback
  private shimmerFilter: BiquadFilterNode; // Damping filter in feedback loop

  // Diffusion network (allpass chain for early reflections)
  private diffusionFilters: BiquadFilterNode[];
  private diffusionGain: GainNode;

  // Simple pitch shifting via playback rate trick (detune delay lines)
  // Using two detuned delay lines for a chorus-like pitch shift in the feedback
  private pitchDelay1: DelayNode;
  private pitchDelay2: DelayNode;
  private pitchLFO1: OscillatorNode;
  private pitchLFO2: OscillatorNode;
  private pitchLFOGain1: GainNode;
  private pitchLFOGain2: GainNode;
  private pitchSum: GainNode;

  // Pre-delay for reverb
  private preDelay: DelayNode;

  constructor(context: AudioContext, id: string, params?: Partial<ShimmerReverbParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Input/output
    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    this.dryGain = context.createGain();
    this.wetGain = context.createGain();

    // Pre-delay
    this.preDelay = context.createDelay(0.5);
    this.preDelay.delayTime.value = 0.02;

    // Diffusion network
    this.diffusionFilters = [];
    this.diffusionGain = context.createGain();
    this.diffusionGain.gain.value = this.params.diffusion;

    let lastNode: AudioNode = this.preDelay;
    for (let i = 0; i < NUM_ALLPASS; i++) {
      const allpass = context.createBiquadFilter();
      allpass.type = 'allpass';
      allpass.frequency.value = 1000 + i * 500;
      allpass.Q.value = 0.5;
      this.diffusionFilters.push(allpass);
      lastNode.connect(allpass);
      lastNode = allpass;
    }

    // Main convolver
    this.convolver = context.createConvolver();
    this.generateImpulseResponse();

    // Connect diffusion → convolver
    lastNode.connect(this.convolver);

    // Shimmer feedback path
    this.shimmerGain = context.createGain();
    this.shimmerGain.gain.value = this.params.shimmer * 0.7; // Scale to prevent runaway

    this.shimmerDelay = context.createDelay(0.5);
    this.shimmerDelay.delayTime.value = 0.05; // 50ms to avoid tight feedback loops

    this.shimmerFilter = context.createBiquadFilter();
    this.shimmerFilter.type = 'lowpass';
    this.shimmerFilter.frequency.value = this.getDampingFrequency();
    this.shimmerFilter.Q.value = 0.5;

    // Pitch shifting via modulated delay lines (chorus-based pitch illusion)
    // This creates a subtle but effective pitch-shift impression in the feedback loop
    this.pitchDelay1 = context.createDelay(0.5);
    this.pitchDelay1.delayTime.value = 0.01;
    this.pitchDelay2 = context.createDelay(0.5);
    this.pitchDelay2.delayTime.value = 0.02;

    this.pitchLFO1 = context.createOscillator();
    this.pitchLFO1.frequency.value = this.getPitchLFORate();
    this.pitchLFO1.type = 'sine';

    this.pitchLFO2 = context.createOscillator();
    this.pitchLFO2.frequency.value = this.getPitchLFORate() * 1.1; // Slightly different rate
    this.pitchLFO2.type = 'sine';

    // LFO depth controls the pitch shift amount
    this.pitchLFOGain1 = context.createGain();
    this.pitchLFOGain1.gain.value = this.getPitchLFODepth();
    this.pitchLFOGain2 = context.createGain();
    this.pitchLFOGain2.gain.value = this.getPitchLFODepth();

    this.pitchLFO1.connect(this.pitchLFOGain1);
    this.pitchLFOGain1.connect(this.pitchDelay1.delayTime);
    this.pitchLFO2.connect(this.pitchLFOGain2);
    this.pitchLFOGain2.connect(this.pitchDelay2.delayTime);

    this.pitchSum = context.createGain();
    this.pitchSum.gain.value = 0.5; // Average the two pitch-shifted signals

    // Start LFOs
    this.pitchLFO1.start();
    this.pitchLFO2.start();

    // Shimmer feedback routing:
    // convolver → shimmerGain → shimmerFilter → pitchDelay1&2 → pitchSum → shimmerDelay → preDelay (feedback)
    this.convolver.connect(this.shimmerGain);
    this.shimmerGain.connect(this.shimmerFilter);
    this.shimmerFilter.connect(this.pitchDelay1);
    this.shimmerFilter.connect(this.pitchDelay2);
    this.pitchDelay1.connect(this.pitchSum);
    this.pitchDelay2.connect(this.pitchSum);
    this.pitchSum.connect(this.shimmerDelay);
    this.shimmerDelay.connect(this.preDelay); // Feed back into reverb input

    // Main signal routing
    // Input → dry → output
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    // Input → preDelay → diffusion → convolver → wet → output
    this.inputGain.connect(this.preDelay);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);

    this.updateMix();
  }

  private generateImpulseResponse(): void {
    const sampleRate = this.context.sampleRate;
    const length = Math.floor(sampleRate * Math.min(this.params.decay, 8)); // Cap IR length
    const impulse = this.context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay with some early reflection structure
        const t = i / length;
        const decay = Math.pow(1 - t, 1.5 + this.params.damping);

        // Add some early reflections (sparse taps in first 100ms)
        let earlyReflection = 0;
        const earlyLength = Math.floor(sampleRate * 0.1);
        if (i < earlyLength && i % Math.floor(sampleRate * 0.007) < 4) {
          earlyReflection = (Math.random() - 0.5) * 0.3;
        }

        data[i] = ((Math.random() * 2 - 1) * decay + earlyReflection) * 0.5;
      }
    }

    this.convolver.buffer = impulse;
  }

  private getDampingFrequency(): number {
    // Map damping 0-1 to frequency 20000-800 Hz
    return 20000 * Math.pow(0.04, this.params.damping);
  }

  private getPitchLFORate(): number {
    // LFO rate scales with pitch shift interval
    // Higher shifts need faster modulation
    return 0.5 + Math.abs(this.params.pitchShift) * 0.2;
  }

  private getPitchLFODepth(): number {
    // Modulation depth scales with pitch shift amount
    // This is an approximation — true pitch shifting would use a worklet
    const semitoneRatio = Math.abs(this.params.pitchShift) / 12;
    return 0.001 + semitoneRatio * 0.008;
  }

  private updateMix(): void {
    const now = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, now, 0.01);
    this.wetGain.gain.setTargetAtTime(this.params.mix, now, 0.01);
  }

  // Clear the reverb tail
  clear(): void {
    this.wetGain.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
    this.shimmerGain.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
    setTimeout(() => {
      this.shimmerGain.gain.setTargetAtTime(
        this.params.shimmer * 0.7,
        this.context.currentTime,
        0.01
      );
      if (this.params.mix > 0) {
        this.wetGain.gain.setTargetAtTime(this.params.mix, this.context.currentTime, 0.01);
      }
    }, 300);
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'shimmer_mod':
        return this.shimmerGain.gain;
      case 'mix_mod':
        return this.wetGain.gain;
      case 'damping_mod':
        return this.shimmerFilter.frequency;
      default:
        return null;
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

  disconnect(): void {
    this.outputGain.disconnect();
  }

  setParam(name: string, value: number | string): void {
    const now = this.context.currentTime;
    switch (name) {
      case 'decay':
        this.params.decay = Math.max(0.5, Math.min(15, value as number));
        this.generateImpulseResponse();
        break;
      case 'shimmer':
        this.params.shimmer = Math.max(0, Math.min(1, value as number));
        this.shimmerGain.gain.setTargetAtTime(this.params.shimmer * 0.7, now, 0.02);
        break;
      case 'pitchShift':
        this.params.pitchShift = Math.max(-24, Math.min(24, value as number));
        this.pitchLFO1.frequency.setTargetAtTime(this.getPitchLFORate(), now, 0.02);
        this.pitchLFO2.frequency.setTargetAtTime(this.getPitchLFORate() * 1.1, now, 0.02);
        this.pitchLFOGain1.gain.setTargetAtTime(this.getPitchLFODepth(), now, 0.02);
        this.pitchLFOGain2.gain.setTargetAtTime(this.getPitchLFODepth(), now, 0.02);
        break;
      case 'damping':
        this.params.damping = Math.max(0, Math.min(1, value as number));
        this.shimmerFilter.frequency.setTargetAtTime(this.getDampingFrequency(), now, 0.02);
        this.generateImpulseResponse();
        break;
      case 'mix':
        this.params.mix = Math.max(0, Math.min(1, value as number));
        this.updateMix();
        break;
      case 'diffusion':
        this.params.diffusion = Math.max(0, Math.min(1, value as number));
        this.diffusionGain.gain.setTargetAtTime(this.params.diffusion, now, 0.02);
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  dispose(): void {
    this.pitchLFO1.stop();
    this.pitchLFO2.stop();

    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.preDelay.disconnect();
    this.convolver.disconnect();
    this.shimmerGain.disconnect();
    this.shimmerDelay.disconnect();
    this.shimmerFilter.disconnect();
    this.pitchDelay1.disconnect();
    this.pitchDelay2.disconnect();
    this.pitchLFO1.disconnect();
    this.pitchLFO2.disconnect();
    this.pitchLFOGain1.disconnect();
    this.pitchLFOGain2.disconnect();
    this.pitchSum.disconnect();
    this.diffusionGain.disconnect();
    this.diffusionFilters.forEach((f) => f.disconnect());
  }
}
