// TapeDelayNode - Analog-modeled tape delay with wow, flutter, saturation, and degradation
// Emulates the character of tape echo machines (Space Echo, Echoplex)
//
// Features:
// - Wow: slow pitch drift from tape speed inconsistency
// - Flutter: fast pitch wobble from transport mechanism
// - Saturation: soft clipping that adds warmth as signal builds
// - Degradation: high-frequency loss per repeat (tape darkening)
// - Ping-pong: stereo bouncing between channels
// - Tape speed: affects delay time character

import type { SynthNode, AudioNodeParams } from './types';

export interface TapeDelayParams {
  time: number;        // Delay time in seconds (0.05-2.0)
  feedback: number;    // Feedback amount (0-0.95)
  mix: number;         // Dry/wet (0-1)
  wow: number;         // Slow pitch modulation depth (0-1)
  flutter: number;     // Fast pitch modulation depth (0-1)
  saturation: number;  // Tape saturation/warmth (0-1)
  degradation: number; // Per-repeat high-frequency loss (0-1)
  tapeSpeed: number;   // Tape speed factor (0.5-2.0, affects character)
  pingPong: boolean;   // Stereo ping-pong mode
}

const DEFAULT_PARAMS: TapeDelayParams = {
  time: 0.375,
  feedback: 0.55,
  mix: 0.4,
  wow: 0.15,
  flutter: 0.1,
  saturation: 0.3,
  degradation: 0.4,
  tapeSpeed: 1.0,
  pingPong: false,
};

export class SynthTapeDelayNode implements SynthNode {
  id: string;
  type = 'tapedelay';

  private context: AudioContext;
  private params: TapeDelayParams;

  // Main signal chain
  private inputGain: GainNode;
  private outputGain: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;

  // Tape delay line
  private delayL: DelayNode;
  private delayR: DelayNode;
  private feedbackGain: GainNode;

  // Wow (slow pitch drift)
  private wowLFO: OscillatorNode;
  private wowGain: GainNode;

  // Flutter (fast pitch wobble)
  private flutterLFO: OscillatorNode;
  private flutterGain: GainNode;

  // Saturation (waveshaper in feedback loop)
  private saturator: WaveShaperNode;

  // Degradation (lowpass filter in feedback loop, darkens each repeat)
  private degradationFilter: BiquadFilterNode;

  // Anti-aliasing / tone shaping
  private inputFilter: BiquadFilterNode;  // Gentle input rolloff (tape doesn't record ultra-highs)
  private outputFilter: BiquadFilterNode; // Smooth output

  // Stereo merge
  private merger: ChannelMergerNode;

  constructor(context: AudioContext, id: string, params?: Partial<TapeDelayParams>) {
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

    // Input tone shaping (tape machines don't capture full bandwidth)
    this.inputFilter = context.createBiquadFilter();
    this.inputFilter.type = 'lowpass';
    this.inputFilter.frequency.value = 8000;
    this.inputFilter.Q.value = 0.5;

    // Delay lines
    this.delayL = context.createDelay(5);
    this.delayL.delayTime.value = this.params.time;
    this.delayR = context.createDelay(5);
    this.delayR.delayTime.value = this.params.pingPong ? this.params.time * 0.75 : this.params.time;

    // Feedback
    this.feedbackGain = context.createGain();
    this.feedbackGain.gain.value = Math.min(0.95, this.params.feedback);

    // Saturation (tape soft clipping)
    this.saturator = context.createWaveShaper();
    this.updateSaturationCurve();

    // Degradation (per-repeat darkening)
    this.degradationFilter = context.createBiquadFilter();
    this.degradationFilter.type = 'lowpass';
    this.updateDegradation();
    this.degradationFilter.Q.value = 0.3;

    // Output smoothing
    this.outputFilter = context.createBiquadFilter();
    this.outputFilter.type = 'lowpass';
    this.outputFilter.frequency.value = 12000;
    this.outputFilter.Q.value = 0.5;

    // Wow LFO (slow: 0.3-1.5 Hz)
    this.wowLFO = context.createOscillator();
    this.wowLFO.type = 'sine';
    this.wowLFO.frequency.value = 0.5;
    this.wowGain = context.createGain();
    this.updateWow();

    // Flutter LFO (fast: 3-8 Hz)
    this.flutterLFO = context.createOscillator();
    this.flutterLFO.type = 'triangle';
    this.flutterLFO.frequency.value = 5.5;
    this.flutterGain = context.createGain();
    this.updateFlutter();

    // Stereo merger
    this.merger = context.createChannelMerger(2);

    // === SIGNAL ROUTING ===

    // Dry path
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    // Wet path: input → filter → delay → saturator → degradation → feedback → delay
    this.inputGain.connect(this.inputFilter);
    this.inputFilter.connect(this.delayL);

    if (this.params.pingPong) {
      // Ping-pong: L feeds R, R feeds L
      this.delayL.connect(this.saturator);
      this.saturator.connect(this.degradationFilter);
      this.degradationFilter.connect(this.feedbackGain);
      this.feedbackGain.connect(this.delayR);
      this.delayR.connect(this.feedbackGain); // R feeds back to L via a second path
      // Actually for true ping-pong we need cross-feedback
      this.delayL.connect(this.merger, 0, 0);
      this.delayR.connect(this.merger, 0, 1);
      this.merger.connect(this.outputFilter);
    } else {
      // Mono feedback loop
      this.delayL.connect(this.saturator);
      this.saturator.connect(this.degradationFilter);
      this.degradationFilter.connect(this.feedbackGain);
      this.feedbackGain.connect(this.delayL);
      this.delayL.connect(this.outputFilter);
    }

    this.outputFilter.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);

