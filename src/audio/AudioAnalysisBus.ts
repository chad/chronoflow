// AudioAnalysisBus - Real-time audio analysis exposed for visuals integration
//
// This is the bridge between Mosh's audio and external JavaScript visuals.
// It provides a pub/sub API for:
//   - FFT spectrum data (frequency bands)
//   - Waveform data (oscilloscope)
//   - Spectral features (centroid, brightness, loudness, beat detection)
//   - Per-band energy (bass, low-mid, mid, high-mid, treble)
//
// Usage from external code:
//   import { audioAnalysisBus } from 'mosh';
//
//   audioAnalysisBus.subscribe('spectrum', (data) => {
//     // data.frequencies: Float32Array of frequency magnitudes
//     // data.bands: { bass, lowMid, mid, highMid, treble }
//     // data.centroid: spectral centroid frequency
//     // data.loudness: overall RMS loudness (0-1)
//     // data.peak: peak amplitude (0-1)
//     // data.beat: boolean - detected transient/beat
//     updateVisuals(data);
//   });
//
//   // Subscribe to individual features
//   audioAnalysisBus.subscribe('beat', (isBeat) => {
//     triggerParticles();
//   });
//
//   // Control analysis
//   audioAnalysisBus.setFFTSize(4096); // Higher resolution
//   audioAnalysisBus.setSmoothingTimeConstant(0.85);

export interface SpectrumData {
  // Raw data
  frequencies: Float32Array;    // FFT magnitude data (dB)
  waveform: Float32Array;       // Time-domain waveform data
  
  // Processed features
  bands: {
    sub: number;      // 20-60 Hz
    bass: number;     // 60-250 Hz
    lowMid: number;   // 250-500 Hz
    mid: number;      // 500-2000 Hz
    highMid: number;  // 2000-6000 Hz
    treble: number;   // 6000-20000 Hz
  };
  
  // Spectral features
  centroid: number;     // Spectral centroid (brightness) in Hz
  spread: number;       // Spectral spread
  loudness: number;     // RMS loudness (0-1)
  peak: number;         // Peak amplitude (0-1)
  
  // Rhythm
  beat: boolean;        // Onset/beat detected this frame
  beatStrength: number; // Beat strength (0-1)
  
  // Envelope
  envelope: number;     // Amplitude envelope (smoothed loudness)
  
  // Timestamp
  time: number;         // AudioContext time
}

type SubscriptionType = 'spectrum' | 'beat' | 'bands' | 'envelope' | 'all';

interface Subscription {
  type: SubscriptionType;
  callback: (data: unknown) => void;
}

class AudioAnalysisBus {
  private analyser: AnalyserNode | null = null;
  private context: AudioContext | null = null;
  private inputGain: GainNode | null = null;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private frequencyData: any = new Float32Array(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private waveformData: any = new Float32Array(0);
  
  private subscriptions: Map<string, Subscription> = new Map();
  private nextId = 0;
  private rafId: number | null = null;
  private isRunning = false;
  
  // Beat detection state
  private prevEnergy = 0;
  private energyHistory: number[] = [];
  private beatThreshold = 1.5;
  private envelope = 0;
  
  // Configuration
  private fftSize = 2048;
  private smoothingTimeConstant = 0.8;
  
  // Throttle: only process when there are subscribers
  private lastProcessTime = 0;
  private processInterval = 1000 / 60; // 60fps default
  
  init(context: AudioContext, sourceNode: AudioNode): void {
    this.context = context;
    
    // Create analysis chain
    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;
    
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
    
    // Connect source → input gain → analyser
    sourceNode.connect(this.inputGain);
    this.inputGain.connect(this.analyser);
    
    // Allocate buffers
    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    this.waveformData = new Float32Array(this.analyser.fftSize);
    
    this.energyHistory = new Array(43).fill(0); // ~0.7 second history at 60fps
  }
  
  // Connect any AudioNode to the analysis bus
  connectSource(sourceNode: AudioNode): void {
    if (this.inputGain) {
      sourceNode.connect(this.inputGain);
    }
  }
  
  disconnectSource(sourceNode: AudioNode): void {
    if (this.inputGain) {
      try { sourceNode.disconnect(this.inputGain); } catch { /* ok */ }
    }
  }
  
  // --- Configuration ---
  
  setFFTSize(size: number): void {
    this.fftSize = size;
    if (this.analyser) {
      this.analyser.fftSize = size;
      this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
      this.waveformData = new Float32Array(this.analyser.fftSize);
    }
  }
  
  setSmoothingTimeConstant(value: number): void {
    this.smoothingTimeConstant = value;
    if (this.analyser) {
      this.analyser.smoothingTimeConstant = value;
    }
  }
  
  setFrameRate(fps: number): void {
    this.processInterval = 1000 / fps;
  }
  
  setBeatSensitivity(threshold: number): void {
    this.beatThreshold = threshold;
  }
  
  // --- Subscription API ---
  
  subscribe(type: SubscriptionType, callback: (data: unknown) => void): string {
    const id = `sub_${this.nextId++}`;
    this.subscriptions.set(id, { type, callback });
    
    // Auto-start processing when first subscriber joins
    if (!this.isRunning && this.analyser) {
      this.start();
    }
    
    return id;
  }
  
  unsubscribe(id: string): void {
    this.subscriptions.delete(id);
    
    // Auto-stop when no subscribers
    if (this.subscriptions.size === 0) {
      this.stop();
    }
  }
  
  // Convenience: subscribe with auto-typed callbacks
  onSpectrum(callback: (data: SpectrumData) => void): string {
    return this.subscribe('all', callback as (data: unknown) => void);
  }
  
  onBeat(callback: (data: { beat: boolean; strength: number }) => void): string {
    return this.subscribe('beat', callback as (data: unknown) => void);
  }
  
  onBands(callback: (data: SpectrumData['bands']) => void): string {
    return this.subscribe('bands', callback as (data: unknown) => void);
  }
  
  onEnvelope(callback: (value: number) => void): string {
    return this.subscribe('envelope', callback as (data: unknown) => void);
  }
  
  // --- Processing ---
  
  private start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.process();
  }
  
