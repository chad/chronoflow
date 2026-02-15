# Memo: Real-Time Voice Processing with ChronoFlow Engine

**To:** Dev Team  
**From:** Chad  
**Re:** Using ChronoFlow as the audio effects layer for the AI speaking avatar  
**Date:** February 2026

---

## TL;DR

We have a standalone audio engine called ChronoFlow that runs entirely in the browser via Web Audio API. It has modules for pitch shifting, formant shifting, vocoding, glitch/stutter, frequency shifting, comb filtering, delay, reverb, shimmer reverb, EQ, compression, bitcrushing, and more — all modulatable in real time. We're going to pipe the ElevenLabs Conversational AI audio output through it before it hits the speakers. This replaces the BlackHole → Ableton chain entirely. Everything stays in-browser, zero added latency from round-tripping through virtual audio devices.

The key creative goal: **oscillate between male and female vocal character in real time, with glitch artifacts, delay trails, and reverb textures that make the avatar sound otherworldly — not human, not purely synthetic, something in between.**

---

## Architecture

```
ElevenLabs Conversational AI
        │
        ▼ (MediaStream or AudioNode)
┌─────────────────────────────────────────────────────────┐
│  ChronoFlowEngine (same AudioContext)                   │
│                                                         │
│  AudioInput → EQ → Compressor → FormantShifter          │
│                                     │                   │
│                              PitchShifter               │
│                                     │                   │
│                         ┌───────────┼──────────┐        │
│                         ▼           ▼          ▼        │
│                      Glitch    FreqShifter  CombFilter  │
│                         │           │          │        │
│                         └─────┬─────┘──────────┘        │
│                               ▼                         │
│                             Mixer                       │
│                               │                         │
│                    ┌──────────┼──────────┐              │
│                    ▼          ▼          ▼              │
│                 Delay   ShimmerReverb  Vocoder          │
│                    │          │          │              │
│                    └──────────┼──────────┘              │
│                               ▼                         │
│                          Compressor                     │
│                               │                         │
│                            Output → Speakers            │
└─────────────────────────────────────────────────────────┘
```

You don't need to build this exact graph. The engine is modular — you wire up whatever chain you want, save it as a JSON patch, and load it at runtime. The above is a reference for what a full voice-mangling chain looks like.

---

## Integration Steps

### 1. Install / Import

ChronoFlow isn't published to npm yet. For now, copy or symlink the engine source into your project:

```
your-avatar-project/
  src/
    chronoflow/          ← copy from chronoflow/src/engine/ and chronoflow/src/audio/ and chronoflow/src/patch/types.ts
  public/
    worklets/            ← copy from chronoflow/public/worklets/
      pitch-shifter-processor.js
      bitcrusher-processor.js
      vocoder-processor.js
      glitch-processor.js
      freq-shifter-processor.js
      granular-processor.js
```

The worklet files **must** be served from `/worklets/` on your domain. They're loaded at runtime by the AudioWorklet API and can't be bundled.

Import:

```typescript
import { ChronoFlowEngine, SynthAudioInputNode } from './chronoflow/engine';
```

### 2. Share the AudioContext

This is the single most important thing. ElevenLabs and ChronoFlow must share the same `AudioContext`. If they don't, you'll hear the raw ElevenLabs voice on one context and the processed voice on another — or worse, nothing at all.

```typescript
// If ElevenLabs exposes its AudioContext:
const engine = new ChronoFlowEngine({
  context: elevenLabs.getAudioContext(),
  autoConnect: true,
  masterVolume: 0.8,
});
await engine.init();
```

If ElevenLabs doesn't expose its context directly, create one yourself and configure ElevenLabs to use it:

```typescript
const sharedContext = new AudioContext();

// Tell ElevenLabs to use this context (check their API docs)
const elevenLabs = new ElevenLabsConversation({
  audioContext: sharedContext,
  // ...
});

const engine = new ChronoFlowEngine({
  context: sharedContext,
  autoConnect: true,
});
await engine.init();
```

