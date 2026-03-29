# Mosh: Development Specification

## For Developer Review

---

## What We're Building

ChronoFlow is a web-based modular synthesizer that replaces the cable-spaghetti metaphor with hierarchical abstraction. The core insight: software shouldn't emulate hardware limitations—it should do what only software can do.

The key differentiators:
1. **Hierarchical patches** — any group of nodes becomes a reusable module you can dive into
2. **Semantic zoom** — zoom out to see structure, zoom in to see detail
3. **Patch-as-code** — patches are structured data (JSON), enabling diffing, versioning, and future AI features

We're building toward temporal patching (connections with time/memory) but that's Phase 2. First we prove the hierarchy model works.

---

## Development Philosophy

**Working software at every step.** Each milestone produces something usable, not just a foundation for the next milestone. We should be able to demo progress weekly.

**Vertical slices over horizontal layers.** Don't build "the whole audio engine" then "the whole UI." Build one oscillator that makes sound through one filter to output, with the UI working, then expand.

---

## Milestone Plan

### Milestone 1: Sound Through the Browser (Week 1)

**Goal:** Prove Web Audio works. One oscillator, one output, makes sound.

Deliverables:
- Single oscillator node (sine/saw/square selectable)
- Frequency and amplitude controls
- Output to speakers
- Basic Web Audio context management (start/stop, handle browser autoplay policies)

**Success =** I can open the page and hear a tone I can control.

---

### Milestone 2: Minimal Signal Chain (Week 2)

**Goal:** Two nodes connected. Audio flows between them.

Deliverables:
- Add a filter node (lowpass, cutoff + resonance)
- Visual connection between oscillator → filter → output
- Drag to connect outputs to inputs
- Audio actually routes through the connection

**Success =** I can connect oscillator to filter to output and hear the filter affect the sound.

---

### Milestone 3: The Graph Editor (Weeks 3-4)

**Goal:** Real node graph UI. Multiple nodes, free arrangement, clean connections.

Deliverables:
- Canvas-based node rendering (recommend: React Flow or custom Canvas/WebGL)
- Add/remove nodes from a palette
- Drag nodes to position
- Multiple connections (one output to many inputs OK)
- Delete connections
- Node selection and multi-select

Module set for this milestone:
- 2 oscillator types (basic, with waveform + pitch)
- 1 filter (lowpass/highpass/bandpass, cutoff + resonance)
- 1 VCA (amplitude control)
- 1 LFO (rate + depth, routes to any parameter)
- Output node

**Success = ** I can build a simple subtractive patch: OSC → Filter → VCA → Output, with LFO modulating filter cutoff.

---

### Milestone 4: Patch Persistence (Week 5)

**Goal:** Patches save and load. Introduces patch-as-code under the hood.

Deliverables:
- Define JSON patch format (nodes, connections, parameter values, positions)
- Save patch to localStorage
- Load patch from localStorage
- Export patch as .json file
- Import patch from .json file
- "New patch" that clears state

**Success = ** I can build a patch, close the browser, reopen, and it's still there. I can export it and send it to someone.

---

### Milestone 5: Hierarchical Grouping (Weeks 6-7)

**Goal:** The core differentiator. Select nodes → group → collapse into single node.

Deliverables:
- Multi-select nodes
- "Group" action creates a parent node containing selected nodes
- Collapsed view: group appears as single node with auto-generated inputs/outputs
- Expanded view: double-click to dive inside, see internal nodes
- Breadcrumb navigation (show path: Root > GroupA > GroupB)
- Groups save/load correctly in patch format

**Success = ** I can build a complex filter (filter + envelope + LFO), group it, collapse it, and use it as a single "Filter Module" in my patch. I can dive in to tweak internals.

---

### Milestone 6: Focus Mode + Introspection (Week 8)

**Goal:** Make complex patches navigable. Answer "what's connected to what?"

Deliverables:
- Focus mode: click node, all unrelated nodes fade, only connected paths highlighted
- "Trace signal" mode: click an output, see the full downstream path light up
- Hover on connection to see signal flow direction
- Node info panel: shows all inputs, outputs, current values, what's connected

**Success = ** In a 20-node patch, I can instantly see what's affecting a specific parameter.

---

### Milestone 7: MIDI Input (Week 9)

**Goal:** Play it with a controller.

Deliverables:
- Web MIDI API integration
- MIDI input node (note, velocity, gate outputs)
- MIDI CC node (routes CC to parameter)
- MIDI learn: click parameter, move knob, mapped
- Polyphony: at minimum, last-note priority mono. Stretch: basic 4-voice poly.

**Success = ** I can plug in a MIDI keyboard and play the synth.

---

### Milestone 8: Module Expansion (Week 10)

**Goal:** Enough modules to make real sounds.

