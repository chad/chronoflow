# Mosh

A web-based modular synthesizer built entirely with the Web Audio API. Create generative music by connecting oscillators, filters, sequencers, and effects in a visual node-based interface.

## Features

- **Visual Patching** - Connect modules by dragging cables between nodes
- **30+ Modules** - Oscillators, filters, effects, sequencers, and generative tools
- **Polyphonic** - 8-voice polyphony with voice stealing
- **MIDI Support** - Connect hardware controllers via Web MIDI API
- **Generative Tools** - Euclidean rhythms, Turing machines, probability gates
- **Save/Load** - Export patches as JSON, load from file or built-in presets
- **Undo/Redo** - Full history with Cmd+Z / Cmd+Shift+Z

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

Open http://localhost:5173 in your browser. Click anywhere to enable audio (required by browsers).

## Module Reference

### Sound Sources
| Module | Description |
|--------|-------------|
| **Oscillator** | Sine, saw, square, triangle waveforms |
| **Noise** | White noise generator |
| **Karplus-Strong** | Physical modeling plucked string synthesis |
| **Granular** | Granular synthesis with freeze, spray, density controls |

### Modulators
| Module | Description |
|--------|-------------|
| **LFO** | Low-frequency oscillator for modulation |
| **ADSR** | Attack-decay-sustain-release envelope |
| **Envelope Follower** | Extract amplitude envelope from audio |
| **Smooth Random** | Smoothly interpolated random CV |

### Sequencing & Rhythm
| Module | Description |
|--------|-------------|
| **Sequencer** | Tracker-style step sequencer with probability |
| **Clock** | Master tempo clock with swing |
| **Clock Divider** | Divide clock by 1, 2, 4, 8 |
| **Euclidean** | Euclidean rhythm generator (Bjorklund's algorithm) |
| **Turing Machine** | Shift register for evolving/lockable sequences |

### Logic & CV
| Module | Description |
|--------|-------------|
| **Logic** | AND, OR, XOR, NAND, NOR, NOT gates |
| **Probability Gate** | Random trigger gating |
| **Quantizer** | Snap CV to musical scales |
| **Sample & Hold** | Sample input on trigger |
| **Slew Limiter** | CV smoothing with rise/fall times |
| **Attenuverter** | Scale and invert CV signals |
| **Macro** | One knob controls multiple parameters |

### Audio Processing
| Module | Description |
|--------|-------------|
| **Filter** | Lowpass, highpass, bandpass with resonance |
| **VCA** | Voltage-controlled amplifier |
| **Wavefolder** | West coast-style harmonic distortion |
| **Ring Mod** | Ring modulation |
| **Mixer** | 4-channel mixer with master volume |
| **Delay** | Delay with feedback |
| **Reverb** | Convolution reverb |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React UI                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ NodePalette │  │ GraphCanvas │  │ PatchManager        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                     ┌──────┴──────┐
                     │ patchStore  │  (Zustand + zundo)
                     │   (JSON)    │
                     └──────┬──────┘
                            │
                     ┌──────┴──────┐
                     │ patchSyncer │
                     └──────┬──────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      AudioGraph                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ SynthNodes  │  │VoiceAllocator│ │ Connections        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                     ┌──────┴──────┐
                     │ Web Audio   │
                     │    API      │
                     └─────────────┘
```

**Patch JSON** is the source of truth. The UI reads from it, and changes flow through Zustand to the audio engine.

## Technology Stack

- **Audio**: Web Audio API (100% browser-native, no plugins)
- **UI**: React + React Flow
- **State**: Zustand with zundo (undo/redo middleware)
- **Build**: Vite + TypeScript
- **Tests**: Vitest

### Web Audio API Usage

The synth uses these Web Audio nodes:
- `OscillatorNode` - waveform generation
- `BiquadFilterNode` - filters
- `GainNode` - VCAs and mixing
- `DelayNode` - delay effects
- `ConvolverNode` - reverb
- `WaveShaperNode` - distortion, envelope following
- `AnalyserNode` - trigger detection, metering
- `ConstantSourceNode` - DC/CV signals
- `AudioWorklet` - custom DSP (granular synthesis)

## Patch Format

Patches are JSON files with this structure:

```json
{
  "version": "1.0",
  "meta": {
    "name": "My Patch",
    "created": "2024-01-01T00:00:00.000Z",
    "modified": "2024-01-01T00:00:00.000Z"
  },
  "nodes": [
    {
      "id": "osc1",
      "type": "oscillator",
      "position": { "x": 100, "y": 100 },
      "params": { "frequency": 440, "waveform": "sawtooth" }
    }
  ],
  "connections": [
    {
      "id": "c1",
      "from": { "nodeId": "osc1", "port": "output" },
      "to": { "nodeId": "filter1", "port": "input" }
    }
  ],
  "groups": []
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+K` | Command palette |
| `A-K` keys | Play notes (when focused) |
| `Delete` | Remove selected node |

## Sample Patches

Load these from the Sample Patches dropdown to explore different techniques:

- **Evolving Melody** - Turing Machine + Slew Limiter + Euclidean rhythm
- **Polyrhythmic Triggers** - 3x Euclidean + Logic XOR + Probability Gate
- **Macro Drone** - Macro Controller + Envelope Follower
- **Ethereal Drift** - Granular + Karplus-Strong + Smooth Random
- **Midnight Machine** - Generative groove with S&H melodies

## Development

```bash
# Run dev server with hot reload
npm run dev

# Type check
npm run build

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Lint
npm run lint
```

## Project Structure

```
src/
├── audio/
│   ├── AudioGraph.ts      # Main audio routing
│   ├── AudioEngine.ts     # AudioContext management
│   ├── VoiceAllocator.ts  # Polyphonic voice handling
│   └── nodes/             # All synth node implementations
├── patch/
│   ├── patchStore.ts      # Zustand state store
│   ├── patchSyncer.ts     # Syncs state to audio
│   ├── types.ts           # Patch JSON types
│   └── samplePatches.ts   # Built-in demo patches
├── ui/
│   ├── graph/             # Node graph components
│   ├── controls/          # Knobs, sliders, etc.
│   └── panels/            # Sidebar panels
└── midi/
    └── MidiRouter.ts      # Web MIDI integration
```

## License

MIT