### 3. Connect ElevenLabs Output to ChronoFlow Input

There are three ways depending on what ElevenLabs gives you:

**Option A: MediaStream** (most likely)

```typescript
const stream = elevenLabs.getOutputStream(); // or however they expose it
const input = engine.getNodeTyped<SynthAudioInputNode>('audio-input-1');
input.connectStream(stream);
```

**Option B: AudioNode**

```typescript
const elOutput = elevenLabs.getOutputNode(); // if they expose a Web Audio node
const input = engine.getNodeTyped<SynthAudioInputNode>('audio-input-1');
input.connectAudioNode(elOutput);
```

**Option C: HTMLAudioElement**

```typescript
const audioEl = document.querySelector('audio#elevenlabs');
const source = sharedContext.createMediaElementSource(audioEl);
const input = engine.getNodeTyped<SynthAudioInputNode>('audio-input-1');
input.connectAudioNode(source);
```

**Important:** In all cases, you need to prevent ElevenLabs from also connecting directly to `context.destination`, or you'll hear both the dry and processed signal. Check their API for a way to disable their default output routing.

### 4. Load a Patch

Design the effects chain in the ChronoFlow editor (run `npm run dev` in the chronoflow directory, open in browser, build your patch, export JSON). Then load it:

```typescript
const patch = await fetch('/patches/avatar-voice.json').then(r => r.json());
engine.loadPatch(patch);
```

Or build it programmatically (see Section 6 below).

### 5. Mute ElevenLabs Direct Output

You need to intercept ElevenLabs' audio before it reaches the speakers. The processed signal comes out of ChronoFlow's output. If ElevenLabs is also sending audio to `context.destination`, you'll get double audio.

```typescript
// If ElevenLabs gives you control over its output:
elevenLabs.setOutputVolume(0); // Mute their direct output
// ChronoFlow handles the output now

// If they use an <audio> element:
audioElement.volume = 0; // We're capturing via createMediaElementSource
```

---

## The Voice Oscillation System

This is the core creative feature: smoothly morphing between male and female vocal character.

### How It Works

**Formant shifting** changes the resonant characteristics of the vocal tract without changing pitch. Shift formants up → voice sounds female/smaller. Shift formants down → voice sounds male/larger.

**Pitch shifting** changes the fundamental frequency. Shift up → higher voice. Shift down → lower voice.

Combined, you can create convincing gender oscillation:

```typescript
// Morph parameter: -1.0 = deep male, 0.0 = neutral, 1.0 = high female
function setVoiceCharacter(morph: number) {
  // Formant shift: -6 semitones (male) to +6 semitones (female)
  engine.setParam('formant-1', 'shift', morph * 6);

  // Pitch shift: -4 semitones (male) to +4 semitones (female)
  engine.setParam('pitch-1', 'semitones', Math.round(morph * 4));

  // Fine pitch for smooth movement between semitones
  engine.setParam('pitch-1', 'cents', (morph * 4 - Math.round(morph * 4)) * 100);

  // EQ adjustments: boost low end for male, high end for female
  engine.setParam('eq-1', 'lowGain', morph < 0 ? Math.abs(morph) * 4 : -morph * 2);
  engine.setParam('eq-1', 'highGain', morph > 0 ? morph * 3 : -Math.abs(morph) * 2);
}
```

To oscillate continuously, drive it with a slow sine wave or an automated timeline:

```typescript
// Slow oscillation between male and female
let phase = 0;
const oscillationRate = 0.05; // Hz — one full cycle every 20 seconds

function animateVoice() {
  phase += oscillationRate * (1 / 60);
  const morph = Math.sin(phase * Math.PI * 2);
  setVoiceCharacter(morph);
  requestAnimationFrame(animateVoice);
}
animateVoice();
```

Or drive it from the presentation timeline:

