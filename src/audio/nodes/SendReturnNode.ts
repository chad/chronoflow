// SendReturnNode - Aux Send/Return bus for parallel effects processing
// Send: taps a percentage of signal and routes it to a named bus
// Return: receives from a named bus and mixes it back into the signal chain
//
// This enables the classic studio pattern:
//   Multiple sources → Send (30% to "reverb bus") → their own outputs
//   Return ("reverb bus") → Shimmer Reverb → Output
//
// Buses are managed globally so multiple sends can feed one return

import type { SynthNode, AudioNodeParams } from './types';

// Global bus registry - shared across all send/return nodes
const busRegistry: Map<string, {
  gainNode: GainNode;
  context: AudioContext;
  senders: Set<string>;
  receivers: Set<string>;
}> = new Map();

function getOrCreateBus(context: AudioContext, busName: string): GainNode {
  let bus = busRegistry.get(busName);
  if (!bus) {
    const gainNode = context.createGain();
    gainNode.gain.value = 1;
    bus = { gainNode, context, senders: new Set(), receivers: new Set() };
    busRegistry.set(busName, bus);
  }
  return bus.gainNode;
}

function registerSender(busName: string, senderId: string): void {
  const bus = busRegistry.get(busName);
  if (bus) bus.senders.add(senderId);
}

function unregisterSender(busName: string, senderId: string): void {
  const bus = busRegistry.get(busName);
  if (bus) {
    bus.senders.delete(senderId);
    cleanupBus(busName);
  }
}

function registerReceiver(busName: string, receiverId: string): void {
  const bus = busRegistry.get(busName);
  if (bus) bus.receivers.add(receiverId);
}

function unregisterReceiver(busName: string, receiverId: string): void {
  const bus = busRegistry.get(busName);
  if (bus) {
    bus.receivers.delete(receiverId);
    cleanupBus(busName);
  }
}

function cleanupBus(busName: string): void {
  const bus = busRegistry.get(busName);
  if (bus && bus.senders.size === 0 && bus.receivers.size === 0) {
    bus.gainNode.disconnect();
    busRegistry.delete(busName);
  }
}

// Get all active bus names (for UI dropdowns)
export function getActiveBusNames(): string[] {
  return Array.from(busRegistry.keys());
}

// --- SEND NODE ---

export interface SendParams {
  bus: string;   // Bus name (e.g., "reverb", "delay", "A")
  amount: number; // Send level (0-1)
  preFader: boolean; // If true, sends before the node's own output gain
}

const SEND_DEFAULTS: SendParams = {
  bus: 'A',
  amount: 0.5,
  preFader: false,
};

export class SynthSendNode implements SynthNode {
  id: string;
  type = 'send';

  private context: AudioContext;
  private params: SendParams;

  private inputGain: GainNode;
  private outputGain: GainNode; // Passes through the dry signal
  private sendGain: GainNode;   // Controls how much goes to the bus

  constructor(context: AudioContext, id: string, params?: Partial<SendParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...SEND_DEFAULTS, ...params };

    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    this.outputGain = context.createGain();
    this.outputGain.gain.value = 1;

    this.sendGain = context.createGain();
    this.sendGain.gain.value = this.params.amount;

    // Dry pass-through
    this.inputGain.connect(this.outputGain);

    // Send tap
    this.inputGain.connect(this.sendGain);

    // Connect send to bus
    this.connectToBus();

    registerSender(this.params.bus, this.id);
  }

  private connectToBus(): void {
    const busNode = getOrCreateBus(this.context, this.params.bus);
    try { this.sendGain.disconnect(); } catch { /* ok */ }
    this.sendGain.connect(busNode);
    // Re-connect dry path
    try {
      this.inputGain.disconnect(this.outputGain);
    } catch { /* ok */ }
    this.inputGain.connect(this.outputGain);
    this.inputGain.connect(this.sendGain);
  }

  getOutputNode(): AudioNode { return this.outputGain; }
  getInputNode(): AudioNode { return this.inputGain; }

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'amount_mod': return this.sendGain.gain;
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
      case 'bus': {
        const oldBus = this.params.bus;
        this.params.bus = value as string;
        unregisterSender(oldBus, this.id);
        registerSender(this.params.bus, this.id);
        this.connectToBus();
        break;
      }
      case 'amount':
        this.params.amount = Math.max(0, Math.min(1, value as number));
        this.sendGain.gain.setTargetAtTime(this.params.amount, now, 0.01);
        break;
      case 'preFader':
        this.params.preFader = (value as unknown) === true || value === 'true';
        break;
    }
  }

  getParams(): AudioNodeParams { return { ...this.params }; }

  dispose(): void {
    unregisterSender(this.params.bus, this.id);
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.sendGain.disconnect();
  }
}

// --- RETURN NODE ---

export interface ReturnParams {
  bus: string;   // Bus name to receive from
  gain: number;  // Return level (0-2 for boost)
}

const RETURN_DEFAULTS: ReturnParams = {
  bus: 'A',
  gain: 1,
};

export class SynthReturnNode implements SynthNode {
  id: string;
  type = 'return';

  private context: AudioContext;
  private params: ReturnParams;

  private outputGain: GainNode;
  private busConnection: GainNode | null = null;

  constructor(context: AudioContext, id: string, params?: Partial<ReturnParams>) {
    this.context = context;
    this.id = id;
    this.params = { ...RETURN_DEFAULTS, ...params };

    this.outputGain = context.createGain();
    this.outputGain.gain.value = this.params.gain;

    this.connectFromBus();
    registerReceiver(this.params.bus, this.id);
  }

  private connectFromBus(): void {
    // Disconnect old bus if any
    if (this.busConnection) {
      try { this.busConnection.disconnect(this.outputGain); } catch { /* ok */ }
    }

    const busNode = getOrCreateBus(this.context, this.params.bus);
    busNode.connect(this.outputGain);
    this.busConnection = busNode;
  }

  getOutputNode(): AudioNode { return this.outputGain; }
  getInputNode(): AudioNode | null { return null; } // Return has no direct audio input

  getModulationTarget(paramName: string): AudioParam | null {
    switch (paramName) {
      case 'gain_mod': return this.outputGain.gain;
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
      case 'bus': {
        const oldBus = this.params.bus;
        this.params.bus = value as string;
        unregisterReceiver(oldBus, this.id);
        registerReceiver(this.params.bus, this.id);
        this.connectFromBus();
        break;
      }
      case 'gain':
        this.params.gain = Math.max(0, Math.min(2, value as number));
        this.outputGain.gain.setTargetAtTime(this.params.gain, now, 0.01);
        break;
    }
  }

  getParams(): AudioNodeParams { return { ...this.params }; }

  dispose(): void {
    unregisterReceiver(this.params.bus, this.id);
    if (this.busConnection) {
      try { this.busConnection.disconnect(this.outputGain); } catch { /* ok */ }
    }
    this.outputGain.disconnect();
  }
}
