import type { SynthNode, AudioNodeParams } from './types';

export interface OutputParams {
  gain: number;
}

const DEFAULT_PARAMS: OutputParams = {
  gain: 0.7,
};

export type RecordingState = 'idle' | 'recording' | 'stopped';

export class SynthOutputNode implements SynthNode {
  id: string;
  type = 'output';

  private gainNode: GainNode;
  private analyser: AnalyserNode;
  private context: AudioContext;
  private params: OutputParams;
  private destination: AudioNode;

  // Recording
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingState: RecordingState = 'idle';
  private recordingStartTime: number = 0;
  private onStateChange: ((state: RecordingState) => void) | null = null;

  constructor(context: AudioContext, id: string, destination: AudioNode, params?: Partial<OutputParams>) {
    this.context = context;
    this.id = id;
    this.destination = destination;
    this.params = { ...DEFAULT_PARAMS, ...params };

    this.gainNode = context.createGain();
    this.gainNode.gain.value = this.params.gain;

    // Analyser for visualization
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 2048;

    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.destination);

    // Create MediaStreamDestination for recording (always connected)
    this.mediaStreamDest = context.createMediaStreamDestination();
    this.analyser.connect(this.mediaStreamDest);
  }

  getOutputNode(): AudioNode | null {
    return null; // Output is the end of the chain
  }

  getInputNode(): AudioNode {
    return this.gainNode;
  }

  getAnalyser(): AnalyserNode {
    return this.analyser;
  }

  getModulationTarget(_paramName: string): AudioParam | null {
    return null; // Output doesn't have modulation inputs
  }

  connect(): void {
    // Output node is always connected to destination
  }

  disconnect(): void {
    this.analyser.disconnect();
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'gain':
        this.params.gain = value as number;
        this.gainNode.gain.setTargetAtTime(value as number, this.context.currentTime, 0.01);
        break;
    }
  }

  getParams(): AudioNodeParams {
    return { ...this.params };
  }

  // ═══════════════════════════════════════════════════════════════
  // Recording Methods
  // ═══════════════════════════════════════════════════════════════

  setRecordingStateCallback(callback: (state: RecordingState) => void): void {
    this.onStateChange = callback;
  }

  getRecordingState(): RecordingState {
    return this.recordingState;
  }

  getRecordingDuration(): number {
    if (this.recordingState !== 'recording') return 0;
    return (Date.now() - this.recordingStartTime) / 1000;
  }

  startRecording(): boolean {
    if (!this.mediaStreamDest) {
      console.error('MediaStreamDestination not available');
      return false;
    }

    if (this.recordingState === 'recording') {
      console.warn('Already recording');
      return false;
    }

    // Reset chunks
    this.recordedChunks = [];

    // Determine best supported format
    const mimeType = this.getSupportedMimeType();
    if (!mimeType) {
      console.error('No supported audio recording format found');
      return false;
    }

    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStreamDest.stream, {
        mimeType,
        audioBitsPerSecond: 192000, // 192 kbps for good quality
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.recordingState = 'stopped';
        this.onStateChange?.('stopped');
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.recordingState = 'idle';
        this.onStateChange?.('idle');
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.recordingStartTime = Date.now();
      this.recordingState = 'recording';
      this.onStateChange?.('recording');

      console.log(`Recording started with format: ${mimeType}`);
      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      return false;
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.recordingState === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  async downloadRecording(filename?: string): Promise<boolean> {
    if (this.recordedChunks.length === 0) {
      console.warn('No recording data available');
      return false;
    }

    const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
    const blob = new Blob(this.recordedChunks, { type: mimeType });

    // Determine file extension
    let extension = 'webm';
    if (mimeType.includes('mp4') || mimeType.includes('aac')) {
      extension = 'm4a';
    } else if (mimeType.includes('ogg')) {
      extension = 'ogg';
    } else if (mimeType.includes('wav')) {
      extension = 'wav';
    }

    const defaultFilename = `chronoflow-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.${extension}`;
    const finalFilename = filename || defaultFilename;

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`Downloaded recording: ${finalFilename} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
    return true;
  }

  clearRecording(): void {
    this.recordedChunks = [];
    this.recordingState = 'idle';
    this.onStateChange?.('idle');
  }

  hasRecordedData(): boolean {
    return this.recordedChunks.length > 0;
  }

  private getSupportedMimeType(): string | null {
    // Prefer formats in order of quality/compatibility
    const formats = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4;codecs=aac',
      'audio/mp4',
    ];

    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) {
        return format;
      }
    }

    return null;
  }

  dispose(): void {
    // Stop recording if active
    if (this.recordingState === 'recording') {
      this.stopRecording();
    }

    this.gainNode.disconnect();
    this.analyser.disconnect();
    if (this.mediaStreamDest) {
      this.mediaStreamDest.disconnect();
    }
  }
}