```typescript
// Scene-based voice character
function setScene(scene: string) {
  switch (scene) {
    case 'introduction':
      setVoiceCharacter(0);        // Neutral
      setGlitchIntensity(0);       // Clean
      setReverbLevel(0.1);         // Dry
      break;

    case 'transformation':
      setVoiceCharacter(0.7);      // Shifting female
      setGlitchIntensity(0.3);     // Subtle glitches
      setReverbLevel(0.3);         // Some space
      break;

    case 'otherworldly':
      setVoiceCharacter(-0.5);     // Deep
      setGlitchIntensity(0.8);     // Heavy glitch
      setReverbLevel(0.6);         // Washed out
      setFreqShift(50);            // Alien undertone
      break;

    case 'convergence':
      // Rapid oscillation
      startFastOscillation(2);     // 2Hz morph between male/female
      setGlitchIntensity(1.0);     // Maximum stutter
      break;
  }
}
```

---

## Glitch System

The glitch module captures a tiny buffer of the voice and retriggers it. Here's how to control it:

```typescript
function setGlitchIntensity(intensity: number) {
  if (intensity === 0) {
    engine.setParam('glitch-1', 'active', false);
    return;
  }

  engine.setParam('glitch-1', 'active', true);

  // Higher intensity = faster retriggering, smaller grains, more chaos
  engine.setParam('glitch-1', 'rate', 2 + intensity * 30);       // 2-32 Hz
  engine.setParam('glitch-1', 'size', 0.2 - intensity * 0.18);   // 200ms down to 20ms
  engine.setParam('glitch-1', 'probability', 0.3 + intensity * 0.7);
  engine.setParam('glitch-1', 'mix', 0.3 + intensity * 0.7);

  // At high intensity, add pitch ramp (tape stop effect)
  engine.setParam('glitch-1', 'pitchRamp', intensity > 0.7 ? -0.3 : 0);

  // Randomly reverse some grains at high intensity
  engine.setParam('glitch-1', 'reverse', intensity > 0.5);
}
```

For synced glitch patterns, connect a clock or euclidean rhythm generator to the glitch trigger input in your patch. The euclidean module generates rhythmic patterns that feel musical rather than random.

---

## Reverb & Space

```typescript
function setReverbLevel(level: number) {
  // Shimmer reverb for ethereal quality
  engine.setParam('shimmer-1', 'mix', level);
  engine.setParam('shimmer-1', 'shimmer', level * 0.8);  // More shimmer as we get wetter
  engine.setParam('shimmer-1', 'decay', 2 + level * 8);  // 2-10 second decay

  // Delay for rhythmic echoes
  engine.setParam('delay-1', 'mix', level * 0.4);
  engine.setParam('delay-1', 'feedback', 0.3 + level * 0.4);
}

function setFreqShift(hz: number) {
  engine.setParam('freqshift-1', 'shiftHz', hz);
  engine.setParam('freqshift-1', 'mix', hz === 0 ? 0 : 0.3);
}
```

---

## Building the Patch Programmatically

If you'd rather build the effects chain in code instead of the visual editor:

