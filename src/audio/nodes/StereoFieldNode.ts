// StereoFieldNode - Stereo width, pan, and mid/side processing
// Essential for ambient music to create immersive spatial soundscapes
//
// Features:
// - Pan: stereo placement (-1 left, 0 center, +1 right)
// - Width: stereo spread (0 = mono, 1 = normal, 2 = hyper-wide)
// - Mid/Side balance: emphasize center content vs side content
// - Haas delay: tiny delay on one channel for psychoacoustic width

import type { SynthNode, AudioNodeParams } from './types';

export interface StereoFieldParams {
  pan: number;       // -1 (left) to +1 (right)
  width: number;     // 0 (mono) to 2 (hyper-wide)
  midSide: number;   // -1 (sides only) to 0 (balanced) to +1 (mid only)
  haasDelay: number;  // 0-20ms Haas effect delay
  haasAmount: number; // 0-1 amount of Haas effect
}

const DEFAULT_PARAMS: StereoFieldParams = {
  pan: 0,
  width: 1,
  midSide: 0,
  haasDelay: 0,
  haasAmount: 0,
};

export class SynthStereoFieldNode implements SynthNode {
  id: string;
  type = 'stereofield';

  private context: AudioContext;
  private params: StereoFieldParams;

  private inputGain: GainNode;
  private outputGain: GainNode;

  // Stereo processing via channel splitter/merger
  private splitter: ChannelSplitterNode;
  private merger: ChannelMergerNode;

  // Pan control (equal-power panning)
  private leftGain: GainNode;
  private rightGain: GainNode;

  // Width control (mid/side processing)
  private midGain: GainNode;   // (L+R)/2
  private sideGain: GainNode;  // (L-R)/2

  // Haas effect delay
  private haasDelayNode: DelayNode;
  private haasWetGain: GainNode;
  private haasDryGain: GainNode;

  constructor(context: AudioContext, id: string, params?: Partial<StereoFieldParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Input (mono or stereo accepted)
    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    // Output (stereo)
    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    // Create stereo processing chain
    this.splitter = context.createChannelSplitter(2);
    this.merger = context.createChannelMerger(2);

    // Per-channel gains for panning and width
    this.leftGain = context.createGain();
    this.rightGain = context.createGain();

    // Mid/Side gains (used for width processing)
    this.midGain = context.createGain();
    this.sideGain = context.createGain();

    // Haas effect
    this.haasDelayNode = context.createDelay(0.05); // max 50ms
    this.haasDelayNode.delayTime.value = this.params.haasDelay / 1000;
    this.haasWetGain = context.createGain();
    this.haasWetGain.gain.value = this.params.haasAmount;
    this.haasDryGain = context.createGain();
    this.haasDryGain.gain.value = 1;

    // Signal flow:
    // Input → Splitter → L/R gains (with pan + width applied) → Merger → Haas → Output
    this.inputGain.connect(this.splitter);

    // Left channel
    this.splitter.connect(this.leftGain, 0);
    this.leftGain.connect(this.merger, 0, 0);

    // Right channel (with optional Haas delay)
    this.splitter.connect(this.rightGain, 1);
    this.rightGain.connect(this.haasDryGain);
    this.rightGain.connect(this.haasDelayNode);
    this.haasDelayNode.connect(this.haasWetGain);

    this.haasDryGain.connect(this.merger, 0, 1);
    this.haasWetGain.connect(this.merger, 0, 1);

    this.merger.connect(this.outputGain);

    this.updatePanAndWidth();
  }

  private updatePanAndWidth(): void {
    const now = this.context.currentTime;
    const pan = this.params.pan;
    const width = this.params.width;
    const midSide = this.params.midSide;

    // Equal-power panning
    const panAngle = (pan + 1) / 2; // 0 to 1
    const leftPanGain = Math.cos(panAngle * Math.PI / 2);
    const rightPanGain = Math.sin(panAngle * Math.PI / 2);

    // Width: at width=0, both channels are (L+R)/2 (mono)
    // At width=1, normal stereo. At width=2, exaggerated stereo
    const midLevel = 1 - (width - 1); // width 0→2, midLevel 2→0
    const sideLevel = width;

    // Mid/side balance adjustment
    const midAdjust = midSide > 0 ? 1 : 1 + midSide; // reduce mid when negative
    const sideAdjust = midSide < 0 ? 1 : 1 - midSide; // reduce side when positive

    const effectiveMid = Math.max(0, midLevel * midAdjust);
    const effectiveSide = Math.max(0, sideLevel * sideAdjust);

    // Left = mid * (L+R)/2 + side * (L-R)/2 = mid/2*L + mid/2*R + side/2*L - side/2*R
    // Left contribution from L channel: (mid + side) / 2
    // Left contribution from R channel: (mid - side) / 2
    // We apply pan on top of this
    const leftFromLeft = (effectiveMid + effectiveSide) / 2;
    const rightFromRight = (effectiveMid + effectiveSide) / 2;

    this.leftGain.gain.setTargetAtTime(leftFromLeft * leftPanGain, now, 0.01);
    this.rightGain.gain.setTargetAtTime(rightFromRight * rightPanGain, now, 0.01);

    // Update Haas effect
    this.haasDelayNode.delayTime.setTargetAtTime(
      Math.max(0, this.params.haasDelay / 1000), now, 0.01
    );
    this.haasWetGain.gain.setTargetAtTime(this.params.haasAmount, now, 0.01);
    this.haasDryGain.gain.setTargetAtTime(1 - this.params.haasAmount, now, 0.01);
  }

  getOutputNode(): AudioNode { return this.outputGain; }
  getInputNode(): AudioNode { return this.inputGain; }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'pan_mod': return this.leftGain.gain; // Approximate - real pan mod would need more
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
    switch (name) {
      case 'pan':
        this.params.pan = Math.max(-1, Math.min(1, value as number));
        this.updatePanAndWidth();
        break;
      case 'width':
        this.params.width = Math.max(0, Math.min(2, value as number));
        this.updatePanAndWidth();
        break;
      case 'midSide':
        this.params.midSide = Math.max(-1, Math.min(1, value as number));
        this.updatePanAndWidth();
        break;
      case 'haasDelay':
        this.params.haasDelay = Math.max(0, Math.min(20, value as number));
        this.updatePanAndWidth();
        break;
      case 'haasAmount':
        this.params.haasAmount = Math.max(0, Math.min(1, value as number));
        this.updatePanAndWidth();
        break;
    }
  }

  getParams(): AudioNodeParams { return { ...this.params }; }

  dispose(): void {
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.splitter.disconnect();
    this.merger.disconnect();
    this.leftGain.disconnect();
    this.rightGain.disconnect();
    this.midGain.disconnect();
    this.sideGain.disconnect();
    this.haasDelayNode.disconnect();
    this.haasWetGain.disconnect();
    this.haasDryGain.disconnect();
  }
}