  private stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  
  private process = (): void => {
    if (!this.isRunning || !this.analyser || !this.context) return;
    
    const now = performance.now();
    if (now - this.lastProcessTime < this.processInterval) {
      this.rafId = requestAnimationFrame(this.process);
      return;
    }
    this.lastProcessTime = now;
    
    // Get raw data
    this.analyser.getFloatFrequencyData(this.frequencyData);
    this.analyser.getFloatTimeDomainData(this.waveformData);
    
    // Compute features
    const data = this.computeFeatures();
    
    // Dispatch to subscribers
    this.subscriptions.forEach(sub => {
      switch (sub.type) {
        case 'all':
        case 'spectrum':
          sub.callback(data);
          break;
        case 'beat':
          sub.callback({ beat: data.beat, strength: data.beatStrength });
          break;
        case 'bands':
          sub.callback(data.bands);
          break;
        case 'envelope':
          sub.callback(data.envelope);
          break;
      }
    });
    
    this.rafId = requestAnimationFrame(this.process);
  };
  
  private computeFeatures(): SpectrumData {
    const sampleRate = this.context!.sampleRate;
    const binCount = this.analyser!.frequencyBinCount;
    const binWidth = sampleRate / this.analyser!.fftSize;
    
    // --- Bands (convert dB to linear, average within band) ---
    const bandRanges = {
      sub: [20, 60],
      bass: [60, 250],
      lowMid: [250, 500],
      mid: [500, 2000],
      highMid: [2000, 6000],
      treble: [6000, 20000],
    };
    
    const bands: SpectrumData['bands'] = { sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0 };
    
    for (const [name, [low, high]] of Object.entries(bandRanges)) {
      const lowBin = Math.floor(low / binWidth);
      const highBin = Math.min(Math.ceil(high / binWidth), binCount - 1);
      let sum = 0;
      let count = 0;
      for (let i = lowBin; i <= highBin; i++) {
        sum += Math.pow(10, this.frequencyData[i] / 20); // dB to linear
        count++;
      }
      (bands as Record<string, number>)[name] = count > 0 ? sum / count : 0;
    }
    
    // --- Spectral centroid ---
    let weightedSum = 0;
    let magnitudeSum = 0;
    for (let i = 0; i < binCount; i++) {
      const mag = Math.pow(10, this.frequencyData[i] / 20);
      const freq = i * binWidth;
      weightedSum += mag * freq;
      magnitudeSum += mag;
    }
    const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    
    // --- Spectral spread ---
    let spreadSum = 0;
    if (magnitudeSum > 0) {
      for (let i = 0; i < binCount; i++) {
        const mag = Math.pow(10, this.frequencyData[i] / 20);
        const freq = i * binWidth;
        spreadSum += mag * Math.pow(freq - centroid, 2);
      }
    }
    const spread = magnitudeSum > 0 ? Math.sqrt(spreadSum / magnitudeSum) : 0;
    
    // --- RMS Loudness ---
    let rmsSum = 0;
    let peakVal = 0;
    for (let i = 0; i < this.waveformData.length; i++) {
      const v = this.waveformData[i];
      rmsSum += v * v;
      peakVal = Math.max(peakVal, Math.abs(v));
    }
    const loudness = Math.min(1, Math.sqrt(rmsSum / this.waveformData.length) * 3);
    const peak = Math.min(1, peakVal);
    
    // --- Envelope (smoothed loudness) ---
    this.envelope = this.envelope * 0.9 + loudness * 0.1;
    
    // --- Beat detection (energy flux) ---
    const energy = bands.bass * 3 + bands.sub * 2 + loudness;
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const beat = energy > avgEnergy * this.beatThreshold && energy > this.prevEnergy * 1.1;
    const beatStrength = avgEnergy > 0 ? Math.min(1, (energy - avgEnergy) / avgEnergy) : 0;
    
    this.energyHistory.push(energy);
    if (this.energyHistory.length > 43) this.energyHistory.shift();
    this.prevEnergy = energy;
    
    return {
      frequencies: this.frequencyData,
      waveform: this.waveformData,
      bands,
      centroid,
      spread,
      loudness,
      peak,
      beat,
      beatStrength: Math.max(0, beatStrength),
      envelope: this.envelope,
      time: this.context!.currentTime,
    };
  }
  
  // --- Snapshot (for non-subscription use) ---
  
  getSnapshot(): SpectrumData | null {
    if (!this.analyser || !this.context) return null;
    
    this.analyser.getFloatFrequencyData(this.frequencyData);
    this.analyser.getFloatTimeDomainData(this.waveformData);
    
    return this.computeFeatures();
  }
  
  // --- Cleanup ---
  
  dispose(): void {
    this.stop();
    this.subscriptions.clear();
    if (this.inputGain) {
      this.inputGain.disconnect();
      this.inputGain = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    this.context = null;
  }
  
  isInitialized(): boolean {
    return this.analyser !== null;
  }
}

export const audioAnalysisBus = new AudioAnalysisBus();
export default audioAnalysisBus;