```typescript
import { ChronoFlowEngine, SynthAudioInputNode, createEmptyPatch } from './chronoflow/engine';

const engine = new ChronoFlowEngine({ context: sharedContext });
await engine.init();
engine.loadPatch(createEmptyPatch('Avatar Voice'));

// === Build the chain ===

// Input
engine.createNode('audioinput', 'input-1', { gain: 1.0 });

// Tone shaping
engine.createNode('eq', 'eq-1', { lowGain: 0, midGain: 0, highGain: 0 });
engine.createNode('compressor', 'comp-in', { threshold: -20, ratio: 3, mix: 1.0 });

// Voice character (the morph targets)
engine.createNode('formantshifter', 'formant-1', { shift: 0, mix: 1.0, bandwidth: 8 });
engine.createNode('pitchshifter', 'pitch-1', { semitones: 0, cents: 0, mix: 1.0 });

// Glitch / destruction
engine.createNode('glitch', 'glitch-1', { rate: 8, size: 0.05, mix: 0, active: false });
engine.createNode('freqshifter', 'freqshift-1', { shiftHz: 0, mix: 0 });
engine.createNode('combfilter', 'comb-1', { frequency: 200, feedback: 0.7, mix: 0 });
engine.createNode('bitcrusher', 'crush-1', { bits: 12, sampleRateReduction: 1, mix: 0 });

// Mixing bus
engine.createNode('mixer', 'mix-1', { level1: 1, level2: 0.5, level3: 0.3, level4: 0.2, master: 0.8 });

// Space
engine.createNode('delay', 'delay-1', { time: 0.3, feedback: 0.4, mix: 0 });
engine.createNode('shimmerreverb', 'shimmer-1', { decay: 4, shimmer: 0.5, pitchShift: 12, mix: 0.15 });

// Output compression
engine.createNode('compressor', 'comp-out', { threshold: -6, ratio: 8, makeupGain: 3, mix: 1.0 });

// === Wire it up ===

// Main signal path
engine.connect('input-1', 'output', 'eq-1', 'input');
engine.connect('eq-1', 'output', 'comp-in', 'input');
engine.connect('comp-in', 'output', 'formant-1', 'input');
engine.connect('formant-1', 'output', 'pitch-1', 'input');

// Parallel effects (all fed from pitch shifter output)
engine.connect('pitch-1', 'output', 'glitch-1', 'input');
engine.connect('pitch-1', 'output', 'freqshift-1', 'input');
engine.connect('pitch-1', 'output', 'comb-1', 'input');
engine.connect('pitch-1', 'output', 'crush-1', 'input');

// Mix parallel effects
engine.connect('pitch-1', 'output', 'mix-1', 'input1');     // Dry (post pitch/formant)
engine.connect('glitch-1', 'output', 'mix-1', 'input2');     // Glitch
engine.connect('freqshift-1', 'output', 'mix-1', 'input3');  // Freq shift
engine.connect('comb-1', 'output', 'mix-1', 'input4');       // Comb filter

// Space effects (serial after mixer)
engine.connect('mix-1', 'output', 'delay-1', 'input');
engine.connect('delay-1', 'output', 'shimmer-1', 'input');

// Output chain
engine.connect('shimmer-1', 'output', 'comp-out', 'input');
engine.connect('comp-out', 'output', 'output', 'input');

// === Connect the voice source ===
const input = engine.getNodeTyped<SynthAudioInputNode>('input-1');
input.connectStream(elevenLabsOutputStream);

// === Save for later ===
const patchJson = engine.toJSONString();
localStorage.setItem('avatar-voice-patch', patchJson);
```

---

## Preset System

Create named presets for different moments in the keynote:

