// Mock Web Audio API for testing

export class MockAudioParam {
  value: number;
  defaultValue: number;
  minValue: number;
  maxValue: number;
  automationRate: 'a-rate' | 'k-rate' = 'a-rate';

  constructor(defaultValue = 0, minValue = -3.4028235e38, maxValue = 3.4028235e38) {
    this.value = defaultValue;
    this.defaultValue = defaultValue;
    this.minValue = minValue;
    this.maxValue = maxValue;
  }

  setValueAtTime(value: number, _startTime: number): MockAudioParam {
    this.value = value;
    return this;
  }

  linearRampToValueAtTime(value: number, _endTime: number): MockAudioParam {
    this.value = value;
    return this;
  }

  exponentialRampToValueAtTime(value: number, _endTime: number): MockAudioParam {
    this.value = value;
    return this;
  }

  setTargetAtTime(target: number, _startTime: number, _timeConstant: number): MockAudioParam {
    this.value = target;
    return this;
  }

  setValueCurveAtTime(_values: Float32Array, _startTime: number, _duration: number): MockAudioParam {
    return this;
  }

  cancelScheduledValues(_startTime: number): MockAudioParam {
    return this;
  }

  cancelAndHoldAtTime(_cancelTime: number): MockAudioParam {
    return this;
  }
}

export class MockAudioNode {
  context: MockAudioContext;
  numberOfInputs = 1;
  numberOfOutputs = 1;
  channelCount = 2;
  channelCountMode: ChannelCountMode = 'max';
  channelInterpretation: ChannelInterpretation = 'speakers';
  private connections: Set<AudioNode | AudioParam> = new Set();

  constructor(context: MockAudioContext) {
    this.context = context;
  }

  connect(destination: AudioNode | AudioParam, _outputIndex?: number, _inputIndex?: number): AudioNode {
    this.connections.add(destination);
    return destination as AudioNode;
  }

  disconnect(destination?: AudioNode | AudioParam | number): void {
    if (destination === undefined) {
      this.connections.clear();
    } else if (typeof destination !== 'number') {
      this.connections.delete(destination);
    }
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }
}

export class MockGainNode extends MockAudioNode {
  gain: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context);
    this.gain = new MockAudioParam(1);
  }
}

export class MockOscillatorNode extends MockAudioNode {
  frequency: MockAudioParam;
  detune: MockAudioParam;
  type: OscillatorType = 'sine';
  private started = false;
  private stopped = false;
  onended: ((this: MockOscillatorNode, ev: Event) => void) | null = null;

  constructor(context: MockAudioContext) {
    super(context);
    this.frequency = new MockAudioParam(440, -22050, 22050);
    this.detune = new MockAudioParam(0, -153600, 153600);
    this.numberOfInputs = 0;
  }

  start(_when?: number): void {
    if (this.started) throw new Error('Cannot start oscillator more than once');
    this.started = true;
  }

  stop(_when?: number): void {
    if (!this.started) throw new Error('Cannot stop oscillator before it has started');
    if (this.stopped) throw new Error('Cannot stop oscillator more than once');
    this.stopped = true;
    if (this.onended) {
      this.onended.call(this, new Event('ended'));
    }
  }

  setPeriodicWave(_periodicWave: PeriodicWave): void {}
}

export class MockBiquadFilterNode extends MockAudioNode {
  frequency: MockAudioParam;
  detune: MockAudioParam;
  Q: MockAudioParam;
  gain: MockAudioParam;
  type: BiquadFilterType = 'lowpass';

  constructor(context: MockAudioContext) {
    super(context);
    this.frequency = new MockAudioParam(350, 0, 22050);
    this.detune = new MockAudioParam(0, -153600, 153600);
    this.Q = new MockAudioParam(1, 0.0001, 1000);
    this.gain = new MockAudioParam(0, -40, 40);
  }

  getFrequencyResponse(
    frequencyHz: Float32Array,
    magResponse: Float32Array,
    phaseResponse: Float32Array
  ): void {
    for (let i = 0; i < frequencyHz.length; i++) {
      magResponse[i] = 1;
      phaseResponse[i] = 0;
    }
  }
}

export class MockConstantSourceNode extends MockAudioNode {
  offset: MockAudioParam;
  private _started = false;
  onended: ((this: MockConstantSourceNode, ev: Event) => void) | null = null;

  constructor(context: MockAudioContext) {
    super(context);
    this.offset = new MockAudioParam(1);
    this.numberOfInputs = 0;
  }

  start(_when?: number): void {
    this._started = true;
  }

  get started(): boolean {
    return this._started;
  }

  stop(_when?: number): void {
    if (this.onended) {
      this.onended.call(this, new Event('ended'));
    }
  }
}

export class MockDelayNode extends MockAudioNode {
  delayTime: MockAudioParam;

  constructor(context: MockAudioContext, maxDelayTime = 1) {
    super(context);
    this.delayTime = new MockAudioParam(0, 0, maxDelayTime);
  }
}

export class MockConvolverNode extends MockAudioNode {
  buffer: AudioBuffer | null = null;
  normalize = true;
}