Add:
- ADSR envelope (proper attack/decay/sustain/release)
- Second oscillator type (wavetable or FM)
- Noise generator
- Mixer (combine multiple signals)
- Delay effect (simple, time + feedback)
- Basic reverb (convolution or algorithmic)

**Success = ** I can build patches that sound like actual instruments/textures, not just test tones.

---

### Milestone 9: Reusable Module Library (Week 11)

**Goal:** Save groups as reusable modules. Start building a library.

Deliverables:
- "Save as module" action on any group
- Module library panel (shows saved modules)
- Drag module from library into patch (instantiates a copy)
- Modules store in localStorage / exportable as .json
- Ship with 3-5 starter modules (basic subtractive voice, simple FM voice, filter + envelope combo)

**Success = ** I build a custom "my filter" module once, save it, use it in every future patch.

---

### Milestone 10: Polish + Performance (Week 12)

**Goal:** Make it feel good to use.

Deliverables:
- Keyboard shortcuts (delete, group, save, undo)
- Undo/redo (patch state history)
- Zoom and pan on canvas
- Performance audit: target 60fps UI with 30+ nodes
- Audio glitch audit: eliminate clicks/pops on connection changes
- Mobile/touch: basic touch support for iPad use

**Success = ** It feels like a real tool, not a prototype.

---

## Post-MVP: Phase 1.5 (Weeks 13-16)

Once MVP is solid and we have real user patches to learn from:

**Temporal features (limited):**
- Delayed connections: signal arrives N beats later (badge shows "+2 bars")
- Clock/transport node (BPM, beat position)
- Signal history buffer module (tap past values)

**Patch management:**
- Diff view: see what changed between two patch versions
- "Show spec" toggle to view raw JSON
- Basic patch versioning (save snapshots)

---

## Phase 2 (Future)

- Full temporal routing (topology sequencing, probabilistic connections)
- AI-assisted patching ("make it darker")
- Collaborative editing (real-time shared patches)
- Module marketplace (share/discover modules)
- Advanced introspection ("explain this patch")

---

## Technical Decisions

**Audio:** Web Audio API + AudioWorklet for custom DSP. No WASM initially—validate the UX first.

**UI:** Recommend React Flow for graph editor (proven, performant, handles edge cases). Alternative: custom Canvas/WebGL if we need more control.

**State:** Patch JSON is source of truth. UI derives from it. This enables undo/redo, save/load, and future features.

**MIDI:** Web MIDI API. Polyphony is hard—start mono, add voices later.

**Storage:** localStorage for MVP. Cloud sync is Phase 2+.

---

## Patch Format (Draft)

```json
{
  "version": "1.0",
  "meta": {
    "name": "My Patch",
    "created": "2025-01-19T...",
    "modified": "2025-01-19T..."
  },
  "nodes": [
    {
      "id": "osc1",
      "type": "oscillator",
      "position": { "x": 100, "y": 100 },
      "params": {
        "waveform": "saw",
        "frequency": 440,
        "detune": 0
      }
    },
    {
      "id": "flt1",
      "type": "filter",
      "position": { "x": 300, "y": 100 },
      "params": {
        "mode": "lowpass",
        "cutoff": 2000,
        "resonance": 0.5
      }
    },
    {
      "id": "out",
      "type": "output",
      "position": { "x": 500, "y": 100 },
      "params": {
        "gain": 0.7
      }
    }
  ],
  "connections": [
    { "from": "osc1.audio", "to": "flt1.input" },
    { "from": "flt1.output", "to": "out.input" }
  ],
  "groups": [
    {
      "id": "grp1",
      "name": "My Filter Module",
      "nodes": ["flt1", "env1", "lfo1"],
      "collapsed": true,
      "position": { "x": 300, "y": 100 },
      "exposedParams": ["cutoff", "resonance"]
    }
  ]
}
```

Format will evolve. Key principle: human-readable, diffable, extensible.

---

## Questions for Developer

1. **React Flow vs custom canvas?** React Flow is faster to start but may limit us later. Your recommendation?

2. **Audio architecture:** Single AudioContext with dynamic graph updates, or rebuild graph on changes? Former is harder but avoids audio glitches.

3. **Polyphony approach:** Voice allocation is complex. Should we punt to Phase 2 and ship mono-only?

4. **Testing strategy:** How do we test audio output? Visual snapshot tests for UI?

5. **Timeline confidence:** 12 weeks aggressive, realistic, or conservative? Where do you see risk?

---

## Summary

**MVP = Hierarchical modular synth with patch-as-code, MIDI input, focus mode introspection.**

10 milestones, each producing working software. Weekly demos. Ship fast, learn from real usage, then add temporal features.

The goal isn't to build a better VCV Rack. It's to build something that could only exist as software—a system for reasoning about sound structures.

Let's talk.