```typescript
interface VoicePreset {
  name: string;
  params: Array<{ nodeId: string; param: string; value: number | string | boolean }>;
}

const PRESETS: Record<string, VoicePreset> = {
  clean: {
    name: 'Clean Voice',
    params: [
      { nodeId: 'formant-1', param: 'shift', value: 0 },
      { nodeId: 'pitch-1', param: 'semitones', value: 0 },
      { nodeId: 'glitch-1', param: 'active', value: false },
      { nodeId: 'freqshift-1', param: 'mix', value: 0 },
      { nodeId: 'comb-1', param: 'mix', value: 0 },
      { nodeId: 'crush-1', param: 'mix', value: 0 },
      { nodeId: 'delay-1', param: 'mix', value: 0 },
      { nodeId: 'shimmer-1', param: 'mix', value: 0.05 },
    ],
  },
  femaleShift: {
    name: 'Female Character',
    params: [
      { nodeId: 'formant-1', param: 'shift', value: 5 },
      { nodeId: 'pitch-1', param: 'semitones', value: 3 },
      { nodeId: 'eq-1', param: 'highGain', value: 2 },
      { nodeId: 'eq-1', param: 'lowGain', value: -2 },
    ],
  },
  maleShift: {
    name: 'Male Character',
    params: [
      { nodeId: 'formant-1', param: 'shift', value: -5 },
      { nodeId: 'pitch-1', param: 'semitones', value: -3 },
      { nodeId: 'eq-1', param: 'lowGain', value: 3 },
      { nodeId: 'eq-1', param: 'highGain', value: -2 },
    ],
  },
  glitchLight: {
    name: 'Subtle Glitch',
    params: [
      { nodeId: 'glitch-1', param: 'active', value: true },
      { nodeId: 'glitch-1', param: 'rate', value: 4 },
      { nodeId: 'glitch-1', param: 'size', value: 0.1 },
      { nodeId: 'glitch-1', param: 'probability', value: 0.3 },
      { nodeId: 'glitch-1', param: 'mix', value: 0.4 },
      { nodeId: 'freqshift-1', param: 'shiftHz', value: 8 },
      { nodeId: 'freqshift-1', param: 'mix', value: 0.15 },
    ],
  },
  glitchHeavy: {
    name: 'Heavy Glitch',
    params: [
      { nodeId: 'glitch-1', param: 'active', value: true },
      { nodeId: 'glitch-1', param: 'rate', value: 20 },
      { nodeId: 'glitch-1', param: 'size', value: 0.03 },
      { nodeId: 'glitch-1', param: 'probability', value: 0.8 },
      { nodeId: 'glitch-1', param: 'pitchRamp', value: -0.3 },
      { nodeId: 'glitch-1', param: 'mix', value: 0.9 },
      { nodeId: 'crush-1', param: 'bits', value: 6 },
      { nodeId: 'crush-1', param: 'mix', value: 0.3 },
      { nodeId: 'comb-1', param: 'mix', value: 0.4 },
      { nodeId: 'comb-1', param: 'frequency', value: 150 },
    ],
  },
  ethereal: {
    name: 'Ethereal / Otherworldly',
    params: [
      { nodeId: 'formant-1', param: 'shift', value: 3 },
      { nodeId: 'shimmer-1', param: 'mix', value: 0.5 },
      { nodeId: 'shimmer-1', param: 'shimmer', value: 0.8 },
      { nodeId: 'shimmer-1', param: 'decay', value: 8 },
      { nodeId: 'delay-1', param: 'mix', value: 0.3 },
      { nodeId: 'delay-1', param: 'feedback', value: 0.6 },
      { nodeId: 'freqshift-1', param: 'shiftHz', value: 5 },
      { nodeId: 'freqshift-1', param: 'mix', value: 0.2 },
    ],
  },
  robotic: {
    name: 'Robot Voice',
    params: [
      { nodeId: 'comb-1', param: 'mix', value: 0.6 },
      { nodeId: 'comb-1', param: 'frequency', value: 120 },
      { nodeId: 'comb-1', param: 'feedback', value: 0.9 },
      { nodeId: 'crush-1', param: 'bits', value: 8 },
      { nodeId: 'crush-1', param: 'sampleRateReduction', value: 3 },
      { nodeId: 'crush-1', param: 'mix', value: 0.4 },
      { nodeId: 'freqshift-1', param: 'shiftHz', value: 30 },
      { nodeId: 'freqshift-1', param: 'mix', value: 0.25 },
    ],
  },
};

// Apply a preset with smooth transitions
function applyPreset(presetName: string) {
  const preset = PRESETS[presetName];
  if (!preset) return;
  engine.setParams(preset.params);
}

// Crossfade between presets over time
function crossfadePresets(from: string, to: string, durationMs: number) {
  const startTime = performance.now();
  const fromParams = PRESETS[from]?.params ?? [];
  const toParams = PRESETS[to]?.params ?? [];

  // Build a map of target values
  const targets = new Map<string, { from: number; to: number }>();
  for (const p of toParams) {
    if (typeof p.value !== 'number') continue;
    const key = `${p.nodeId}:${p.param}`;
    const currentValue = engine.getParam(p.nodeId, p.param) as number ?? 0;
    targets.set(key, { from: currentValue, to: p.value });
  }

  function tick() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(1, elapsed / durationMs);
    // Ease in-out
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    for (const [key, { from, to }] of targets) {
      const [nodeId, param] = key.split(':');
      const value = from + (to - from) * eased;
      engine.setParam(nodeId, param, value);
    }

    if (t < 1) requestAnimationFrame(tick);
  }
  tick();

  // Apply non-numeric params (booleans, strings) at the halfway point
  setTimeout(() => {
    for (const p of toParams) {
      if (typeof p.value !== 'number') {
        engine.setParam(p.nodeId, p.param, p.value);
      }
    }
  }, durationMs / 2);
}

// Example: smooth 3-second transition from clean to ethereal
crossfadePresets('clean', 'ethereal', 3000);
```

