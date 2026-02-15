# ChronoFlow Engine — Standalone Usage

The `ChronoFlowEngine` runs ChronoFlow patches headlessly (no UI required).
It wraps Web Audio API and reconstructs any patch JSON into a live audio graph.

## Basic Usage

```typescript
import { ChronoFlowEngine } from './engine';

const engine = new ChronoFlowEngine();
await engine.init();

// Load a patch designed in the ChronoFlow editor
const patch = await fetch('/patches/voice-effects.json').then(r => r.json());
engine.loadPatch(patch);
```

## Sharing an AudioContext

If your app already has an AudioContext (e.g., ElevenLabs, Tone.js, Web Audio),
pass it in so everything shares the same audio thread:

```typescript
const engine = new ChronoFlowEngine({
  context: existingAudioContext,
  autoConnect: true,   // connects to context.destination
  masterVolume: 0.7,
});
await engine.init();
```

## Piping External Audio In

Use an `audioinput` node in your patch to bring in external audio:

```typescript
import { ChronoFlowEngine, SynthAudioInputNode } from './engine';

const engine = new ChronoFlowEngine({ context: myContext });
await engine.init();
engine.loadPatch(patch);

// Get the audio input node from the patch
const input = engine.getNodeTyped<SynthAudioInputNode>('audio-input-1');

// Option A: Connect a MediaStream (from ElevenLabs, getUserMedia, etc.)
input.connectStream(elevenLabsMediaStream);

// Option B: Connect an AudioNode directly
input.connectAudioNode(elevenLabsOutputNode);

// Option C: Start microphone capture
await input.startMicrophone();
```

## Tweaking Params at Runtime

```typescript
// By node ID and param name
engine.setParam('shimmer-reverb-1', 'shimmer', 0.8);
engine.setParam('formant-1', 'shift', -3);
engine.setParam('pitch-shifter-1', 'semitones', 7);

// Batch updates
engine.setParams([
  { nodeId: 'delay-1', param: 'mix', value: 0.3 },
  { nodeId: 'delay-1', param: 'feedback', value: 0.6 },
]);

// Read params
const mix = engine.getParam('delay-1', 'mix'); // 0.3
```

## Routing Output

```typescript
// Default: auto-connects to context.destination (speakers)
const engine = new ChronoFlowEngine({ autoConnect: true });

// Manual routing: send output to your own gain node
const engine = new ChronoFlowEngine({ autoConnect: false });
await engine.init();
engine.loadPatch(patch);
engine.routeTo(myGainNode);

// Or disconnect from speakers and route elsewhere
engine.disconnectFromDestination();
engine.routeTo(myRecordingNode);
```

## Event Hooks

```typescript
engine.on({
  onPatchLoaded: (patch) => console.log('Loaded:', patch.meta.name),
  onParamChanged: (nodeId, param, value) => {
    // Sync UI sliders, send OSC, etc.
  },
});
```

## Building Patches Programmatically

```typescript
import { ChronoFlowEngine, createEmptyPatch } from './engine';

const engine = new ChronoFlowEngine();
await engine.init();

// Start from empty
engine.loadPatch(createEmptyPatch('My Effects Chain'));

// Add nodes
engine.createNode('audioinput', 'mic', { gain: 1.0 });
engine.createNode('pitchshifter', 'pitch', { semitones: -5, mix: 0.7 });
engine.createNode('shimmerreverb', 'shimmer', { decay: 6, shimmer: 0.8, mix: 0.4 });
engine.createNode('eq', 'eq', { lowGain: -3, highGain: 2 });

// Wire them up
engine.connect('mic', 'output', 'eq', 'input');
engine.connect('eq', 'output', 'pitch', 'input');
engine.connect('pitch', 'output', 'shimmer', 'input');
engine.connect('shimmer', 'output', 'output', 'input');

// Start the mic
const mic = engine.getNodeTyped<SynthAudioInputNode>('mic');
await mic.startMicrophone();

// Export the patch for later
const patchJson = engine.toJSONString();
localStorage.setItem('my-patch', patchJson);
```

## Example: AI Avatar Voice Processing

```typescript
import { ChronoFlowEngine, SynthAudioInputNode } from './engine';

// 1. Share the AudioContext with ElevenLabs
const engine = new ChronoFlowEngine({ context: elevenLabsContext });
await engine.init();

// 2. Load the effects chain you designed in ChronoFlow's editor
const patch = await fetch('/patches/avatar-voice.json').then(r => r.json());
engine.loadPatch(patch);

// 3. Pipe ElevenLabs output into the patch
const input = engine.getNodeTyped<SynthAudioInputNode>('audio-input-1');
input.connectStream(elevenLabsOutputStream);

// 4. Audio now flows:
//    ElevenLabs → AudioInput → EQ → PitchShifter → FormantShifter
//               → Delay → ShimmerReverb → Compressor → Output → Speakers

// 5. Automate effects for keynote scenes
function setScene(scene: string) {
  switch (scene) {
    case 'intro':
      engine.setParam('shimmer-1', 'shimmer', 0.9);
      engine.setParam('shimmer-1', 'mix', 0.6);
      break;
    case 'talking':
      engine.setParam('shimmer-1', 'shimmer', 0.2);
      engine.setParam('shimmer-1', 'mix', 0.15);
      break;
    case 'dramatic':
      engine.setParam('formant-1', 'shift', -4);
      engine.setParam('pitch-1', 'semitones', -2);
      engine.setParam('delay-1', 'mix', 0.4);
      break;
  }
}
```