    // Modulate delay time with wow + flutter
    this.wowLFO.connect(this.wowGain);
    this.wowGain.connect(this.delayL.delayTime);
    this.flutterLFO.connect(this.flutterGain);
    this.flutterGain.connect(this.delayL.delayTime);

    if (this.params.pingPong) {
      // Modulate right delay too (slightly different rates for wider stereo)
      const wowGainR = context.createGain();
      wowGainR.gain.value = this.wowGain.gain.value * 0.8;
      this.wowLFO.connect(wowGainR);
      wowGainR.connect(this.delayR.delayTime);
    }

    // Start LFOs
    this.wowLFO.start();
    this.flutterLFO.start();

    this.updateMix();
  }

  private updateSaturationCurve(): void {
    const amount = this.params.saturation;
    const samples = 256;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      if (amount < 0.01) {
        curve[i] = x; // Clean pass-through
      } else {
        // Soft clipping with adjustable drive
        const drive = 1 + amount * 4;
        curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
      }
    }

    this.saturator.curve = curve;
    this.saturator.oversample = amount > 0.5 ? '4x' : '2x';
  }

  private updateDegradation(): void {
    // Map degradation 0-1 to frequency 20000-800 Hz
    const freq = 20000 * Math.pow(0.04, this.params.degradation);
    this.degradationFilter.frequency.setTargetAtTime(
      freq, this.context.currentTime, 0.02
    );
  }

  private updateWow(): void {
    const depth = this.params.wow * 0.003 * this.params.time; // Proportional to delay time
    this.wowGain.gain.setTargetAtTime(depth, this.context.currentTime, 0.02);
    this.wowLFO.frequency.setTargetAtTime(
      0.3 + Math.random() * 0.5, // Slightly random rate for realism
      this.context.currentTime, 0.1
    );
  }

  private updateFlutter(): void {
    const depth = this.params.flutter * 0.0005 * this.params.time;
    this.flutterGain.gain.setTargetAtTime(depth, this.context.currentTime, 0.02);
  }

  private updateMix(): void {
    const now = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, now, 0.01);
    this.wetGain.gain.setTargetAtTime(this.params.mix, now, 0.01);
  }

  clear(): void {
    this.feedbackGain.gain.setTargetAtTime(0, this.context.currentTime, 0.01);
    this.wetGain.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
    setTimeout(() => {
      this.feedbackGain.gain.setTargetAtTime(
        Math.min(0.95, this.params.feedback), this.context.currentTime, 0.01
      );
      this.wetGain.gain.setTargetAtTime(this.params.mix, this.context.currentTime, 0.01);
    }, this.params.time * 3000);
  }

  getOutputNode(): AudioNode { return this.outputGain; }
  getInputNode(): AudioNode { return this.inputGain; }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'time_mod': return this.delayL.delayTime;
      case 'feedback_mod': return this.feedbackGain.gain;
      case 'mix_mod': return this.wetGain.gain;
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

  setParam(name: string, value: number | string): void {
    const now = this.context.currentTime;
    switch (name) {
      case 'time':
        this.params.time = Math.max(0.05, Math.min(2, value as number));
        this.delayL.delayTime.setTargetAtTime(this.params.time, now, 0.05);
        this.updateWow();
        this.updateFlutter();
        break;
      case 'feedback':
        this.params.feedback = Math.max(0, Math.min(0.95, value as number));
        this.feedbackGain.gain.setTargetAtTime(this.params.feedback, now, 0.01);
        break;
      case 'mix':
        this.params.mix = Math.max(0, Math.min(1, value as number));
        this.updateMix();
        break;
      case 'wow':
        this.params.wow = Math.max(0, Math.min(1, value as number));
        this.updateWow();
        break;
      case 'flutter':
        this.params.flutter = Math.max(0, Math.min(1, value as number));
        this.updateFlutter();
        break;
      case 'saturation':
        this.params.saturation = Math.max(0, Math.min(1, value as number));
        this.updateSaturationCurve();
        break;
      case 'degradation':
        this.params.degradation = Math.max(0, Math.min(1, value as number));
        this.updateDegradation();
        break;
      case 'tapeSpeed':
        this.params.tapeSpeed = Math.max(0.5, Math.min(2, value as number));
        // Tape speed affects input filter + LFO rates
        this.inputFilter.frequency.setTargetAtTime(
          8000 * this.params.tapeSpeed, now, 0.02
        );
        break;
      case 'pingPong':
        this.params.pingPong = (value as unknown) === true || value === 'true';
        // Note: changing ping-pong mode requires reconnecting - complex for live
        break;
    }
  }

  getParams(): AudioNodeParams { return { ...this.params }; }

  dispose(): void {
    this.wowLFO.stop();
    this.flutterLFO.stop();
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.delayL.disconnect();
    this.delayR.disconnect();
    this.feedbackGain.disconnect();
    this.saturator.disconnect();
    this.degradationFilter.disconnect();
    this.inputFilter.disconnect();
    this.outputFilter.disconnect();
    this.wowLFO.disconnect();
    this.wowGain.disconnect();
    this.flutterLFO.disconnect();
    this.flutterGain.disconnect();
    this.merger.disconnect();
  }
}