---

## Performance Notes

- **Latency:** The entire chain adds roughly 5-15ms of latency depending on which modules are active. The AudioWorklet nodes (pitch shifter, glitch, vocoder, freq shifter) each add one audio buffer frame (~2.9ms at 128 samples/44.1kHz). This is imperceptible for a speaking avatar.

- **CPU:** On an M-series Mac, the full chain above uses <5% of one audio thread. The vocoder is the most expensive module (per-sample filter bank). If CPU is tight, reduce vocoder bands from 16 to 8.

- **Worklet files:** Must be served from same origin. No CDN with different domain unless you set up CORS. Simplest: put them in your `public/worklets/` directory.

- **AudioContext resume:** Browsers require a user gesture before audio can play. Make sure `engine.init()` is called from a click handler or after the user has interacted with the page.

- **Output protection:** Always keep the output compressor in the chain with a ceiling around -3dB. Stacking effects (especially comb filter + feedback delay + shimmer reverb) can create runaway gain. The compressor/limiter at the end prevents speaker damage and clipping.

---

## Testing Without ElevenLabs

During development, use the AudioInput node's microphone mode to test with your own voice:

```typescript
const input = engine.getNodeTyped<SynthAudioInputNode>('input-1');
await input.startMicrophone();

// Now speak into your mic — you'll hear yourself processed through the chain
// WARNING: Use headphones to avoid feedback loops
```

Or load a voice sample:

```typescript
const response = await fetch('/test-voice.wav');
const arrayBuffer = await response.arrayBuffer();
const audioBuffer = await sharedContext.decodeAudioData(arrayBuffer);

const source = sharedContext.createBufferSource();
source.buffer = audioBuffer;
source.loop = true;

const input = engine.getNodeTyped<SynthAudioInputNode>('input-1');
input.connectAudioNode(source);
source.start();
```

---

## Questions / Decisions Needed

1. **How does ElevenLabs expose its audio output?** We need to know if it's a MediaStream, an AudioNode, or an HTMLAudioElement to wire up correctly. Check their SDK docs for `audioContext` or `getOutputStream()` options.

2. **Presentation control interface:** How should the presenter trigger scene changes during the keynote? Options: keyboard shortcuts, MIDI controller, tablet companion app sending WebSocket messages, or a timeline that auto-advances. The engine's `setParam()` and `setParams()` calls are instant — we just need to decide what triggers them.

3. **Visual editor during rehearsal?** The ChronoFlow editor UI is a React component. We could mount it as a floating panel in the avatar app for tweaking the chain during rehearsals, then hide it for the actual performance. Let me know if that's useful and I'll wire up the `<ChronoFlowEditor engine={engine} />` wrapper.

---

## File Locations

```
chronoflow/
  src/
    engine/
      ChronoFlowEngine.ts    ← The headless engine class
      index.ts                ← Public API exports
      USAGE.md                ← API reference with code examples
    audio/nodes/              ← All audio processing modules
    patch/types.ts            ← Patch JSON schema
  public/
    worklets/                 ← AudioWorklet processor files (must be copied to your project)
  docs/
    VOICE-PROCESSING-MEMO.md  ← This document
```
