# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mosh is a web-based modular synthesizer with hierarchical abstraction. Key differentiators:
- **Hierarchical patches** — any group of nodes becomes a reusable module you can dive into
- **Semantic zoom** — zoom out to see structure, zoom in to see detail
- **Patch-as-code** — patches are structured JSON, enabling diffing, versioning, and future AI features

## Development Philosophy

- **Working software at every step** — each milestone produces something usable, not just foundations
- **Vertical slices over horizontal layers** — build complete features end-to-end (e.g., one oscillator through one filter to output with UI working), then expand

## Technical Stack

- **Audio:** Web Audio API + AudioWorklet for custom DSP (no WASM initially)
- **UI:** React Flow for graph editor (or custom Canvas/WebGL if more control needed)
- **State:** Patch JSON is source of truth; UI derives from it
- **MIDI:** Web MIDI API (start mono, add polyphony later)
- **Storage:** localStorage for MVP

## Build & Development Commands

*(To be added once project is initialized)*

## Architecture

### Patch Format

Patches are JSON with this structure:
- `version`: Schema version
- `meta`: name, created, modified timestamps
- `nodes[]`: id, type, position, params
- `connections[]`: from/to mappings between node outputs/inputs
- `groups[]`: hierarchical grouping with exposed parameters

### Core Module Types (MVP)

- Oscillator (sine/saw/square, frequency, detune)
- Filter (lowpass/highpass/bandpass, cutoff, resonance)
- VCA (amplitude control)
- LFO (rate, depth, routes to parameters)
- ADSR envelope
- Mixer
- Delay, Reverb
- MIDI input/CC nodes
- Output node

## Milestone Roadmap

1. Sound through browser (oscillator + output)
2. Minimal signal chain (oscillator → filter → output)
3. Graph editor UI (canvas, add/remove/connect nodes)
4. Patch persistence (save/load JSON)
5. Hierarchical grouping (select → group → collapse into module)
6. Focus mode + introspection (trace signal paths)
7. MIDI input (Web MIDI API, MIDI learn)
8. Module expansion (ADSR, noise, delay, reverb)
9. Reusable module library (save groups as modules)
10. Polish + performance (undo/redo, keyboard shortcuts, 60fps target)

## Performance Targets

- 60fps UI with 30+ nodes
- Zero clicks/pops on connection changes
- Mobile/touch support for iPad

## Open Technical Questions

1. React Flow vs custom canvas?
2. Single AudioContext with dynamic graph updates vs rebuild on changes?
3. Polyphony approach — mono-only MVP or basic voices?
4. Audio testing strategy?
