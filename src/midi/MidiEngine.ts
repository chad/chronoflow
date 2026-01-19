// MidiEngine - handles MIDI device access and enumeration

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  type: 'input' | 'output';
}

type MidiMessageCallback = (message: MIDIMessageEvent) => void;

class MidiEngine {
  private midiAccess: MIDIAccess | null = null;
  private selectedInput: MIDIInput | null = null;
  private selectedOutput: MIDIOutput | null = null;
  private messageCallbacks: Set<MidiMessageCallback> = new Set();
  private stateChangeCallbacks: Set<() => void> = new Set();

  async init(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.midiAccess.onstatechange = () => {
        this.notifyStateChange();
      };
      return true;
    } catch (err) {
      console.error('Failed to access MIDI:', err);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.midiAccess !== null;
  }

  getInputs(): MidiDevice[] {
    if (!this.midiAccess) return [];

    const devices: MidiDevice[] = [];
    this.midiAccess.inputs.forEach((input) => {
      devices.push({
        id: input.id,
        name: input.name || 'Unknown',
        manufacturer: input.manufacturer || 'Unknown',
        type: 'input',
      });
    });
    return devices;
  }

  getOutputs(): MidiDevice[] {
    if (!this.midiAccess) return [];

    const devices: MidiDevice[] = [];
    this.midiAccess.outputs.forEach((output) => {
      devices.push({
        id: output.id,
        name: output.name || 'Unknown',
        manufacturer: output.manufacturer || 'Unknown',
        type: 'output',
      });
    });
    return devices;
  }

  selectInput(deviceId: string | null): boolean {
    if (this.selectedInput) {
      this.selectedInput.onmidimessage = null;
    }

    if (!deviceId || !this.midiAccess) {
      this.selectedInput = null;
      return true;
    }

    const input = this.midiAccess.inputs.get(deviceId);
    if (!input) {
      console.error('MIDI input not found:', deviceId);
      return false;
    }

    this.selectedInput = input;
    this.selectedInput.onmidimessage = (event) => {
      this.messageCallbacks.forEach((cb) => cb(event));
    };

    return true;
  }

  selectOutput(deviceId: string | null): boolean {
    if (!deviceId || !this.midiAccess) {
      this.selectedOutput = null;
      return true;
    }

    const output = this.midiAccess.outputs.get(deviceId);
    if (!output) {
      console.error('MIDI output not found:', deviceId);
      return false;
    }

    this.selectedOutput = output;
    return true;
  }

  getSelectedInput(): MIDIInput | null {
    return this.selectedInput;
  }

  getSelectedOutput(): MIDIOutput | null {
    return this.selectedOutput;
  }

  // Send MIDI message to output
  send(data: number[]): void {
    if (this.selectedOutput) {
      this.selectedOutput.send(data);
    }
  }

  // Send note on
  noteOn(channel: number, note: number, velocity: number): void {
    this.send([0x90 | (channel & 0x0f), note & 0x7f, velocity & 0x7f]);
  }

  // Send note off
  noteOff(channel: number, note: number): void {
    this.send([0x80 | (channel & 0x0f), note & 0x7f, 0]);
  }

  // Send control change
  controlChange(channel: number, controller: number, value: number): void {
    this.send([0xb0 | (channel & 0x0f), controller & 0x7f, value & 0x7f]);
  }

  // Subscribe to MIDI messages
  onMessage(callback: MidiMessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  // Subscribe to state changes (device connect/disconnect)
  onStateChange(callback: () => void): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach((cb) => cb());
  }
}

export const midiEngine = new MidiEngine();
export default midiEngine;