export class MockDynamicsCompressorNode extends MockAudioNode {
  threshold: MockAudioParam;
  knee: MockAudioParam;
  ratio: MockAudioParam;
  attack: MockAudioParam;
  release: MockAudioParam;
  reduction = 0;

  constructor(context: MockAudioContext) {
    super(context);
    this.threshold = new MockAudioParam(-24, -100, 0);
    this.knee = new MockAudioParam(30, 0, 40);
    this.ratio = new MockAudioParam(12, 1, 20);
    this.attack = new MockAudioParam(0.003, 0, 1);
    this.release = new MockAudioParam(0.25, 0, 1);
  }
}

export class MockAudioBufferSourceNode extends MockAudioNode {
  buffer: AudioBuffer | null = null;
  playbackRate: MockAudioParam;
  detune: MockAudioParam;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  private _started = false;
  onended: ((this: MockAudioBufferSourceNode, ev: Event) => void) | null = null;

  constructor(context: MockAudioContext) {
    super(context);
    this.playbackRate = new MockAudioParam(1);
    this.detune = new MockAudioParam(0);
    this.numberOfInputs = 0;
  }

  start(_when?: number, _offset?: number, _duration?: number): void {
    if (this._started) throw new Error('Cannot start source more than once');
    this._started = true;
  }

  stop(_when?: number): void {
    if (this.onended) {
      this.onended.call(this, new Event('ended'));
    }
  }
}

export class MockScriptProcessorNode extends MockAudioNode {
  bufferSize: number;
  onaudioprocess: ((this: ScriptProcessorNode, ev: AudioProcessingEvent) => void) | null = null;

  constructor(context: MockAudioContext, bufferSize: number) {
    super(context);
    this.bufferSize = bufferSize;
  }
}

export class MockAudioBuffer {
  sampleRate: number;
  length: number;
  duration: number;
  numberOfChannels: number;
  private channels: Float32Array[];

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
    this.channels = [];
    for (let i = 0; i < options.numberOfChannels; i++) {
      this.channels.push(new Float32Array(options.length));
    }
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel];
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel = 0): void {
    const source = this.channels[channelNumber];
    for (let i = 0; i < destination.length && startInChannel + i < source.length; i++) {
      destination[i] = source[startInChannel + i];
    }
  }

  copyToChannel(source: Float32Array, channelNumber: number, startInChannel = 0): void {
    const dest = this.channels[channelNumber];
    for (let i = 0; i < source.length && startInChannel + i < dest.length; i++) {
      dest[startInChannel + i] = source[i];
    }
  }
}

export class MockAudioContext {
  sampleRate = 44100;
  currentTime = 0;
  state: AudioContextState = 'running';
  destination: MockAudioNode;
  baseLatency = 0;
  outputLatency = 0;

  constructor() {
    this.destination = new MockAudioNode(this);
    this.destination.numberOfInputs = 1;
    this.destination.numberOfOutputs = 0;
  }

  createGain(): MockGainNode {
    return new MockGainNode(this);
  }

  createOscillator(): MockOscillatorNode {
    return new MockOscillatorNode(this);
  }

  createBiquadFilter(): MockBiquadFilterNode {
    return new MockBiquadFilterNode(this);
  }

  createConstantSource(): MockConstantSourceNode {
    return new MockConstantSourceNode(this);
  }

  createDelay(maxDelayTime?: number): MockDelayNode {
    return new MockDelayNode(this, maxDelayTime);
  }

  createConvolver(): MockConvolverNode {
    return new MockConvolverNode(this);
  }

  createDynamicsCompressor(): MockDynamicsCompressorNode {
    return new MockDynamicsCompressorNode(this);
  }

  createBufferSource(): MockAudioBufferSourceNode {
    return new MockAudioBufferSourceNode(this);
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }

  createScriptProcessor(bufferSize: number, _numberOfInputChannels?: number, _numberOfOutputChannels?: number): MockScriptProcessorNode {
    return new MockScriptProcessorNode(this, bufferSize);
  }

  createAnalyser(): MockAudioNode {
    return new MockAudioNode(this);
  }

  createChannelMerger(_numberOfInputs?: number): MockAudioNode {
    return new MockAudioNode(this);
  }

  createChannelSplitter(_numberOfOutputs?: number): MockAudioNode {
    return new MockAudioNode(this);
  }

  createWaveShaper(): MockAudioNode {
    return new MockAudioNode(this);
  }

  createStereoPanner(): MockAudioNode {
    return new MockAudioNode(this);
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  async close(): Promise<void> {
    this.state = 'closed';
  }

  decodeAudioData(): Promise<AudioBuffer> {
    return Promise.resolve(this.createBuffer(2, 44100, 44100) as unknown as AudioBuffer);
  }

  // Advance time for testing
  advanceTime(seconds: number): void {
    this.currentTime += seconds;
  }
}

// Install mock globally
export function installMockAudioContext(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).AudioContext = MockAudioContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).AudioBuffer = MockAudioBuffer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).GainNode = MockGainNode;
}
