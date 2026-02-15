const it = {
  frequency: 440,
  detune: 0,
  waveform: "sawtooth"
};
class y {
  id;
  type = "oscillator";
  oscillator = null;
  gainNode;
  context;
  params;
  isPlaying = !1;
  // Persistent modulation inputs (always available for connections)
  freqModGain;
  detuneModGain;
  // Pitch bend offset (in cents, applied on top of detune)
  pitchBendCents = 0;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...it, ...i }, this.gainNode = t.createGain(), this.gainNode.gain.value = 1, this.freqModGain = t.createGain(), this.freqModGain.gain.value = 1, this.detuneModGain = t.createGain(), this.detuneModGain.gain.value = 1;
  }
  createOscillator() {
    this.oscillator && (this.oscillator.stop(), this.oscillator.disconnect()), this.oscillator = this.context.createOscillator(), this.oscillator.type = this.params.waveform, this.oscillator.frequency.value = this.params.frequency, this.oscillator.detune.value = this.params.detune, this.oscillator.connect(this.gainNode), this.freqModGain.connect(this.oscillator.frequency), this.detuneModGain.connect(this.oscillator.detune);
  }
  start() {
    this.isPlaying || (this.createOscillator(), this.oscillator.start(), this.isPlaying = !0);
  }
  stop() {
    !this.isPlaying || !this.oscillator || (this.oscillator.stop(), this.oscillator.disconnect(), this.oscillator = null, this.isPlaying = !1);
  }
  getOutputNode() {
    return this.gainNode;
  }
  getInputNode() {
    return null;
  }
  getFrequencyParam() {
    return this.oscillator?.frequency ?? null;
  }
  getDetuneParam() {
    return this.oscillator?.detune ?? null;
  }
  getModulationTarget(t) {
    switch (t) {
      case "freq_mod":
        return this.oscillator?.frequency ?? null;
      case "detune_mod":
        return this.oscillator?.detune ?? null;
      default:
        return null;
    }
  }
  // Get the modulation input node for audio-rate modulation
  // This allows connections even before the oscillator starts
  getModulationInputNode(t) {
    switch (t) {
      case "freq_mod":
        return this.freqModGain;
      case "detune_mod":
        return this.detuneModGain;
      default:
        return null;
    }
  }
  // Set pitch bend in cents (applied on top of user detune)
  setPitchBendCents(t) {
    if (this.pitchBendCents = t, this.oscillator) {
      const e = this.params.detune + this.pitchBendCents;
      this.oscillator.detune.setTargetAtTime(e, this.context.currentTime, 5e-3);
    }
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.gainNode.connect(e);
    } else
      this.gainNode.connect(t);
  }
  disconnect() {
    this.gainNode.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "frequency":
        this.params.frequency = e, this.oscillator && this.oscillator.frequency.setTargetAtTime(e, this.context.currentTime, 0.01);
        break;
      case "detune":
        if (this.params.detune = e, this.oscillator) {
          const i = e + this.pitchBendCents;
          this.oscillator.detune.setTargetAtTime(i, this.context.currentTime, 0.01);
        }
        break;
      case "waveform":
        this.params.waveform = e, this.oscillator && (this.oscillator.type = e);
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.stop(), this.gainNode.disconnect(), this.freqModGain.disconnect(), this.detuneModGain.disconnect();
  }
}
const st = {
  mode: "lowpass",
  cutoff: 2e3,
  resonance: 1
};
class at {
  id;
  type = "filter";
  filter;
  context;
  params;
  // Performance controller offsets (added on top of user cutoff)
  modWheelOffset = 0;
  aftertouchOffset = 0;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...st, ...i }, this.filter = t.createBiquadFilter(), this.filter.type = this.params.mode, this.filter.frequency.value = this.params.cutoff, this.filter.Q.value = this.params.resonance;
  }
  getOutputNode() {
    return this.filter;
  }
  getInputNode() {
    return this.filter;
  }
  getCutoffParam() {
    return this.filter.frequency;
  }
  getResonanceParam() {
    return this.filter.Q;
  }
  getModulationTarget(t) {
    switch (t) {
      case "cutoff_mod":
        return this.filter.frequency;
      case "resonance_mod":
        return this.filter.Q;
      default:
        return null;
    }
  }
  // Set mod wheel offset (Hz, added to cutoff)
  setModWheelOffset(t) {
    this.modWheelOffset = t, this.applyEffectiveCutoff();
  }
  // Set aftertouch offset (Hz, added to cutoff)
  setAftertouchOffset(t) {
    this.aftertouchOffset = t, this.applyEffectiveCutoff();
  }
  applyEffectiveCutoff() {
    const t = Math.max(20, Math.min(
      2e4,
      this.params.cutoff + this.modWheelOffset + this.aftertouchOffset
    ));
    this.filter.frequency.setTargetAtTime(t, this.context.currentTime, 0.01);
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.filter.connect(e);
    } else
      this.filter.connect(t);
  }
  disconnect() {
    this.filter.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "mode":
        this.params.mode = e, this.filter.type = e;
        break;
      case "cutoff":
        this.params.cutoff = e, this.applyEffectiveCutoff();
        break;
      case "resonance":
        this.params.resonance = e, this.filter.Q.setTargetAtTime(e, this.context.currentTime, 0.01);
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.filter.disconnect();
  }
}
const nt = {
  gain: 0.5
};
class rt {
  id;
  type = "vca";
  gainNode;
  context;
  params;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...nt, ...i }, this.gainNode = t.createGain(), this.gainNode.gain.value = this.params.gain;
  }
  getOutputNode() {
    return this.gainNode;
  }
  getInputNode() {
    return this.gainNode;
  }
  getGainParam() {
    return this.gainNode.gain;
  }
  getModulationTarget(t) {
    return t === "gain_mod" ? this.gainNode.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.gainNode.connect(e);
    } else
      this.gainNode.connect(t);
  }
  disconnect() {
    this.gainNode.disconnect();
  }
  setParam(t, e) {
    t === "gain" && (this.params.gain = e, this.gainNode.gain.setTargetAtTime(e, this.context.currentTime, 0.01));
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.gainNode.disconnect();
  }
}
const ot = {
  rate: 1,
  depth: 100,
  waveform: "sine"
};
class N {
  id;
  type = "lfo";
  oscillator = null;
  depthGain;
  context;
  params;
  isRunning = !1;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...ot, ...i }, this.depthGain = t.createGain(), this.depthGain.gain.value = this.params.depth;
  }
  createOscillator() {
    this.oscillator && (this.oscillator.stop(), this.oscillator.disconnect()), this.oscillator = this.context.createOscillator(), this.oscillator.type = this.params.waveform, this.oscillator.frequency.value = this.params.rate, this.oscillator.connect(this.depthGain);
  }
  start() {
    this.isRunning || (this.createOscillator(), this.oscillator.start(), this.isRunning = !0);
  }
  stop() {
    !this.isRunning || !this.oscillator || (this.oscillator.stop(), this.oscillator.disconnect(), this.oscillator = null, this.isRunning = !1);
  }
  getOutputNode() {
    return this.depthGain;
  }
  getInputNode() {
    return null;
  }
  getModulationTarget(t) {
    return null;
  }
  // Connect LFO to an AudioParam for modulation
  connectToParam(t) {
    this.depthGain.connect(t);
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.depthGain.connect(e);
    } else
      this.depthGain.connect(t);
  }
  disconnect() {
    this.depthGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "rate":
        this.params.rate = e, this.oscillator && this.oscillator.frequency.setTargetAtTime(e, this.context.currentTime, 0.01);
        break;
      case "depth":
        this.params.depth = e, this.depthGain.gain.setTargetAtTime(e, this.context.currentTime, 0.01);
        break;
      case "waveform":
        this.params.waveform = e, this.oscillator && (this.oscillator.type = e);
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.stop(), this.depthGain.disconnect();
  }
}
const ht = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3
};
class k {
  id;
  type = "adsr";
  constantSource;
  gainNode;
  context;
  params;
  isActive = !1;
  releaseStartValue = 0;
  // For trigger detection (external clock/gate input)
  triggerInput;
  triggerAnalyser;
  triggerData;
  lastTriggerValue = 0;
  triggerCheckInterval = null;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...ht, ...i }, this.constantSource = t.createConstantSource(), this.constantSource.offset.value = 1, this.gainNode = t.createGain(), this.gainNode.gain.value = 0, this.constantSource.connect(this.gainNode), this.constantSource.start(), this.triggerInput = t.createGain(), this.triggerInput.gain.value = 1, this.triggerAnalyser = t.createAnalyser(), this.triggerAnalyser.fftSize = 256, this.triggerData = new Float32Array(this.triggerAnalyser.fftSize), this.triggerInput.connect(this.triggerAnalyser);
  }
  startTriggerDetection() {
    this.triggerCheckInterval === null && (this.triggerCheckInterval = window.setInterval(() => {
      this.checkTrigger();
    }, 10));
  }
  stopTriggerDetection() {
    this.triggerCheckInterval !== null && (clearInterval(this.triggerCheckInterval), this.triggerCheckInterval = null);
  }
  checkTrigger() {
    this.triggerAnalyser.getFloatTimeDomainData(this.triggerData);
    let t = 0;
    for (let i = 0; i < this.triggerData.length; i++) {
      const s = this.triggerData[i];
      s > t && (t = s);
    }
    const e = 0.5;
    t > e && this.lastTriggerValue <= e ? this.trigger(1) : t <= e && this.lastTriggerValue > e && this.release(), this.lastTriggerValue = t;
  }
  // Get trigger input node for external connections
  getTriggerInput() {
    return this.startTriggerDetection(), this.triggerInput;
  }
  trigger(t = 1) {
    const e = this.context.currentTime, { attack: i, decay: s, sustain: a } = this.params;
    this.gainNode.gain.cancelScheduledValues(e), this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, e), this.gainNode.gain.linearRampToValueAtTime(t, e + i), this.gainNode.gain.linearRampToValueAtTime(a * t, e + i + s), this.isActive = !0;
  }
  release() {
    if (!this.isActive) return;
    const t = this.context.currentTime, { release: e } = this.params;
    this.gainNode.gain.cancelScheduledValues(t), this.releaseStartValue = this.gainNode.gain.value, this.gainNode.gain.setValueAtTime(this.releaseStartValue, t), this.gainNode.gain.linearRampToValueAtTime(0, t + e), this.isActive = !1;
  }
  // Force immediate stop (for voice stealing)
  forceStop() {
    const t = this.context.currentTime;
    this.gainNode.gain.cancelScheduledValues(t), this.gainNode.gain.setValueAtTime(0, t), this.isActive = !1;
  }
  getOutputNode() {
    return this.gainNode;
  }
  getInputNode() {
    return null;
  }
  getModulationTarget(t) {
    return null;
  }
  // Connect envelope output to a parameter (like VCA gain)
  connectToParam(t) {
    this.gainNode.connect(t);
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.gainNode.connect(e);
    } else
      this.gainNode.connect(t);
  }
  disconnect() {
    this.gainNode.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "attack":
        this.params.attack = Math.max(1e-3, e);
        break;
      case "decay":
        this.params.decay = Math.max(1e-3, e);
        break;
      case "sustain":
        this.params.sustain = Math.max(0, Math.min(1, e));
        break;
      case "release":
        this.params.release = Math.max(1e-3, e);
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  isEnvelopeActive() {
    return this.isActive;
  }
  dispose() {
    this.stopTriggerDetection(), this.forceStop(), this.constantSource.stop(), this.constantSource.disconnect(), this.gainNode.disconnect(), this.triggerInput.disconnect(), this.triggerAnalyser.disconnect();
  }
}
const ct = {
  time: 0.3,
  feedback: 0.4,
  mix: 0.5
};
class F {
  id;
  type = "delay";
  inputGain;
  dryGain;
  wetGain;
  delayNode;
  feedbackGain;
  outputGain;
  context;
  params;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...ct, ...i }, this.inputGain = t.createGain(), this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.delayNode = t.createDelay(5), this.feedbackGain = t.createGain(), this.outputGain = t.createGain(), this.delayNode.delayTime.value = this.params.time, this.feedbackGain.gain.value = this.params.feedback, this.updateMix(), this.inputGain.connect(this.dryGain), this.inputGain.connect(this.delayNode), this.dryGain.connect(this.outputGain), this.delayNode.connect(this.wetGain), this.delayNode.connect(this.feedbackGain), this.feedbackGain.connect(this.delayNode), this.wetGain.connect(this.outputGain);
  }
  updateMix() {
    this.dryGain.gain.value = 1 - this.params.mix, this.wetGain.gain.value = this.params.mix, this.params.mix < 0.01 ? this.feedbackGain.gain.setTargetAtTime(0, this.context.currentTime, 0.01) : this.feedbackGain.gain.setTargetAtTime(this.params.feedback, this.context.currentTime, 0.01);
  }
  // Clear the delay buffer by temporarily killing feedback
  clear() {
    this.feedbackGain.gain.setTargetAtTime(0, this.context.currentTime, 1e-3), this.wetGain.gain.setTargetAtTime(0, this.context.currentTime, 1e-3), setTimeout(() => {
      this.params.mix >= 0.01 && (this.feedbackGain.gain.setTargetAtTime(this.params.feedback, this.context.currentTime, 0.01), this.wetGain.gain.setTargetAtTime(this.params.mix, this.context.currentTime, 0.01));
    }, this.params.time * 1e3 * 3);
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    switch (t) {
      case "time_mod":
        return this.delayNode.delayTime;
      case "feedback_mod":
        return this.feedbackGain.gain;
      default:
        return null;
    }
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "time":
        this.params.time = e, this.delayNode.delayTime.setTargetAtTime(e, this.context.currentTime, 0.01);
        break;
      case "feedback":
        this.params.feedback = Math.min(0.95, e), this.feedbackGain.gain.setTargetAtTime(this.params.feedback, this.context.currentTime, 0.01);
        break;
      case "mix":
        this.params.mix = e, this.updateMix();
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.inputGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect(), this.delayNode.disconnect(), this.feedbackGain.disconnect(), this.outputGain.disconnect();
  }
}
const ut = {
  decay: 2,
  mix: 0.3
};
class O {
  id;
  type = "reverb";
  inputGain;
  dryGain;
  wetGain;
  convolver;
  outputGain;
  context;
  params;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...ut, ...i }, this.inputGain = t.createGain(), this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.convolver = t.createConvolver(), this.outputGain = t.createGain(), this.generateImpulseResponse(), this.updateMix(), this.inputGain.connect(this.dryGain), this.inputGain.connect(this.convolver), this.dryGain.connect(this.outputGain), this.convolver.connect(this.wetGain), this.wetGain.connect(this.outputGain);
  }
  generateImpulseResponse() {
    const t = this.context.sampleRate, e = t * this.params.decay, i = this.context.createBuffer(2, e, t);
    for (let s = 0; s < 2; s++) {
      const a = i.getChannelData(s);
      for (let n = 0; n < e; n++) {
        const o = Math.pow(1 - n / e, 2);
        a[n] = (Math.random() * 2 - 1) * o;
      }
    }
    this.convolver.buffer = i;
  }
  updateMix() {
    this.dryGain.gain.value = 1 - this.params.mix, this.wetGain.gain.value = this.params.mix;
  }
  // Clear the reverb tail by fading out the wet signal quickly
  clear() {
    this.wetGain.gain.setTargetAtTime(0, this.context.currentTime, 0.05), setTimeout(() => {
      this.params.mix > 0 && this.wetGain.gain.setTargetAtTime(this.params.mix, this.context.currentTime, 0.01);
    }, 200);
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "decay":
        this.params.decay = e, this.generateImpulseResponse();
        break;
      case "mix":
        this.params.mix = e, this.updateMix();
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.inputGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect(), this.convolver.disconnect(), this.outputGain.disconnect();
  }
}
const lt = {
  level1: 1,
  level2: 1,
  level3: 1,
  level4: 1,
  master: 1
};
class V {
  id;
  type = "mixer";
  inputGains;
  masterGain;
  context;
  params;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...lt, ...i }, this.inputGains = [];
    for (let s = 0; s < 4; s++) {
      const a = t.createGain();
      a.gain.value = this.params[`level${s + 1}`], this.inputGains.push(a);
    }
    this.masterGain = t.createGain(), this.masterGain.gain.value = this.params.master, this.inputGains.forEach((s) => s.connect(this.masterGain));
  }
  getOutputNode() {
    return this.masterGain;
  }
  getInputNode() {
    return this.inputGains[0];
  }
  // Get specific input channel
  getInputChannel(t) {
    return t >= 1 && t <= 4 ? this.inputGains[t - 1] : null;
  }
  getModulationTarget(t) {
    switch (t) {
      case "level1_mod":
        return this.inputGains[0].gain;
      case "level2_mod":
        return this.inputGains[1].gain;
      case "level3_mod":
        return this.inputGains[2].gain;
      case "level4_mod":
        return this.inputGains[3].gain;
      case "master_mod":
        return this.masterGain.gain;
      default:
        return null;
    }
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.masterGain.connect(e);
    } else
      this.masterGain.connect(t);
  }
  disconnect() {
    this.masterGain.disconnect();
  }
  setParam(t, e) {
    const i = e;
    switch (t) {
      case "level1":
        this.params.level1 = i, this.inputGains[0].gain.setTargetAtTime(i, this.context.currentTime, 0.01);
        break;
      case "level2":
        this.params.level2 = i, this.inputGains[1].gain.setTargetAtTime(i, this.context.currentTime, 0.01);
        break;
      case "level3":
        this.params.level3 = i, this.inputGains[2].gain.setTargetAtTime(i, this.context.currentTime, 0.01);
        break;
      case "level4":
        this.params.level4 = i, this.inputGains[3].gain.setTargetAtTime(i, this.context.currentTime, 0.01);
        break;
      case "master":
        this.params.master = i, this.masterGain.gain.setTargetAtTime(i, this.context.currentTime, 0.01);
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.inputGains.forEach((t) => t.disconnect()), this.masterGain.disconnect();
  }
}
const pt = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
  a: 9,
  b: 11
}, dt = /^([A-Ga-g])([#b])?-?(-?\d)(?::(\d+))?(?:\?(\d+))?$/, mt = /^(---|\.\.\.|--|\.|-)?(?:\?(\d+))?$/, gt = /* @__PURE__ */ new Set(["---", ".", "-", "...", "--", ""]), g = 100, f = 100;
function ft(r) {
  const t = r.trim(), e = t.match(mt);
  if (e && (e[1] || t === "")) {
    const d = e[2] ? parseInt(e[2], 10) : f;
    return {
      midiNote: null,
      velocity: g,
      probability: Math.max(0, Math.min(100, d)),
      isRest: !0
    };
  }
  const i = t.match(dt);
  if (!i)
    return {
      midiNote: null,
      velocity: g,
      probability: f,
      isRest: !0
    };
  const [, s, a, n, o, h] = i, c = pt[s];
  if (c === void 0)
    return {
      midiNote: null,
      velocity: g,
      probability: f,
      isRest: !0
    };
  let u = c;
  a === "#" ? u += 1 : a === "b" && (u -= 1);
  const m = (parseInt(n, 10) + 1) * 12 + u;
  if (m < 0 || m > 127)
    return {
      midiNote: null,
      velocity: g,
      probability: f,
      isRest: !0
    };
  const p = o ? Math.max(0, Math.min(127, parseInt(o, 10))) : g, l = h ? Math.max(0, Math.min(100, parseInt(h, 10))) : f;
  return {
    midiNote: m,
    velocity: p,
    probability: l,
    isRest: !1
  };
}
function Gt(r) {
  const t = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"], e = Math.floor(r / 12) - 1, i = r % 12;
  return `${t[i]}${e}`;
}
function b(r) {
  const t = [], e = [];
  if (!r || !r.trim())
    return {
      steps: [{
        type: "rest",
        velocity: g,
        probability: f,
        originalToken: ""
      }],
      errors: []
    };
  const i = r.trim().split(/\s+/);
  for (let s = 0; s < i.length; s++) {
    const a = i[s], n = ft(a);
    n.isRest ? (!gt.has(a.split("?")[0]) && a !== "" && e.push(`Invalid token at position ${s + 1}: "${a}"`), t.push({
      type: "rest",
      velocity: n.velocity,
      probability: n.probability,
      originalToken: a
    })) : t.push({
      type: "note",
      midiNote: n.midiNote,
      velocity: n.velocity,
      probability: n.probability,
      originalToken: a
    });
  }
  return t.length === 0 && t.push({
    type: "rest",
    velocity: g,
    probability: f,
    originalToken: ""
  }), t.length > 64 && (t.length = 64, e.push("Pattern truncated to 64 steps")), { steps: t, errors: e };
}
function yt(r, t) {
  const e = [];
  for (let i = 1; i <= t; i++) {
    const s = r[`step${i}`];
    if (s !== void 0) {
      const a = 60 + s;
      e.push(Gt(a));
    }
  }
  return e.join(" ") || "C-4";
}
function R(r) {
  if (!r || !r.trim())
    return ["A"];
  const t = r.replace(/\s+/g, "").toUpperCase(), e = /* @__PURE__ */ new Set(["A", "B", "C", "D"]), i = [];
  for (const s of t)
    e.has(s) && i.push(s);
  return i.length > 0 ? i : ["A"];
}
const kt = {
  bpm: 120,
  steps: 8,
  gate: 0.5,
  swing: 50,
  patternA: "C-4 D-4 E-4 F-4 G-4 A-4 B-4 C-5",
  patternB: "",
  patternC: "",
  patternD: "",
  chain: "A",
  running: !0,
  extClock: !1
};
class wt {
  id;
  type = "sequencer";
  context;
  params;
  parsedPatterns = { A: [], B: [], C: [], D: [] };
  chainSequence = ["A"];
  currentStep = 0;
  currentChainIndex = 0;
  stepCount = 0;
  // For odd/even swing calculation
  intervalId = null;
  swingTimeoutId = null;
  noteCallback = null;
  stopCallback = null;
  stepCallbacks = [];
  dummyGain;
  // For satisfying the SynthNode interface
  _isConnected = !1;
  // Track connection state (for modular mode)
  // External clock input
  clockInput;
  clockAnalyser;
  clockDataArray;
  lastClockValue = 0;
  clockCheckInterval = null;
  constructor(t, e, i) {
    this.context = t, this.id = e;
    const s = { ...kt, ...i };
    if (!i?.patternA && i?.step1 !== void 0) {
      const a = i.steps || 8;
      s.patternA = yt(i, a);
    }
    i?.pattern && !i?.patternA && (s.patternA = i.pattern), this.params = s, this.updateParsedPatterns(), this.dummyGain = this.context.createGain(), this.dummyGain.gain.value = 0, this.clockInput = t.createGain(), this.clockAnalyser = t.createAnalyser(), this.clockAnalyser.fftSize = 256, this.clockDataArray = new Float32Array(this.clockAnalyser.fftSize), this.clockInput.connect(this.clockAnalyser), this.params.running && this.start();
  }
  updateParsedPatterns() {
    this.parsedPatterns.A = b(this.params.patternA || "").steps, this.parsedPatterns.B = b(this.params.patternB || "").steps, this.parsedPatterns.C = b(this.params.patternC || "").steps, this.parsedPatterns.D = b(this.params.patternD || "").steps, this.chainSequence = R(this.params.chain), this.updateStepsFromCurrentPattern();
  }
  updateStepsFromCurrentPattern() {
    const t = this.chainSequence[this.currentChainIndex] || "A", e = this.parsedPatterns[t];
    this.params.steps = e.length || 1, this.currentStep >= this.params.steps && (this.currentStep = 0);
  }
  getCurrentPattern() {
    const t = this.chainSequence[this.currentChainIndex] || "A";
    return this.parsedPatterns[t];
  }
  // Set the callback that triggers notes
  setNoteCallback(t) {
    this.noteCallback = t;
  }
  // Set the callback for when sequencer stops (to clear effects)
  setStopCallback(t) {
    this.stopCallback = t;
  }
  // Subscribe to step changes (for UI visualization)
  onStep(t) {
    this.stepCallbacks.push(t);
  }
  tick = () => {
    if (!this.params.running) return;
    const t = this.getCurrentPattern(), e = t[this.currentStep], s = 60 / this.params.bpm * this.params.gate, a = this.getCurrentPatternKey();
    this.stepCallbacks.forEach((o) => o(this.currentStep, this.currentChainIndex, a));
    const n = e ? Math.random() * 100 < e.probability : !1;
    this.noteCallback && e?.type === "note" && e.midiNote !== void 0 && n && this.noteCallback(e.midiNote, e.velocity, s), this.currentStep++, this.stepCount++, this.currentStep >= t.length && (this.currentStep = 0, this.currentChainIndex = (this.currentChainIndex + 1) % this.chainSequence.length, this.updateStepsFromCurrentPattern());
  };
  // Calculate swing delay for current step (returns delay in ms)
  getSwingDelay() {
    if (this.stepCount % 2 === 0)
      return 0;
    const t = (this.params.swing - 50) / 50, i = 60 / this.params.bpm * 1e3 * 0.5;
    return t * i;
  }
  start() {
    if (this.params.extClock)
      this.startClockMonitoring();
    else {
      if (this.intervalId !== null) return;
      this.scheduleNextTick();
    }
  }
  scheduleNextTick() {
    if (!this.params.running || this.params.extClock) return;
    const t = 60 / this.params.bpm * 1e3, e = this.getSwingDelay(), i = t + e;
    this.tick(), this.intervalId = window.setTimeout(() => {
      this.scheduleNextTick();
    }, i);
  }
  stop() {
    this.intervalId !== null && (window.clearTimeout(this.intervalId), this.intervalId = null), this.swingTimeoutId !== null && (window.clearTimeout(this.swingTimeoutId), this.swingTimeoutId = null), this.stopClockMonitoring(), this.currentStep = 0, this.currentChainIndex = 0, this.stepCount = 0, this.updateStepsFromCurrentPattern(), this.stepCallbacks.forEach((t) => t(-1, 0, "A")), this.stopCallback && this.stopCallback();
  }
  startClockMonitoring() {
    this.clockCheckInterval === null && (this.clockCheckInterval = window.setInterval(() => this.checkClockInput(), 2));
  }
  stopClockMonitoring() {
    this.clockCheckInterval !== null && (window.clearInterval(this.clockCheckInterval), this.clockCheckInterval = null);
  }
  checkClockInput() {
    this.clockAnalyser.getFloatTimeDomainData(this.clockDataArray);
    const t = this.clockDataArray[0] || 0;
    t > 0.5 && this.lastClockValue <= 0.5 && this.tick(), this.lastClockValue = t;
  }
  // External trigger method (can be called directly by clock nodes)
  externalTrigger() {
    this.params.running && this.tick();
  }
  // Update the interval timing without triggering a new note
  updateTiming() {
  }
  getOutputNode() {
    return this.dummyGain;
  }
  getInputNode() {
    return this.clockInput;
  }
  getModulationTarget(t) {
    return t === "clock" ? this.clockInput.gain : null;
  }
  connect(t) {
    this._isConnected = !0;
  }
  disconnect() {
    this._isConnected = !1;
  }
  // Called by AudioGraph when a connection is made to this sequencer's output
  setConnected(t) {
    this._isConnected = t;
  }
  // Check if sequencer has outgoing connections (for modular mode)
  getIsConnected() {
    return this._isConnected;
  }
  setParam(t, e) {
    const i = this.params.running, s = this.params.extClock;
    switch (t) {
      case "bpm":
        this.params.bpm = e, this.updateTiming();
        break;
      case "steps":
        this.params.steps = Math.max(1, Math.min(64, e)), this.currentStep >= this.params.steps && (this.currentStep = 0);
        break;
      case "gate":
        this.params.gate = e;
        break;
      case "swing":
        this.params.swing = Math.max(0, Math.min(100, e));
        break;
      case "pattern":
        this.params.patternA = e, this.updateParsedPatterns();
        break;
      case "patternA":
        this.params.patternA = e, this.updateParsedPatterns();
        break;
      case "patternB":
        this.params.patternB = e, this.updateParsedPatterns();
        break;
      case "patternC":
        this.params.patternC = e, this.updateParsedPatterns();
        break;
      case "patternD":
        this.params.patternD = e, this.updateParsedPatterns();
        break;
      case "chain":
        this.params.chain = e, this.chainSequence = R(e), this.currentChainIndex = 0, this.currentStep = 0, this.updateStepsFromCurrentPattern();
        break;
      case "running":
        this.params.running = e, this.params.running && !i ? this.start() : !this.params.running && i && this.stop();
        break;
      case "extClock":
        this.params.extClock = e, this.params.running && (this.params.extClock && !s ? (this.intervalId !== null && (window.clearTimeout(this.intervalId), this.intervalId = null), this.startClockMonitoring()) : !this.params.extClock && s && (this.stopClockMonitoring(), this.scheduleNextTick()));
        break;
      default:
        t.startsWith("step") && !t.startsWith("steps") && (this.params[t] = e);
    }
  }
  getParams() {
    return { ...this.params };
  }
  getCurrentStep() {
    return this.currentStep;
  }
  getCurrentChainIndex() {
    return this.currentChainIndex;
  }
  getCurrentPatternKey() {
    return this.chainSequence[this.currentChainIndex] || "A";
  }
  getChainSequence() {
    return this.chainSequence;
  }
  getParsedSteps() {
    return this.getCurrentPattern();
  }
  getParsedPatterns() {
    return this.parsedPatterns;
  }
  getPatternSteps(t) {
    return this.parsedPatterns[t];
  }
  dispose() {
    this.stop(), this.stepCallbacks = [], this.noteCallback = null, this.dummyGain.disconnect(), this.clockInput.disconnect(), this.clockAnalyser.disconnect();
  }
}
const Tt = {
  amount: 1
};
class vt {
  id;
  type = "attenuverter";
  inputGain;
  outputGain;
  context;
  params;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Tt, ...i }, this.inputGain = t.createGain(), this.outputGain = t.createGain(), this.outputGain.gain.value = this.params.amount, this.inputGain.connect(this.outputGain);
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    t === "amount" && (this.params.amount = e, this.outputGain.gain.setTargetAtTime(e, this.context.currentTime, 0.01));
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.inputGain.disconnect(), this.outputGain.disconnect();
  }
}
const At = {
  type: "white",
  level: 1
};
class Mt {
  id;
  type = "noise";
  context;
  params;
  noiseSource = null;
  outputGain;
  whiteBuffer;
  pinkBuffer;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...At, ...i }, this.outputGain = t.createGain(), this.outputGain.gain.value = this.params.level;
    const s = t.sampleRate * 2;
    this.whiteBuffer = t.createBuffer(1, s, t.sampleRate);
    const a = this.whiteBuffer.getChannelData(0);
    for (let l = 0; l < s; l++)
      a[l] = Math.random() * 2 - 1;
    this.pinkBuffer = t.createBuffer(1, s, t.sampleRate);
    const n = this.pinkBuffer.getChannelData(0);
    let o = 0, h = 0, c = 0, u = 0, G = 0, m = 0, p = 0;
    for (let l = 0; l < s; l++) {
      const d = Math.random() * 2 - 1;
      o = 0.99886 * o + d * 0.0555179, h = 0.99332 * h + d * 0.0750759, c = 0.969 * c + d * 0.153852, u = 0.8665 * u + d * 0.3104856, G = 0.55 * G + d * 0.5329522, m = -0.7616 * m - d * 0.016898, n[l] = (o + h + c + u + G + m + p + d * 0.5362) * 0.11, p = d * 0.115926;
    }
    this.start();
  }
  createNoiseSource() {
    this.noiseSource && (this.noiseSource.stop(), this.noiseSource.disconnect()), this.noiseSource = this.context.createBufferSource(), this.noiseSource.buffer = this.params.type === "white" ? this.whiteBuffer : this.pinkBuffer, this.noiseSource.loop = !0, this.noiseSource.connect(this.outputGain);
  }
  start() {
    this.createNoiseSource(), this.noiseSource?.start();
  }
  stop() {
    this.noiseSource && (this.noiseSource.stop(), this.noiseSource.disconnect(), this.noiseSource = null);
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return null;
  }
  getModulationTarget(t) {
    return t === "level_mod" ? this.outputGain.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "type":
        this.params.type = e, this.stop(), this.start();
        break;
      case "level":
        this.params.level = e, this.outputGain.gain.setTargetAtTime(e, this.context.currentTime, 0.01);
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.stop(), this.outputGain.disconnect();
  }
}
const St = {
  rate: 4,
  smooth: 0
};
class q {
  id;
  type = "samplehold";
  context;
  params;
  inputGain;
  constantSource;
  outputGain;
  analyser;
  clockInterval = null;
  currentValue = 0;
  dataArray;
  // External trigger detection
  triggerInput;
  triggerAnalyser;
  triggerData;
  lastTriggerValue = 0;
  triggerCheckInterval = null;
  useExternalTrigger = !1;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...St, ...i }, this.inputGain = t.createGain(), this.outputGain = t.createGain(), this.analyser = t.createAnalyser(), this.analyser.fftSize = 256, this.dataArray = new Float32Array(this.analyser.fftSize), this.constantSource = t.createConstantSource(), this.constantSource.offset.value = 0, this.constantSource.connect(this.outputGain), this.constantSource.start(), this.inputGain.connect(this.analyser), this.triggerInput = t.createGain(), this.triggerInput.gain.value = 1, this.triggerAnalyser = t.createAnalyser(), this.triggerAnalyser.fftSize = 256, this.triggerData = new Float32Array(this.triggerAnalyser.fftSize), this.triggerInput.connect(this.triggerAnalyser), this.startClock(), this.startTriggerDetection();
  }
  startClock() {
    if (this.clockInterval !== null && window.clearInterval(this.clockInterval), !this.useExternalTrigger) {
      const t = 1 / this.params.rate * 1e3;
      this.clockInterval = window.setInterval(() => this.sample(), t);
    }
  }
  startTriggerDetection() {
    this.triggerCheckInterval = window.setInterval(() => {
      this.checkTrigger();
    }, 8);
  }
  checkTrigger() {
    if (!this.useExternalTrigger) return;
    this.triggerAnalyser.getFloatTimeDomainData(this.triggerData);
    const t = this.triggerData[0] || 0, e = 0.1;
    t > e && this.lastTriggerValue <= e && this.sample(), this.lastTriggerValue = t;
  }
  // Get trigger input node for external connections
  getTriggerInput() {
    return this.triggerInput;
  }
  // Enable external trigger mode (disables internal clock)
  setExternalTrigger(t) {
    this.useExternalTrigger = t, t ? this.clockInterval !== null && (window.clearInterval(this.clockInterval), this.clockInterval = null) : this.startClock();
  }
  sample() {
    this.analyser.getFloatTimeDomainData(this.dataArray);
    const t = this.dataArray[0] || 0;
    if (this.params.smooth > 0) {
      const e = this.params.smooth * 0.5;
      this.constantSource.offset.setTargetAtTime(t, this.context.currentTime, e);
    } else
      this.constantSource.offset.setValueAtTime(t, this.context.currentTime);
    this.currentValue = t;
  }
  // External trigger for sample (can be called by sequencer or clock)
  trigger() {
    this.sample();
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "rate":
        this.params.rate = Math.max(0.1, e), this.startClock();
        break;
      case "smooth":
        this.params.smooth = e;
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  getCurrentValue() {
    return this.currentValue;
  }
  dispose() {
    this.clockInterval !== null && window.clearInterval(this.clockInterval), this.triggerCheckInterval !== null && window.clearInterval(this.triggerCheckInterval), this.constantSource.stop(), this.constantSource.disconnect(), this.inputGain.disconnect(), this.analyser.disconnect(), this.outputGain.disconnect(), this.triggerInput.disconnect(), this.triggerAnalyser.disconnect();
  }
}
const bt = {
  drive: 1,
  folds: 2,
  mix: 1
};
class It {
  id;
  type = "wavefolder";
  context;
  params;
  inputGain;
  driveGain;
  dryGain;
  wetGain;
  waveshaper;
  outputGain;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...bt, ...i }, this.inputGain = t.createGain(), this.driveGain = t.createGain(), this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.waveshaper = t.createWaveShaper(), this.outputGain = t.createGain(), this.driveGain.gain.value = this.params.drive, this.updateMix(), this.updateFoldCurve(), this.inputGain.connect(this.dryGain), this.inputGain.connect(this.driveGain), this.driveGain.connect(this.waveshaper), this.waveshaper.connect(this.wetGain), this.dryGain.connect(this.outputGain), this.wetGain.connect(this.outputGain);
  }
  updateFoldCurve() {
    const e = new Float32Array(8192), i = this.params.folds;
    for (let s = 0; s < 8192; s++) {
      let a = s / 8191 * 2 - 1;
      for (let n = 0; n < i; n++)
        a > 1 ? a = 2 - a : a < -1 && (a = -2 - a);
      a = Math.sin(a * Math.PI * i) / i, e[s] = a;
    }
    this.waveshaper.curve = e;
  }
  updateMix() {
    this.dryGain.gain.value = 1 - this.params.mix, this.wetGain.gain.value = this.params.mix;
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return t === "drive_mod" ? this.driveGain.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "drive":
        this.params.drive = e, this.driveGain.gain.setTargetAtTime(e, this.context.currentTime, 0.01);
        break;
      case "folds":
        this.params.folds = Math.round(e), this.updateFoldCurve();
        break;
      case "mix":
        this.params.mix = e, this.updateMix();
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.inputGain.disconnect(), this.driveGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect(), this.waveshaper.disconnect(), this.outputGain.disconnect();
  }
}
const Nt = {
  carrierFreq: 440,
  carrierType: "sine",
  mix: 1,
  useExternal: !1
};
class Dt {
  id;
  type = "ringmod";
  context;
  params;
  // Signal path
  inputGain;
  // Main signal input
  carrierInput;
  // External carrier input
  internalCarrier;
  carrierGain;
  // Routes either internal or external carrier
  ringModGain;
  // The actual ring mod (signal * carrier)
  dryGain;
  wetGain;
  outputGain;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Nt, ...i }, this.inputGain = t.createGain(), this.carrierInput = t.createGain(), this.carrierGain = t.createGain(), this.ringModGain = t.createGain(), this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.outputGain = t.createGain(), this.internalCarrier = t.createOscillator(), this.internalCarrier.frequency.value = this.params.carrierFreq, this.internalCarrier.type = this.params.carrierType, this.internalCarrier.start(), this.ringModGain.gain.value = 0, this.updateMix(), this.updateCarrierRouting(), this.inputGain.connect(this.ringModGain.gain), this.carrierGain.connect(this.ringModGain), this.ringModGain.connect(this.wetGain), this.inputGain.connect(this.dryGain), this.dryGain.connect(this.outputGain), this.wetGain.connect(this.outputGain);
  }
  updateCarrierRouting() {
    try {
      this.internalCarrier.disconnect(), this.carrierInput.disconnect();
    } catch {
    }
    this.params.useExternal ? this.carrierInput.connect(this.carrierGain) : this.internalCarrier.connect(this.carrierGain);
  }
  updateMix() {
    this.dryGain.gain.value = 1 - this.params.mix, this.wetGain.gain.value = this.params.mix;
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  // Secondary input for external carrier
  getCarrierInputNode() {
    return this.carrierInput;
  }
  getModulationTarget(t) {
    switch (t) {
      case "freq_mod":
        return this.internalCarrier.frequency;
      case "carrier":
        return this.params.useExternal = !0, this.updateCarrierRouting(), this.carrierInput.gain;
      default:
        return null;
    }
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "carrierFreq":
        this.params.carrierFreq = e, this.internalCarrier.frequency.setTargetAtTime(e, this.context.currentTime, 0.01);
        break;
      case "carrierType":
        this.params.carrierType = e, this.internalCarrier.type = this.params.carrierType;
        break;
      case "mix":
        this.params.mix = e, this.updateMix();
        break;
      case "useExternal":
        this.params.useExternal = e, this.updateCarrierRouting();
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.internalCarrier.stop(), this.internalCarrier.disconnect(), this.inputGain.disconnect(), this.carrierInput.disconnect(), this.carrierGain.disconnect(), this.ringModGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect(), this.outputGain.disconnect();
  }
}
const _ = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  wholetone: [0, 2, 4, 6, 8, 10]
}, Ct = {
  scale: "minor",
  root: 0,
  octaves: 2
};
class Pt {
  id;
  type = "quantizer";
  context;
  params;
  inputGain;
  outputGain;
  constantSource;
  analyser;
  dataArray;
  updateInterval = null;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Ct, ...i }, this.inputGain = t.createGain(), this.outputGain = t.createGain(), this.analyser = t.createAnalyser(), this.analyser.fftSize = 256, this.dataArray = new Float32Array(this.analyser.fftSize), this.constantSource = t.createConstantSource(), this.constantSource.offset.value = 0, this.constantSource.connect(this.outputGain), this.constantSource.start(), this.inputGain.connect(this.analyser), this.startQuantizing();
  }
  startQuantizing() {
    this.updateInterval !== null && window.clearInterval(this.updateInterval), this.updateInterval = window.setInterval(() => this.quantize(), 16);
  }
  quantize() {
    this.analyser.getFloatTimeDomainData(this.dataArray);
    const t = this.dataArray[0] || 0, e = this.params.octaves * 12, i = Math.round((t + 1) / 2 * e), s = _[this.params.scale] || _.chromatic, a = this.quantizeToScale(i, s, this.params.root), n = 440, h = n * Math.pow(2, (a - 12) / 12) - n;
    this.constantSource.offset.setValueAtTime(h, this.context.currentTime);
  }
  quantizeToScale(t, e, i) {
    const s = t - i, a = Math.floor(s / 12), n = (s % 12 + 12) % 12;
    let o = e[0], h = Math.abs(n - e[0]);
    for (const c of e) {
      const u = Math.abs(n - c);
      u < h && (h = u, o = c);
    }
    return i + a * 12 + o;
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "scale":
        this.params.scale = e;
        break;
      case "root":
        this.params.root = e;
        break;
      case "octaves":
        this.params.octaves = Math.max(1, Math.min(4, e));
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.updateInterval !== null && window.clearInterval(this.updateInterval), this.constantSource.stop(), this.constantSource.disconnect(), this.inputGain.disconnect(), this.analyser.disconnect(), this.outputGain.disconnect();
  }
}
const xt = {
  bpm: 120,
  running: !0,
  swing: 0
};
class Ft {
  id;
  type = "clock";
  context;
  params;
  constantSource;
  outputGain;
  clockInterval = null;
  beatCount = 0;
  // Callbacks for external sync (sequencers, etc.)
  triggerCallbacks = /* @__PURE__ */ new Set();
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...xt, ...i }, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.constantSource = t.createConstantSource(), this.constantSource.offset.value = 0, this.constantSource.connect(this.outputGain), this.constantSource.start(), this.params.running && this.start();
  }
  getIntervalMs() {
    return 60 / this.params.bpm * 1e3;
  }
  tick() {
    const t = this.context.currentTime;
    this.constantSource.offset.setValueAtTime(1, t), this.constantSource.offset.setValueAtTime(0, t + 0.01), this.triggerCallbacks.forEach((e) => e()), this.beatCount++;
  }
  start() {
    if (this.clockInterval !== null) return;
    this.params.running = !0, this.beatCount = 0, this.tick();
    const t = () => {
      let e = this.getIntervalMs();
      this.params.swing > 0 && this.beatCount % 2 === 1 ? e *= 1 + this.params.swing * 0.5 : this.params.swing > 0 && this.beatCount % 2 === 0 && (e *= 1 - this.params.swing * 0.25), this.clockInterval = window.setTimeout(() => {
        this.tick(), this.params.running && t();
      }, e);
    };
    t();
  }
  stop() {
    this.params.running = !1, this.clockInterval !== null && (window.clearTimeout(this.clockInterval), this.clockInterval = null), this.constantSource.offset.setValueAtTime(0, this.context.currentTime);
  }
  // Reset beat counter (for sync)
  reset() {
    this.beatCount = 0;
  }
  // Register callback for external modules to sync
  onTrigger(t) {
    this.triggerCallbacks.add(t);
  }
  offTrigger(t) {
    this.triggerCallbacks.delete(t);
  }
  // Manual trigger (for tap tempo or external sync)
  trigger() {
    this.tick();
  }
  getBeatCount() {
    return this.beatCount;
  }
  isRunning() {
    return this.params.running;
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return null;
  }
  getModulationTarget(t) {
    return null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "bpm":
        this.params.bpm = Math.max(20, Math.min(300, e));
        break;
      case "running":
        e && !this.params.running ? this.start() : !e && this.params.running && this.stop();
        break;
      case "swing":
        this.params.swing = Math.max(0, Math.min(1, e));
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.stop(), this.triggerCallbacks.clear(), this.constantSource.stop(), this.constantSource.disconnect(), this.outputGain.disconnect();
  }
}
const Ot = {};
class E {
  id;
  type = "clockdiv";
  context;
  params;
  // Input detection
  inputGain;
  analyser;
  dataArray;
  lastInputValue = 0;
  checkInterval = null;
  // Division outputs - each is a ConstantSourceNode
  div1Output;
  // /1 (every beat)
  div2Output;
  // /2 (every 2 beats)
  div4Output;
  // /4 (every 4 beats)
  div8Output;
  // /8 (every 8 beats)
  mult2Output;
  // x2 (twice per beat) - handled differently
  // Output gains for routing
  div1Gain;
  div2Gain;
  div4Gain;
  div8Gain;
  mult2Gain;
  // Beat counter
  beatCount = 0;
  // Callbacks for sequencers to register
  divisionCallbacks = /* @__PURE__ */ new Map([
    [1, /* @__PURE__ */ new Set()],
    [2, /* @__PURE__ */ new Set()],
    [4, /* @__PURE__ */ new Set()],
    [8, /* @__PURE__ */ new Set()]
  ]);
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Ot, ...i }, this.inputGain = t.createGain(), this.analyser = t.createAnalyser(), this.analyser.fftSize = 256, this.dataArray = new Float32Array(this.analyser.fftSize), this.inputGain.connect(this.analyser), this.div1Output = t.createConstantSource(), this.div2Output = t.createConstantSource(), this.div4Output = t.createConstantSource(), this.div8Output = t.createConstantSource(), this.mult2Output = t.createConstantSource(), this.div1Output.offset.value = 0, this.div2Output.offset.value = 0, this.div4Output.offset.value = 0, this.div8Output.offset.value = 0, this.mult2Output.offset.value = 0, this.div1Gain = t.createGain(), this.div2Gain = t.createGain(), this.div4Gain = t.createGain(), this.div8Gain = t.createGain(), this.mult2Gain = t.createGain(), this.div1Output.connect(this.div1Gain), this.div2Output.connect(this.div2Gain), this.div4Output.connect(this.div4Gain), this.div8Output.connect(this.div8Gain), this.mult2Output.connect(this.mult2Gain), this.div1Output.start(), this.div2Output.start(), this.div4Output.start(), this.div8Output.start(), this.mult2Output.start(), this.startMonitoring();
  }
  startMonitoring() {
    this.checkInterval = window.setInterval(() => this.checkInput(), 2);
  }
  checkInput() {
    this.analyser.getFloatTimeDomainData(this.dataArray);
    const t = this.dataArray[0] || 0;
    t > 0.5 && this.lastInputValue <= 0.5 && this.onTrigger(), this.lastInputValue = t;
  }
  onTrigger() {
    const t = this.context.currentTime, e = 0.01;
    this.div1Output.offset.setValueAtTime(1, t), this.div1Output.offset.setValueAtTime(0, t + e), this.divisionCallbacks.get(1)?.forEach((i) => i()), this.beatCount % 2 === 0 && (this.div2Output.offset.setValueAtTime(1, t), this.div2Output.offset.setValueAtTime(0, t + e), this.divisionCallbacks.get(2)?.forEach((i) => i())), this.beatCount % 4 === 0 && (this.div4Output.offset.setValueAtTime(1, t), this.div4Output.offset.setValueAtTime(0, t + e), this.divisionCallbacks.get(4)?.forEach((i) => i())), this.beatCount % 8 === 0 && (this.div8Output.offset.setValueAtTime(1, t), this.div8Output.offset.setValueAtTime(0, t + e), this.divisionCallbacks.get(8)?.forEach((i) => i())), this.beatCount++;
  }
  // Manual trigger (can be called by clock node directly)
  trigger() {
    this.onTrigger();
  }
  // Reset beat counter
  reset() {
    this.beatCount = 0;
  }
  // Register callback for a specific division
  onDivision(t, e) {
    this.divisionCallbacks.get(t)?.add(e);
  }
  offDivision(t, e) {
    this.divisionCallbacks.get(t)?.delete(e);
  }
  getBeatCount() {
    return this.beatCount;
  }
  getOutputNode() {
    return this.div1Gain;
  }
  // Get specific division outputs
  getDiv1Output() {
    return this.div1Gain;
  }
  getDiv2Output() {
    return this.div2Gain;
  }
  getDiv4Output() {
    return this.div4Gain;
  }
  getDiv8Output() {
    return this.div8Gain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return null;
  }
  // Connect specific division output to destination
  connectDivision(t, e) {
    let i;
    switch (t) {
      case 1:
        i = this.div1Gain;
        break;
      case 2:
        i = this.div2Gain;
        break;
      case 4:
        i = this.div4Gain;
        break;
      case 8:
        i = this.div8Gain;
        break;
      default:
        i = this.div1Gain;
    }
    if ("getInputNode" in e) {
      const s = e.getInputNode();
      s && i.connect(s);
    } else
      i.connect(e);
  }
  connect(t) {
    this.connectDivision(1, t);
  }
  disconnect() {
    this.div1Gain.disconnect(), this.div2Gain.disconnect(), this.div4Gain.disconnect(), this.div8Gain.disconnect(), this.mult2Gain.disconnect();
  }
  setParam(t, e) {
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.checkInterval !== null && window.clearInterval(this.checkInterval), this.divisionCallbacks.forEach((t) => t.clear()), this.div1Output.stop(), this.div2Output.stop(), this.div4Output.stop(), this.div8Output.stop(), this.mult2Output.stop(), this.inputGain.disconnect(), this.analyser.disconnect(), this.disconnect();
  }
}
const Vt = {
  gain: 0.7
};
class Rt {
  id;
  type = "output";
  gainNode;
  analyser;
  context;
  params;
  destination;
  // Recording
  mediaStreamDest = null;
  mediaRecorder = null;
  recordedChunks = [];
  recordingState = "idle";
  recordingStartTime = 0;
  onStateChange = null;
  constructor(t, e, i, s) {
    this.context = t, this.id = e, this.destination = i, this.params = { ...Vt, ...s }, this.gainNode = t.createGain(), this.gainNode.gain.value = this.params.gain, this.analyser = t.createAnalyser(), this.analyser.fftSize = 2048, this.gainNode.connect(this.analyser), this.analyser.connect(this.destination), this.mediaStreamDest = t.createMediaStreamDestination(), this.analyser.connect(this.mediaStreamDest);
  }
  getOutputNode() {
    return null;
  }
  getInputNode() {
    return this.gainNode;
  }
  getAnalyser() {
    return this.analyser;
  }
  getModulationTarget(t) {
    return null;
  }
  connect() {
  }
  disconnect() {
    this.analyser.disconnect();
  }
  setParam(t, e) {
    t === "gain" && (this.params.gain = e, this.gainNode.gain.setTargetAtTime(e, this.context.currentTime, 0.01));
  }
  getParams() {
    return { ...this.params };
  }
  // ═══════════════════════════════════════════════════════════════
  // Recording Methods
  // ═══════════════════════════════════════════════════════════════
  setRecordingStateCallback(t) {
    this.onStateChange = t;
  }
  getRecordingState() {
    return this.recordingState;
  }
  getRecordingDuration() {
    return this.recordingState !== "recording" ? 0 : (Date.now() - this.recordingStartTime) / 1e3;
  }
  startRecording() {
    if (!this.mediaStreamDest)
      return console.error("MediaStreamDestination not available"), !1;
    if (this.recordingState === "recording")
      return console.warn("Already recording"), !1;
    this.recordedChunks = [];
    const t = this.getSupportedMimeType();
    if (!t)
      return console.error("No supported audio recording format found"), !1;
    try {
      return this.mediaRecorder = new MediaRecorder(this.mediaStreamDest.stream, {
        mimeType: t,
        audioBitsPerSecond: 192e3
        // 192 kbps for good quality
      }), this.mediaRecorder.ondataavailable = (e) => {
        e.data.size > 0 && this.recordedChunks.push(e.data);
      }, this.mediaRecorder.onstop = () => {
        this.recordingState = "stopped", this.onStateChange?.("stopped");
      }, this.mediaRecorder.onerror = (e) => {
        console.error("MediaRecorder error:", e), this.recordingState = "idle", this.onStateChange?.("idle");
      }, this.mediaRecorder.start(100), this.recordingStartTime = Date.now(), this.recordingState = "recording", this.onStateChange?.("recording"), console.log(`Recording started with format: ${t}`), !0;
    } catch (e) {
      return console.error("Failed to start recording:", e), !1;
    }
  }
  stopRecording() {
    this.mediaRecorder && this.recordingState === "recording" && this.mediaRecorder.stop();
  }
  async downloadRecording(t) {
    if (this.recordedChunks.length === 0)
      return console.warn("No recording data available"), !1;
    const e = this.mediaRecorder?.mimeType || "audio/webm", i = new Blob(this.recordedChunks, { type: e });
    let s = "webm";
    e.includes("mp4") || e.includes("aac") ? s = "m4a" : e.includes("ogg") ? s = "ogg" : e.includes("wav") && (s = "wav");
    const a = `chronoflow-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[T:]/g, "-")}.${s}`, n = t || a, o = URL.createObjectURL(i), h = document.createElement("a");
    return h.href = o, h.download = n, document.body.appendChild(h), h.click(), document.body.removeChild(h), URL.revokeObjectURL(o), console.log(`Downloaded recording: ${n} (${(i.size / 1024 / 1024).toFixed(2)} MB)`), !0;
  }
  clearRecording() {
    this.recordedChunks = [], this.recordingState = "idle", this.onStateChange?.("idle");
  }
  hasRecordedData() {
    return this.recordedChunks.length > 0;
  }
  getSupportedMimeType() {
    const t = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4;codecs=aac",
      "audio/mp4"
    ];
    for (const e of t)
      if (MediaRecorder.isTypeSupported(e))
        return e;
    return null;
  }
  dispose() {
    this.recordingState === "recording" && this.stopRecording(), this.gainNode.disconnect(), this.analyser.disconnect(), this.mediaStreamDest && this.mediaStreamDest.disconnect();
  }
}
const qt = {
  rate: 0.1,
  // Very slow for ambient
  range: 1,
  smooth: 0.8
};
class _t {
  id;
  type = "smoothrandom";
  context;
  params;
  constantSource;
  outputGain;
  updateInterval = null;
  currentValue = 0;
  targetValue = 0;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...qt, ...i }, this.constantSource = t.createConstantSource(), this.constantSource.offset.value = 0, this.outputGain = t.createGain(), this.outputGain.gain.value = this.params.range, this.constantSource.connect(this.outputGain), this.constantSource.start(), this.currentValue = (Math.random() - 0.5) * 2, this.targetValue = this.currentValue, this.startWalk();
  }
  startWalk() {
    this.updateInterval !== null && window.clearInterval(this.updateInterval);
    const t = 1e3 / 60;
    this.updateInterval = window.setInterval(() => {
      this.updateWalk();
    }, t);
  }
  updateWalk() {
    const t = this.params.rate, e = this.params.smooth;
    if (Math.random() < t / 60) {
      const a = -this.currentValue * 0.3, n = (Math.random() - 0.5) * 2;
      this.targetValue = Math.max(-1, Math.min(1, this.currentValue + n * 0.5 + a));
    }
    const i = 1 - e * 0.95;
    this.currentValue += (this.targetValue - this.currentValue) * i * 0.1, this.currentValue = Math.max(-1, Math.min(1, this.currentValue));
    const s = e * 0.1;
    this.constantSource.offset.setTargetAtTime(
      this.currentValue,
      this.context.currentTime,
      Math.max(1e-3, s)
    );
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return null;
  }
  getModulationTarget(t) {
    return null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "rate":
        this.params.rate = Math.max(0.01, Math.min(10, e));
        break;
      case "range":
        this.params.range = Math.max(0, Math.min(2, e)), this.outputGain.gain.setValueAtTime(this.params.range, this.context.currentTime);
        break;
      case "smooth":
        this.params.smooth = Math.max(0, Math.min(1, e));
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  getCurrentValue() {
    return this.currentValue * this.params.range;
  }
  dispose() {
    this.updateInterval !== null && window.clearInterval(this.updateInterval), this.constantSource.stop(), this.constantSource.disconnect(), this.outputGain.disconnect();
  }
}
const Et = {
  frequency: 220,
  damping: 0.5,
  feedback: 0.99,
  brightness: 0.7,
  pluck: 0.5
};
class B {
  id;
  type = "karplusstrong";
  context;
  params;
  // Audio nodes
  delayNode;
  feedbackGain;
  averagingDelay;
  // One-sample delay for averaging filter
  averagingGain1;
  // Current sample weight
  averagingGain2;
  // Delayed sample weight
  averagingMerge;
  // Merge point for averaging
  outputGain;
  inputGain;
  // For internal excitation
  noiseBuffer = null;
  // For trigger detection
  triggerInput;
  triggerAnalyser;
  triggerData;
  lastTriggerValue = 0;
  triggerCheckInterval = null;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Et, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.delayNode = t.createDelay(1), this.updateDelayTime(), this.averagingMerge = t.createGain(), this.averagingMerge.gain.value = 1, this.averagingGain1 = t.createGain(), this.averagingGain2 = t.createGain(), this.updateDamping(), this.averagingDelay = t.createDelay(0.1), this.averagingDelay.delayTime.value = 1 / t.sampleRate, this.feedbackGain = t.createGain(), this.updateFeedback(), this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.inputGain.connect(this.delayNode), this.delayNode.connect(this.outputGain), this.delayNode.connect(this.averagingGain1), this.delayNode.connect(this.averagingDelay), this.averagingDelay.connect(this.averagingGain2), this.averagingGain1.connect(this.averagingMerge), this.averagingGain2.connect(this.averagingMerge), this.averagingMerge.connect(this.feedbackGain), this.feedbackGain.connect(this.delayNode), this.createNoiseBuffer(), this.triggerInput = t.createGain(), this.triggerInput.gain.value = 1, this.triggerAnalyser = t.createAnalyser(), this.triggerAnalyser.fftSize = 256, this.triggerData = new Float32Array(this.triggerAnalyser.fftSize), this.triggerInput.connect(this.triggerAnalyser), this.startTriggerDetection();
  }
  startTriggerDetection() {
    this.triggerCheckInterval = window.setInterval(() => {
      this.checkTrigger();
    }, 8);
  }
  checkTrigger() {
    this.triggerAnalyser.getFloatTimeDomainData(this.triggerData);
    let t = 0;
    for (let i = 0; i < this.triggerData.length; i++) {
      const s = this.triggerData[i];
      s > t && (t = s);
    }
    const e = 0.5;
    t > e && this.lastTriggerValue <= e && (console.log(`[KarplusStrong ${this.id}] Trigger detected, peak: ${t.toFixed(3)}`), this.trigger(Math.min(1, t))), this.lastTriggerValue = t;
  }
  // Get trigger input node for external connections
  getTriggerInput() {
    return this.triggerInput;
  }
  createNoiseBuffer() {
    const e = this.context.sampleRate, i = Math.floor(0.015 * e);
    this.noiseBuffer = this.context.createBuffer(1, i, e);
    const s = this.noiseBuffer.getChannelData(0);
    for (let a = 0; a < i; a++) {
      const o = 1 - a / i;
      s[a] = (Math.random() * 2 - 1) * o;
    }
  }
  updateDelayTime() {
    const t = 1 / this.params.frequency, e = Math.max(1e-3, Math.min(1, t));
    this.delayNode.delayTime.setValueAtTime(e, this.context.currentTime);
  }
  updateDamping() {
    const t = 0.5 - this.params.damping * 0.3, e = 0.5 + this.params.damping * 0.3;
    this.averagingGain1 && this.averagingGain1.gain.setValueAtTime(t, this.context.currentTime), this.averagingGain2 && this.averagingGain2.gain.setValueAtTime(e, this.context.currentTime);
  }
  updateFeedback() {
    const t = this.params.feedback;
    this.feedbackGain.gain.setValueAtTime(t, this.context.currentTime);
  }
  // Trigger a pluck (internal excitation)
  trigger(t = 1) {
    if (!this.noiseBuffer) return;
    console.log(`[KarplusStrong ${this.id}] Plucking at velocity ${t}`);
    const e = this.context.createBufferSource();
    e.buffer = this.noiseBuffer;
    const i = this.context.createGain();
    i.gain.value = t, e.connect(i), i.connect(this.inputGain), e.start(), e.stop(this.context.currentTime + 0.02);
  }
  // Set frequency via external CV (for sequencer connection)
  setFrequency(t) {
    this.params.frequency = Math.max(20, Math.min(2e3, t)), this.updateDelayTime();
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    switch (t) {
      case "freq_mod":
        return this.delayNode.delayTime;
      case "feedback_mod":
        return this.feedbackGain.gain;
      default:
        return null;
    }
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "frequency":
        this.params.frequency = Math.max(20, Math.min(2e3, e)), this.updateDelayTime();
        break;
      case "damping":
        this.params.damping = Math.max(0, Math.min(1, e)), this.updateDamping();
        break;
      case "feedback":
        this.params.feedback = Math.max(0, Math.min(0.999, e)), this.updateFeedback();
        break;
      case "brightness":
        this.params.brightness = Math.max(0, Math.min(1, e));
        break;
      case "pluck":
        this.params.pluck = Math.max(0, Math.min(1, e));
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.triggerCheckInterval !== null && window.clearInterval(this.triggerCheckInterval), this.inputGain.disconnect(), this.delayNode.disconnect(), this.averagingGain1.disconnect(), this.averagingGain2.disconnect(), this.averagingDelay.disconnect(), this.averagingMerge.disconnect(), this.feedbackGain.disconnect(), this.outputGain.disconnect(), this.triggerInput.disconnect(), this.triggerAnalyser.disconnect();
  }
}
const Bt = {
  grainSize: 100,
  density: 10,
  spray: 0.1,
  pitch: 1,
  position: 0.5,
  freeze: !1,
  mix: 1,
  reverse: 0
}, zt = 4;
class Lt {
  id;
  type = "granular";
  context;
  params;
  // Recording
  recordBuffer;
  recordNode;
  writePosition = 0;
  isRecording = !0;
  // Playback
  outputGain;
  dryGain;
  wetGain;
  inputGain;
  grainInterval = null;
  activeGrains = /* @__PURE__ */ new Set();
  playPosition = 0;
  // Window function for grain envelope (reserved for future use)
  // private windowBuffer: AudioBuffer;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Bt, ...i };
    const s = Math.floor(zt * t.sampleRate);
    this.recordBuffer = t.createBuffer(1, s, t.sampleRate), this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.updateMix(), this.inputGain.connect(this.dryGain), this.dryGain.connect(this.outputGain), this.wetGain.connect(this.outputGain), this.recordNode = t.createScriptProcessor(2048, 1, 1), this.recordNode.onaudioprocess = (a) => this.processRecording(a), this.inputGain.connect(this.recordNode), this.recordNode.connect(t.destination), this.startGrainScheduler();
  }
  // Reserved for future optimization - pre-compute window buffer
  // private createWindowBuffer(durationSec: number): AudioBuffer {
  //   const length = Math.floor(durationSec * this.context.sampleRate);
  //   const buffer = this.context.createBuffer(1, Math.max(length, 64), this.context.sampleRate);
  //   const data = buffer.getChannelData(0);
  //   for (let i = 0; i < data.length; i++) {
  //     const t = i / (data.length - 1);
  //     data[i] = 0.5 * (1 - Math.cos(2 * Math.PI * t));
  //   }
  //   return buffer;
  // }
  processRecording(t) {
    if (this.params.freeze || !this.isRecording) return;
    const e = t.inputBuffer.getChannelData(0), i = this.recordBuffer.getChannelData(0), s = i.length;
    for (let a = 0; a < e.length; a++)
      i[this.writePosition] = e[a], this.writePosition = (this.writePosition + 1) % s;
  }
  startGrainScheduler() {
    this.grainInterval !== null && window.clearInterval(this.grainInterval);
    const t = 1e3 / this.params.density;
    this.grainInterval = window.setInterval(() => this.spawnGrain(), t);
  }
  spawnGrain() {
    const t = this.recordBuffer.getChannelData(0), e = t.length, i = this.context.sampleRate, s = this.params.grainSize / 1e3, a = Math.floor(s * i), n = this.params.position * e, o = this.params.spray * e * 0.5, h = (Math.random() - 0.5) * 2 * o;
    let c = Math.floor(n + h);
    c = (c % e + e) % e;
    const u = this.context.createBuffer(1, a, i), G = u.getChannelData(0), m = Math.random() < this.params.reverse;
    for (let l = 0; l < a; l++) {
      const d = l / a, et = 0.5 * (1 - Math.cos(2 * Math.PI * d));
      let I;
      m ? I = (c + a - l) % e : I = (c + l) % e, G[l] = t[I] * et;
    }
    const p = this.context.createBufferSource();
    p.buffer = u, p.playbackRate.value = this.params.pitch, p.connect(this.wetGain), this.activeGrains.add(p), p.onended = () => {
      this.activeGrains.delete(p);
    }, p.start(), this.params.freeze || (this.playPosition += a * 0.01, this.playPosition >= e && (this.playPosition = 0));
  }
  updateMix() {
    this.dryGain.gain.setValueAtTime(1 - this.params.mix, this.context.currentTime), this.wetGain.gain.setValueAtTime(this.params.mix, this.context.currentTime);
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return t === "mix_mod" ? this.wetGain.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "grainSize":
        this.params.grainSize = Math.max(10, Math.min(500, e));
        break;
      case "density":
        this.params.density = Math.max(1, Math.min(50, e)), this.startGrainScheduler();
        break;
      case "spray":
        this.params.spray = Math.max(0, Math.min(1, e));
        break;
      case "pitch":
        this.params.pitch = Math.max(0.25, Math.min(4, e));
        break;
      case "position":
        this.params.position = Math.max(0, Math.min(1, e));
        break;
      case "freeze":
        this.params.freeze = e;
        break;
      case "mix":
        this.params.mix = Math.max(0, Math.min(1, e)), this.updateMix();
        break;
      case "reverse":
        this.params.reverse = Math.max(0, Math.min(1, e));
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  // Trigger freeze toggle
  trigger() {
    this.params.freeze = !this.params.freeze;
  }
  dispose() {
    this.grainInterval !== null && window.clearInterval(this.grainInterval), this.activeGrains.forEach((t) => {
      try {
        t.stop();
      } catch {
      }
    }), this.activeGrains.clear(), this.recordNode.disconnect(), this.inputGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect(), this.outputGain.disconnect();
  }
}
const $t = {
  steps: 16,
  hits: 4,
  rotation: 0,
  running: !0
};
function Ut(r, t) {
  if (t >= r) return new Array(r).fill(!0);
  if (t <= 0) return new Array(r).fill(!1);
  let e = [];
  for (let s = 0; s < t; s++) e.push([1]);
  for (let s = 0; s < r - t; s++) e.push([0]);
  for (; ; ) {
    const s = [], a = [];
    for (const o of e)
      o[0] === 0 ? s.push(o) : a.push(o);
    if (s.length <= 1 || a.length <= 1) break;
    e = [];
    const n = Math.min(s.length, a.length);
    for (let o = 0; o < n; o++)
      e.push([...a[o], ...s[o]]);
    for (let o = n; o < a.length; o++) e.push(a[o]);
    for (let o = n; o < s.length; o++) e.push(s[o]);
  }
  const i = [];
  for (const s of e)
    for (const a of s)
      i.push(a === 1);
  return i;
}
class Wt {
  id;
  type = "euclidean";
  context;
  params;
  pattern = [];
  currentStep = 0;
  // Output
  constantSource;
  outputGain;
  // For receiving external clock
  triggerAnalyser;
  triggerData;
  lastTriggerValue = 0;
  checkInterval = null;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...$t, ...i }, this.regeneratePattern(), this.constantSource = t.createConstantSource(), this.constantSource.offset.value = 0, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.constantSource.connect(this.outputGain), this.constantSource.start(), this.triggerAnalyser = t.createAnalyser(), this.triggerAnalyser.fftSize = 256, this.triggerData = new Float32Array(this.triggerAnalyser.fftSize), this.startTriggerCheck();
  }
  regeneratePattern() {
    const t = Ut(this.params.steps, this.params.hits), e = this.params.rotation % this.params.steps;
    this.pattern = [
      ...t.slice(e),
      ...t.slice(0, e)
    ];
  }
  startTriggerCheck() {
    this.checkInterval !== null && window.clearInterval(this.checkInterval), this.checkInterval = window.setInterval(() => {
      this.checkTrigger();
    }, 1);
  }
  checkTrigger() {
    if (!this.params.running) return;
    this.triggerAnalyser.getFloatTimeDomainData(this.triggerData);
    const t = this.triggerData[0];
    t > 0.5 && this.lastTriggerValue <= 0.5 && this.advanceStep(), this.lastTriggerValue = t;
  }
  advanceStep() {
    if (this.pattern[this.currentStep]) {
      const e = this.context.currentTime;
      this.constantSource.offset.setValueAtTime(1, e), this.constantSource.offset.setValueAtTime(0, e + 0.01);
    }
    this.currentStep = (this.currentStep + 1) % this.params.steps;
  }
  // Manual trigger (for testing or external sync via callback)
  trigger() {
    this.params.running && this.advanceStep();
  }
  reset() {
    this.currentStep = 0;
  }
  getCurrentStep() {
    return this.currentStep;
  }
  getPattern() {
    return [...this.pattern];
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.triggerAnalyser;
  }
  getModulationTarget(t) {
    return null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "steps":
        this.params.steps = Math.max(1, Math.min(32, Math.round(e))), this.params.hits = Math.min(this.params.hits, this.params.steps), this.params.rotation = Math.min(this.params.rotation, this.params.steps - 1), this.regeneratePattern(), this.currentStep = this.currentStep % this.params.steps;
        break;
      case "hits":
        this.params.hits = Math.max(0, Math.min(this.params.steps, Math.round(e))), this.regeneratePattern();
        break;
      case "rotation":
        this.params.rotation = Math.max(0, Math.min(this.params.steps - 1, Math.round(e))), this.regeneratePattern();
        break;
      case "running":
        this.params.running = e;
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.checkInterval !== null && window.clearInterval(this.checkInterval), this.constantSource.stop(), this.constantSource.disconnect(), this.outputGain.disconnect(), this.triggerAnalyser.disconnect();
  }
}
const Qt = {
  rise: 0.1,
  fall: 0.1,
  shape: "exponential"
};
class Ht {
  id;
  type = "slewlimiter";
  context;
  params;
  // Signal chain
  inputGain;
  outputGain;
  // For slew processing
  analyser;
  analyserData;
  constantSource;
  currentValue = 0;
  targetValue = 0;
  updateInterval = null;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Qt, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.analyser = t.createAnalyser(), this.analyser.fftSize = 256, this.analyserData = new Float32Array(this.analyser.fftSize), this.inputGain.connect(this.analyser), this.constantSource = t.createConstantSource(), this.constantSource.offset.value = 0, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.constantSource.connect(this.outputGain), this.constantSource.start(), this.startProcessing();
  }
  startProcessing() {
    this.updateInterval !== null && window.clearInterval(this.updateInterval);
    const t = 1e3 / 120;
    this.updateInterval = window.setInterval(() => {
      this.process();
    }, t);
  }
  process() {
    this.analyser.getFloatTimeDomainData(this.analyserData), this.targetValue = this.analyserData[0];
    const t = this.targetValue - this.currentValue, s = 1 / ((t > 0 ? this.params.rise : this.params.fall) * 120);
    switch (this.params.shape) {
      case "linear":
        Math.abs(t) < s ? this.currentValue = this.targetValue : this.currentValue += Math.sign(t) * s;
        break;
      case "exponential":
        this.currentValue += t * Math.min(1, s * 2);
        break;
      case "logarithmic":
        const a = s * (1 + Math.abs(t) * 2);
        this.currentValue += t * Math.min(1, a);
        break;
      default:
        this.currentValue = this.targetValue;
    }
    this.constantSource.offset.setValueAtTime(
      this.currentValue,
      this.context.currentTime
    );
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    switch (t) {
      case "rise_mod":
      case "fall_mod":
        return null;
      default:
        return null;
    }
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "rise":
        this.params.rise = Math.max(1e-3, Math.min(5, e));
        break;
      case "fall":
        this.params.fall = Math.max(1e-3, Math.min(5, e));
        break;
      case "shape":
        ["linear", "exponential", "logarithmic"].includes(e) && (this.params.shape = e);
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  getCurrentValue() {
    return this.currentValue;
  }
  dispose() {
    this.updateInterval !== null && window.clearInterval(this.updateInterval), this.constantSource.stop(), this.constantSource.disconnect(), this.outputGain.disconnect(), this.inputGain.disconnect(), this.analyser.disconnect();
  }
}
const jt = {
  probability: 0.5,
  length: 8,
  scale: 1,
  locked: !1
};
class Jt {
  id;
  type = "turing";
  context;
  params;
  // Shift register (array of bits)
  register = [];
  currentStep = 0;
  // Output
  constantSource;
  outputGain;
  // Gate output (for trigger on each step)
  gateSource;
  gateGain;
  // Trigger input detection
  triggerAnalyser;
  triggerData;
  lastTriggerValue = 0;
  checkInterval = null;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...jt, ...i }, this.initializeRegister(), this.constantSource = t.createConstantSource(), this.constantSource.offset.value = 0, this.outputGain = t.createGain(), this.outputGain.gain.value = this.params.scale, this.constantSource.connect(this.outputGain), this.constantSource.start(), this.gateSource = t.createConstantSource(), this.gateSource.offset.value = 0, this.gateGain = t.createGain(), this.gateGain.gain.value = 1, this.gateSource.connect(this.gateGain), this.gateSource.start(), this.triggerAnalyser = t.createAnalyser(), this.triggerAnalyser.fftSize = 256, this.triggerData = new Float32Array(this.triggerAnalyser.fftSize), this.startTriggerCheck();
  }
  initializeRegister() {
    this.register = [];
    for (let t = 0; t < this.params.length; t++)
      this.register.push(Math.random() > 0.5);
  }
  startTriggerCheck() {
    this.checkInterval !== null && window.clearInterval(this.checkInterval), this.checkInterval = window.setInterval(() => {
      this.checkTrigger();
    }, 1);
  }
  checkTrigger() {
    this.triggerAnalyser.getFloatTimeDomainData(this.triggerData);
    const t = this.triggerData[0];
    t > 0.5 && this.lastTriggerValue <= 0.5 && this.advanceStep(), this.lastTriggerValue = t;
  }
  advanceStep() {
    const t = this.register[this.register.length - 1], e = this.params.locked ? 0 : this.params.probability, s = Math.random() < e ? !t : t;
    this.register.pop(), this.register.unshift(s);
    let a = 0;
    for (let c = 0; c < this.register.length; c++)
      this.register[c] && (a += Math.pow(2, c));
    const n = Math.pow(2, this.register.length) - 1, o = a / n, h = this.context.currentTime;
    this.constantSource.offset.setValueAtTime(o, h), this.gateSource.offset.setValueAtTime(1, h), this.gateSource.offset.setValueAtTime(0, h + 0.01), this.currentStep = (this.currentStep + 1) % this.params.length;
  }
  // Manual trigger
  trigger() {
    this.advanceStep();
  }
  // Randomize the register
  randomize() {
    this.initializeRegister();
  }
  getRegister() {
    return [...this.register];
  }
  getCurrentStep() {
    return this.currentStep;
  }
  getOutputNode() {
    return this.outputGain;
  }
  // Gate output for triggers
  getGateOutput() {
    return this.gateGain;
  }
  getInputNode() {
    return this.triggerAnalyser;
  }
  getModulationTarget(t) {
    return t === "scale_mod" ? this.outputGain.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect(), this.gateGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "probability":
        this.params.probability = Math.max(0, Math.min(1, e));
        break;
      case "length":
        const i = Math.max(2, Math.min(16, Math.round(e)));
        if (i !== this.params.length) {
          for (this.params.length = i; this.register.length < i; )
            this.register.push(Math.random() > 0.5);
          for (; this.register.length > i; )
            this.register.pop();
        }
        break;
      case "scale":
        this.params.scale = Math.max(0, Math.min(5, e)), this.outputGain.gain.setValueAtTime(this.params.scale, this.context.currentTime);
        break;
      case "locked":
        this.params.locked = e;
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.checkInterval !== null && window.clearInterval(this.checkInterval), this.constantSource.stop(), this.constantSource.disconnect(), this.outputGain.disconnect(), this.gateSource.stop(), this.gateSource.disconnect(), this.gateGain.disconnect(), this.triggerAnalyser.disconnect();
  }
}
const Kt = {
  attack: 10,
  release: 100,
  gain: 1,
  offset: 0
};
class Yt {
  id;
  type = "envfollower";
  context;
  params;
  // Input chain
  inputGain;
  // Envelope detection using Web Audio
  // Rectify -> Low-pass filter chain
  rectifier;
  smoothingFilter;
  outputGain;
  offsetNode;
  offsetGain;
  sumGain;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Kt, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = this.params.gain, this.rectifier = t.createWaveShaper(), this.rectifier.curve = this.makeRectifierCurve(), this.rectifier.oversample = "2x", this.smoothingFilter = t.createBiquadFilter(), this.smoothingFilter.type = "lowpass", this.updateFilterFrequency(), this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.offsetNode = t.createConstantSource(), this.offsetNode.offset.value = 1, this.offsetGain = t.createGain(), this.offsetGain.gain.value = this.params.offset, this.offsetNode.connect(this.offsetGain), this.offsetNode.start(), this.sumGain = t.createGain(), this.sumGain.gain.value = 1, this.inputGain.connect(this.rectifier), this.rectifier.connect(this.smoothingFilter), this.smoothingFilter.connect(this.outputGain), this.outputGain.connect(this.sumGain), this.offsetGain.connect(this.sumGain);
  }
  makeRectifierCurve() {
    const e = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const s = i / 255 * 2 - 1;
      e[i] = Math.abs(s);
    }
    return e;
  }
  updateFilterFrequency() {
    const t = this.params.attack / 1e3, e = this.params.release / 1e3, i = (t + e) / 2, s = 1 / (2 * Math.PI * i);
    this.smoothingFilter.frequency.setValueAtTime(
      Math.max(0.1, Math.min(100, s)),
      this.context.currentTime
    );
  }
  getOutputNode() {
    return this.sumGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    switch (t) {
      case "gain_mod":
        return this.inputGain.gain;
      case "offset_mod":
        return this.offsetGain.gain;
      default:
        return null;
    }
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.sumGain.connect(e);
    } else
      this.sumGain.connect(t);
  }
  disconnect() {
    this.sumGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "attack":
        this.params.attack = Math.max(1, Math.min(500, e)), this.updateFilterFrequency();
        break;
      case "release":
        this.params.release = Math.max(1, Math.min(2e3, e)), this.updateFilterFrequency();
        break;
      case "gain":
        this.params.gain = Math.max(0.1, Math.min(10, e)), this.inputGain.gain.setValueAtTime(this.params.gain, this.context.currentTime);
        break;
      case "offset":
        this.params.offset = Math.max(-1, Math.min(1, e)), this.offsetGain.gain.setValueAtTime(this.params.offset, this.context.currentTime);
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.offsetNode.stop(), this.offsetNode.disconnect(), this.offsetGain.disconnect(), this.inputGain.disconnect(), this.rectifier.disconnect(), this.smoothingFilter.disconnect(), this.outputGain.disconnect(), this.sumGain.disconnect();
  }
}
const Xt = {
  probability: 0.5,
  mode: "gate"
};
class Zt {
  id;
  type = "probgate";
  context;
  params;
  // Trigger input detection
  triggerAnalyser;
  triggerData;
  lastTriggerValue = 0;
  checkInterval = null;
  // Outputs
  outputA;
  outputAGain;
  outputB;
  outputBGain;
  // Stats
  passCount = 0;
  totalCount = 0;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Xt, ...i }, this.triggerAnalyser = t.createAnalyser(), this.triggerAnalyser.fftSize = 256, this.triggerData = new Float32Array(this.triggerAnalyser.fftSize), this.outputA = t.createConstantSource(), this.outputA.offset.value = 0, this.outputAGain = t.createGain(), this.outputAGain.gain.value = 1, this.outputA.connect(this.outputAGain), this.outputA.start(), this.outputB = t.createConstantSource(), this.outputB.offset.value = 0, this.outputBGain = t.createGain(), this.outputBGain.gain.value = 1, this.outputB.connect(this.outputBGain), this.outputB.start(), this.startTriggerCheck();
  }
  startTriggerCheck() {
    this.checkInterval !== null && window.clearInterval(this.checkInterval), this.checkInterval = window.setInterval(() => {
      this.checkTrigger();
    }, 1);
  }
  checkTrigger() {
    this.triggerAnalyser.getFloatTimeDomainData(this.triggerData);
    const t = this.triggerData[0];
    t > 0.5 && this.lastTriggerValue <= 0.5 && this.processTrigger(), this.lastTriggerValue = t;
  }
  processTrigger() {
    this.totalCount++;
    const t = this.context.currentTime, e = Math.random() < this.params.probability;
    this.params.mode === "gate" ? e && (this.passCount++, this.outputA.offset.setValueAtTime(1, t), this.outputA.offset.setValueAtTime(0, t + 0.01)) : e ? (this.passCount++, this.outputA.offset.setValueAtTime(1, t), this.outputA.offset.setValueAtTime(0, t + 0.01)) : (this.outputB.offset.setValueAtTime(1, t), this.outputB.offset.setValueAtTime(0, t + 0.01));
  }
  // Manual trigger
  trigger() {
    this.processTrigger();
  }
  resetStats() {
    this.passCount = 0, this.totalCount = 0;
  }
  getStats() {
    return {
      passed: this.passCount,
      total: this.totalCount,
      ratio: this.totalCount > 0 ? this.passCount / this.totalCount : 0
    };
  }
  getOutputNode() {
    return this.outputAGain;
  }
  // Secondary output for Bernoulli mode
  getOutputB() {
    return this.outputBGain;
  }
  getInputNode() {
    return this.triggerAnalyser;
  }
  getModulationTarget(t) {
    return null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputAGain.connect(e);
    } else
      this.outputAGain.connect(t);
  }
  disconnect() {
    this.outputAGain.disconnect(), this.outputBGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "probability":
        this.params.probability = Math.max(0, Math.min(1, e));
        break;
      case "mode":
        ["gate", "bernoulli"].includes(e) && (this.params.mode = e);
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.checkInterval !== null && window.clearInterval(this.checkInterval), this.outputA.stop(), this.outputA.disconnect(), this.outputAGain.disconnect(), this.outputB.stop(), this.outputB.disconnect(), this.outputBGain.disconnect(), this.triggerAnalyser.disconnect();
  }
}
const te = {
  operation: "and"
};
class ee {
  id;
  type = "logic";
  context;
  params;
  // Two trigger inputs
  inputAAnalyser;
  inputBAnalyser;
  inputAData;
  inputBData;
  inputAGain;
  inputBGain;
  // Track input states
  inputAHigh = !1;
  inputBHigh = !1;
  lastOutputHigh = !1;
  // Output
  outputSource;
  outputGain;
  checkInterval = null;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...te, ...i }, this.inputAGain = t.createGain(), this.inputAGain.gain.value = 1, this.inputAAnalyser = t.createAnalyser(), this.inputAAnalyser.fftSize = 256, this.inputAData = new Float32Array(this.inputAAnalyser.fftSize), this.inputAGain.connect(this.inputAAnalyser), this.inputBGain = t.createGain(), this.inputBGain.gain.value = 1, this.inputBAnalyser = t.createAnalyser(), this.inputBAnalyser.fftSize = 256, this.inputBData = new Float32Array(this.inputBAnalyser.fftSize), this.inputBGain.connect(this.inputBAnalyser), this.outputSource = t.createConstantSource(), this.outputSource.offset.value = 0, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.outputSource.connect(this.outputGain), this.outputSource.start(), this.startProcessing();
  }
  startProcessing() {
    this.checkInterval !== null && window.clearInterval(this.checkInterval), this.checkInterval = window.setInterval(() => {
      this.process();
    }, 1);
  }
  process() {
    this.inputAAnalyser.getFloatTimeDomainData(this.inputAData), this.inputBAnalyser.getFloatTimeDomainData(this.inputBData);
    const t = this.inputAData[0] > 0.5, e = this.inputBData[0] > 0.5;
    let i;
    switch (this.params.operation) {
      case "and":
        i = t && e;
        break;
      case "or":
        i = t || e;
        break;
      case "xor":
        i = t !== e;
        break;
      case "nand":
        i = !(t && e);
        break;
      case "nor":
        i = !(t || e);
        break;
      case "not":
        i = !t;
        break;
      default:
        i = !1;
    }
    i !== this.lastOutputHigh && (this.outputSource.offset.setValueAtTime(
      i ? 1 : 0,
      this.context.currentTime
    ), this.lastOutputHigh = i), this.inputAHigh = t, this.inputBHigh = e;
  }
  getOutputNode() {
    return this.outputGain;
  }
  // Primary input (A)
  getInputNode() {
    return this.inputAGain;
  }
  // Secondary input (B)
  getInputB() {
    return this.inputBGain;
  }
  getModulationTarget(t) {
    return null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    t === "operation" && ["and", "or", "xor", "nand", "nor", "not"].includes(e) && (this.params.operation = e);
  }
  getParams() {
    return { ...this.params };
  }
  getInputStates() {
    return {
      a: this.inputAHigh,
      b: this.inputBHigh
    };
  }
  dispose() {
    this.checkInterval !== null && window.clearInterval(this.checkInterval), this.outputSource.stop(), this.outputSource.disconnect(), this.outputGain.disconnect(), this.inputAGain.disconnect(), this.inputBGain.disconnect(), this.inputAAnalyser.disconnect(), this.inputBAnalyser.disconnect();
  }
}
const ie = {
  value: 0.5,
  out1Min: 0,
  out1Max: 1,
  out2Min: 0,
  out2Max: 1,
  out3Min: 0,
  out3Max: 1,
  out4Min: 0,
  out4Max: 1,
  smooth: 0.1
};
class z {
  id;
  type = "macro";
  context;
  params;
  // Four independent CV outputs
  output1;
  output1Gain;
  output2;
  output2Gain;
  output3;
  output3Gain;
  output4;
  output4Gain;
  // Main mixed output (all 4 summed)
  mainOutput;
  // For external CV input
  inputGain;
  inputAnalyser;
  inputData;
  updateInterval = null;
  currentValue = 0.5;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...ie, ...i }, this.currentValue = this.params.value, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.inputAnalyser = t.createAnalyser(), this.inputAnalyser.fftSize = 256, this.inputData = new Float32Array(this.inputAnalyser.fftSize), this.inputGain.connect(this.inputAnalyser), this.output1 = t.createConstantSource(), this.output1.offset.value = 0, this.output1Gain = t.createGain(), this.output1Gain.gain.value = 1, this.output1.connect(this.output1Gain), this.output1.start(), this.output2 = t.createConstantSource(), this.output2.offset.value = 0, this.output2Gain = t.createGain(), this.output2Gain.gain.value = 1, this.output2.connect(this.output2Gain), this.output2.start(), this.output3 = t.createConstantSource(), this.output3.offset.value = 0, this.output3Gain = t.createGain(), this.output3Gain.gain.value = 1, this.output3.connect(this.output3Gain), this.output3.start(), this.output4 = t.createConstantSource(), this.output4.offset.value = 0, this.output4Gain = t.createGain(), this.output4Gain.gain.value = 1, this.output4.connect(this.output4Gain), this.output4.start(), this.mainOutput = t.createGain(), this.mainOutput.gain.value = 0.25, this.output1Gain.connect(this.mainOutput), this.output2Gain.connect(this.mainOutput), this.output3Gain.connect(this.mainOutput), this.output4Gain.connect(this.mainOutput), this.updateOutputs(), this.startUpdateLoop();
  }
  startUpdateLoop() {
    this.updateInterval !== null && window.clearInterval(this.updateInterval), this.updateInterval = window.setInterval(() => {
      this.inputAnalyser.getFloatTimeDomainData(this.inputData);
      const t = this.inputData[0];
      if (Math.abs(t) > 0.01) {
        const s = (t + 1) / 2;
        this.params.value = Math.max(0, Math.min(1, s));
      }
      const e = this.params.value, i = 1 - this.params.smooth * 0.95;
      this.currentValue += (e - this.currentValue) * i, this.updateOutputs();
    }, 16);
  }
  updateOutputs() {
    const t = this.context.currentTime, e = this.currentValue, i = this.params.out1Min + e * (this.params.out1Max - this.params.out1Min), s = this.params.out2Min + e * (this.params.out2Max - this.params.out2Min), a = this.params.out3Min + e * (this.params.out3Max - this.params.out3Min), n = this.params.out4Min + e * (this.params.out4Max - this.params.out4Min);
    this.output1.offset.setValueAtTime(i, t), this.output2.offset.setValueAtTime(s, t), this.output3.offset.setValueAtTime(a, t), this.output4.offset.setValueAtTime(n, t);
  }
  // Get individual outputs
  getOutput1() {
    return this.output1Gain;
  }
  getOutput2() {
    return this.output2Gain;
  }
  getOutput3() {
    return this.output3Gain;
  }
  getOutput4() {
    return this.output4Gain;
  }
  // Main output (for convenience, sums all)
  getOutputNode() {
    return this.mainOutput;
  }
  // CV input for external control
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.mainOutput.connect(e);
    } else
      this.mainOutput.connect(t);
  }
  disconnect() {
    this.mainOutput.disconnect(), this.output1Gain.disconnect(), this.output2Gain.disconnect(), this.output3Gain.disconnect(), this.output4Gain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "value":
        this.params.value = Math.max(0, Math.min(1, e));
        break;
      case "out1Min":
        this.params.out1Min = e;
        break;
      case "out1Max":
        this.params.out1Max = e;
        break;
      case "out2Min":
        this.params.out2Min = e;
        break;
      case "out2Max":
        this.params.out2Max = e;
        break;
      case "out3Min":
        this.params.out3Min = e;
        break;
      case "out3Max":
        this.params.out3Max = e;
        break;
      case "out4Min":
        this.params.out4Min = e;
        break;
      case "out4Max":
        this.params.out4Max = e;
        break;
      case "smooth":
        this.params.smooth = Math.max(0, Math.min(1, e));
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  getCurrentValue() {
    return this.currentValue;
  }
  getOutputValues() {
    const t = this.currentValue;
    return {
      out1: this.params.out1Min + t * (this.params.out1Max - this.params.out1Min),
      out2: this.params.out2Min + t * (this.params.out2Max - this.params.out2Min),
      out3: this.params.out3Min + t * (this.params.out3Max - this.params.out3Min),
      out4: this.params.out4Min + t * (this.params.out4Max - this.params.out4Min)
    };
  }
  dispose() {
    this.updateInterval !== null && window.clearInterval(this.updateInterval), this.output1.stop(), this.output1.disconnect(), this.output1Gain.disconnect(), this.output2.stop(), this.output2.disconnect(), this.output2Gain.disconnect(), this.output3.stop(), this.output3.disconnect(), this.output3Gain.disconnect(), this.output4.stop(), this.output4.disconnect(), this.output4Gain.disconnect(), this.mainOutput.disconnect(), this.inputGain.disconnect(), this.inputAnalyser.disconnect();
  }
}
const se = {
  count: 8,
  mode: "up",
  autoReset: !0
};
class D {
  id;
  type = "counter";
  context;
  params;
  // Current count state
  currentCount = 0;
  direction = 1;
  // For pendulum mode
  // Audio nodes for trigger detection
  triggerInput;
  triggerAnalyser;
  triggerData;
  lastTriggerValue = 0;
  triggerCheckInterval = null;
  // Reset input
  resetInput;
  resetAnalyser;
  resetData;
  lastResetValue = 0;
  // Output - constant source that pulses
  outputGain;
  // Count output - CV representing current count (0-1 range)
  countOutput;
  countGain;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...se, ...i }, this.triggerInput = t.createGain(), this.triggerInput.gain.value = 1, this.triggerAnalyser = t.createAnalyser(), this.triggerAnalyser.fftSize = 256, this.triggerData = new Float32Array(this.triggerAnalyser.fftSize), this.triggerInput.connect(this.triggerAnalyser), this.resetInput = t.createGain(), this.resetInput.gain.value = 1, this.resetAnalyser = t.createAnalyser(), this.resetAnalyser.fftSize = 256, this.resetData = new Float32Array(this.resetAnalyser.fftSize), this.resetInput.connect(this.resetAnalyser), this.outputGain = t.createGain(), this.outputGain.gain.value = 0, this.countOutput = t.createConstantSource(), this.countOutput.offset.value = 1, this.countGain = t.createGain(), this.countGain.gain.value = 0, this.countOutput.connect(this.countGain), this.countOutput.start(), this.resetCounter(), this.startDetection();
  }
  startDetection() {
    this.triggerCheckInterval = window.setInterval(() => {
      this.checkTrigger(), this.checkReset();
    }, 5);
  }
  checkTrigger() {
    this.triggerAnalyser.getFloatTimeDomainData(this.triggerData);
    let t = 0;
    for (let i = 0; i < this.triggerData.length; i++)
      this.triggerData[i] > t && (t = this.triggerData[i]);
    const e = 0.5;
    t > e && this.lastTriggerValue <= e && this.onTrigger(), this.lastTriggerValue = t;
  }
  checkReset() {
    this.resetAnalyser.getFloatTimeDomainData(this.resetData);
    let t = 0;
    for (let i = 0; i < this.resetData.length; i++)
      this.resetData[i] > t && (t = this.resetData[i]);
    const e = 0.5;
    t > e && this.lastResetValue <= e && this.resetCounter(), this.lastResetValue = t;
  }
  onTrigger() {
    this.params.mode === "up" ? this.currentCount++ : this.params.mode === "down" ? this.currentCount-- : (this.currentCount += this.direction, (this.currentCount >= this.params.count || this.currentCount <= 0) && (this.direction *= -1));
    const t = this.currentCount / this.params.count;
    this.countGain.gain.setValueAtTime(t, this.context.currentTime), (this.params.mode === "down" ? this.currentCount <= 0 : this.currentCount >= this.params.count) && (this.firePulse(), this.params.autoReset && this.resetCounter());
  }
  firePulse() {
    const t = this.context.currentTime;
    this.outputGain.gain.setValueAtTime(1, t), this.outputGain.gain.setValueAtTime(0, t + 0.01);
  }
  resetCounter() {
    this.params.mode === "down" ? this.currentCount = this.params.count : this.currentCount = 0, this.direction = 1, this.countGain.gain.setValueAtTime(
      this.currentCount / this.params.count,
      this.context.currentTime
    );
  }
  // Get trigger input for clock connection
  getTriggerInput() {
    return this.triggerInput;
  }
  // Get reset input
  getResetInput() {
    return this.resetInput;
  }
  // Get count CV output
  getCountOutput() {
    return this.countGain;
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.triggerInput;
  }
  getModulationTarget(t) {
    return null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "count":
        this.params.count = Math.max(1, Math.min(64, e));
        break;
      case "mode":
        this.params.mode = e, this.resetCounter();
        break;
      case "autoReset":
        this.params.autoReset = e === "true" || e === 1 || e === "1";
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  getCurrentCount() {
    return this.currentCount;
  }
  dispose() {
    this.triggerCheckInterval !== null && window.clearInterval(this.triggerCheckInterval), this.triggerInput.disconnect(), this.triggerAnalyser.disconnect(), this.resetInput.disconnect(), this.resetAnalyser.disconnect(), this.outputGain.disconnect(), this.countOutput.stop(), this.countOutput.disconnect(), this.countGain.disconnect();
  }
}
const ae = {
  threshold: 0.5,
  mode: "greater",
  windowSize: 0.1,
  hysteresis: 0.05
};
class C {
  id;
  type = "comparator";
  context;
  params;
  // Input signal analysis
  inputGain;
  inputAnalyser;
  inputData;
  checkInterval = null;
  // Threshold CV input (optional)
  thresholdInput;
  thresholdAnalyser;
  thresholdData;
  hasThresholdCV = !1;
  // Gate output
  gateSource;
  gateGain;
  // Inverted gate output
  invertedGain;
  // Trigger output (pulse on state change)
  triggerGain;
  // State tracking
  currentState = !1;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...ae, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.inputAnalyser = t.createAnalyser(), this.inputAnalyser.fftSize = 256, this.inputData = new Float32Array(this.inputAnalyser.fftSize), this.inputGain.connect(this.inputAnalyser), this.thresholdInput = t.createGain(), this.thresholdInput.gain.value = 1, this.thresholdAnalyser = t.createAnalyser(), this.thresholdAnalyser.fftSize = 256, this.thresholdData = new Float32Array(this.thresholdAnalyser.fftSize), this.thresholdInput.connect(this.thresholdAnalyser), this.gateSource = t.createConstantSource(), this.gateSource.offset.value = 1, this.gateGain = t.createGain(), this.gateGain.gain.value = 0, this.gateSource.connect(this.gateGain), this.gateSource.start(), this.invertedGain = t.createGain(), this.invertedGain.gain.value = 1, this.gateSource.connect(this.invertedGain), this.triggerGain = t.createGain(), this.triggerGain.gain.value = 0, this.startMonitoring();
  }
  startMonitoring() {
    this.checkInterval = window.setInterval(() => {
      this.checkComparison();
    }, 5);
  }
  checkComparison() {
    this.inputAnalyser.getFloatTimeDomainData(this.inputData);
    let t = 0;
    for (let o = 0; o < this.inputData.length; o++)
      t += this.inputData[o];
    const e = t / this.inputData.length;
    let i = this.params.threshold;
    if (this.hasThresholdCV) {
      this.thresholdAnalyser.getFloatTimeDomainData(this.thresholdData);
      let o = 0;
      for (let h = 0; h < this.thresholdData.length; h++)
        o += this.thresholdData[h];
      i = o / this.thresholdData.length;
    }
    const s = i + this.params.hysteresis, a = i - this.params.hysteresis;
    let n;
    switch (this.params.mode) {
      case "greater":
        this.currentState ? n = e > a : n = e > s;
        break;
      case "less":
        this.currentState ? n = e < s : n = e < a;
        break;
      case "equal":
        n = Math.abs(e - i) < this.params.windowSize;
        break;
      case "window":
        const h = i - this.params.windowSize / 2, c = i + this.params.windowSize / 2;
        n = e >= h && e <= c;
        break;
      default:
        n = !1;
    }
    if (n !== this.currentState) {
      this.currentState = n;
      const o = this.context.currentTime;
      this.gateGain.gain.setValueAtTime(n ? 1 : 0, o), this.invertedGain.gain.setValueAtTime(n ? 0 : 1, o), n && (this.triggerGain.gain.setValueAtTime(1, o), this.triggerGain.gain.setValueAtTime(0, o + 0.01));
    }
  }
  // Get threshold CV input
  getThresholdInput() {
    return this.hasThresholdCV = !0, this.thresholdInput;
  }
  // Get inverted gate output
  getInvertedOutput() {
    return this.invertedGain;
  }
  // Get trigger output (pulses on state change)
  getTriggerOutput() {
    return this.triggerGain;
  }
  getOutputNode() {
    return this.gateGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return t === "threshold_mod" ? this.thresholdInput.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.gateGain.connect(e);
    } else
      this.gateGain.connect(t);
  }
  disconnect() {
    this.gateGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "threshold":
        this.params.threshold = Math.max(-1, Math.min(1, e));
        break;
      case "mode":
        this.params.mode = e;
        break;
      case "windowSize":
        this.params.windowSize = Math.max(0.01, Math.min(1, e));
        break;
      case "hysteresis":
        this.params.hysteresis = Math.max(0, Math.min(0.5, e));
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  getCurrentState() {
    return this.currentState;
  }
  dispose() {
    this.checkInterval !== null && window.clearInterval(this.checkInterval), this.inputGain.disconnect(), this.inputAnalyser.disconnect(), this.thresholdInput.disconnect(), this.thresholdAnalyser.disconnect(), this.gateSource.stop(), this.gateSource.disconnect(), this.gateGain.disconnect(), this.invertedGain.disconnect(), this.triggerGain.disconnect();
  }
}
const ne = {
  channels: 2,
  mode: "cv",
  position: 0,
  smooth: 10
};
class P {
  id;
  type = "switch";
  context;
  params;
  // Input channels
  inputs;
  inputGains;
  // For crossfading
  // CV control input
  cvInput;
  cvAnalyser;
  cvData;
  hasCVInput = !1;
  // Trigger input (for sequential mode)
  triggerInput;
  triggerAnalyser;
  triggerData;
  lastTriggerValue = 0;
  // Output
  outputGain;
  // State
  currentChannel = 0;
  checkInterval = null;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...ne, ...i }, this.inputs = [], this.inputGains = [];
    for (let s = 0; s < 4; s++) {
      const a = t.createGain();
      a.gain.value = 1;
      const n = t.createGain();
      n.gain.value = s === 0 ? 1 : 0, a.connect(n), this.inputs.push(a), this.inputGains.push(n);
    }
    this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.inputGains.forEach((s) => s.connect(this.outputGain)), this.cvInput = t.createGain(), this.cvInput.gain.value = 1, this.cvAnalyser = t.createAnalyser(), this.cvAnalyser.fftSize = 256, this.cvData = new Float32Array(this.cvAnalyser.fftSize), this.cvInput.connect(this.cvAnalyser), this.triggerInput = t.createGain(), this.triggerInput.gain.value = 1, this.triggerAnalyser = t.createAnalyser(), this.triggerAnalyser.fftSize = 256, this.triggerData = new Float32Array(this.triggerAnalyser.fftSize), this.triggerInput.connect(this.triggerAnalyser), this.startMonitoring();
  }
  startMonitoring() {
    this.checkInterval = window.setInterval(() => {
      this.updateSelection();
    }, 10);
  }
  updateSelection() {
    let t = this.currentChannel;
    if (this.params.mode === "cv") {
      let e = this.params.position;
      if (this.hasCVInput) {
        this.cvAnalyser.getFloatTimeDomainData(this.cvData);
        let i = 0;
        for (let s = 0; s < this.cvData.length; s++)
          i += this.cvData[s];
        e = Math.max(0, Math.min(1, i / this.cvData.length));
      }
      t = Math.floor(e * this.params.channels), t = Math.max(0, Math.min(this.params.channels - 1, t));
    } else if (this.params.mode === "sequential") {
      this.triggerAnalyser.getFloatTimeDomainData(this.triggerData);
      let e = 0;
      for (let i = 0; i < this.triggerData.length; i++)
        this.triggerData[i] > e && (e = this.triggerData[i]);
      e > 0.5 && this.lastTriggerValue <= 0.5 && (t = (this.currentChannel + 1) % this.params.channels), this.lastTriggerValue = e;
    } else if (this.params.mode === "random") {
      this.triggerAnalyser.getFloatTimeDomainData(this.triggerData);
      let e = 0;
      for (let i = 0; i < this.triggerData.length; i++)
        this.triggerData[i] > e && (e = this.triggerData[i]);
      e > 0.5 && this.lastTriggerValue <= 0.5 && (t = Math.floor(Math.random() * this.params.channels)), this.lastTriggerValue = e;
    }
    t !== this.currentChannel && this.crossfadeTo(t);
  }
  crossfadeTo(t) {
    const e = this.context.currentTime, i = this.params.smooth / 1e3;
    this.inputGains[this.currentChannel].gain.setTargetAtTime(0, e, i / 3), this.inputGains[t].gain.setTargetAtTime(1, e, i / 3), this.currentChannel = t;
  }
  // Get specific input channel
  getInput(t) {
    return t >= 1 && t <= 4 ? this.inputs[t - 1] : null;
  }
  // Get CV input
  getCVInput() {
    return this.hasCVInput = !0, this.cvInput;
  }
  // Get trigger input (for sequential/random modes)
  getTriggerInput() {
    return this.triggerInput;
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputs[0];
  }
  getModulationTarget(t) {
    return t === "position_mod" ? this.cvInput.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "channels":
        this.params.channels = Math.max(2, Math.min(4, e));
        break;
      case "mode":
        this.params.mode = e;
        break;
      case "position":
        this.params.position = Math.max(0, Math.min(1, e));
        break;
      case "smooth":
        this.params.smooth = Math.max(0, Math.min(500, e));
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  getCurrentChannel() {
    return this.currentChannel;
  }
  dispose() {
    this.checkInterval !== null && window.clearInterval(this.checkInterval), this.inputs.forEach((t) => t.disconnect()), this.inputGains.forEach((t) => t.disconnect()), this.cvInput.disconnect(), this.cvAnalyser.disconnect(), this.triggerInput.disconnect(), this.triggerAnalyser.disconnect(), this.outputGain.disconnect();
  }
}
const re = {
  position: 0.5,
  curve: "equal_power"
};
class L {
  id;
  type = "crossfader";
  context;
  params;
  // Input A
  inputA;
  gainA;
  // Input B
  inputB;
  gainB;
  // CV control input
  cvInput;
  cvAnalyser;
  cvData;
  hasCVInput = !1;
  checkInterval = null;
  // Output
  outputGain;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...re, ...i }, this.inputA = t.createGain(), this.inputA.gain.value = 1, this.gainA = t.createGain(), this.inputA.connect(this.gainA), this.inputB = t.createGain(), this.inputB.gain.value = 1, this.gainB = t.createGain(), this.inputB.connect(this.gainB), this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.gainA.connect(this.outputGain), this.gainB.connect(this.outputGain), this.cvInput = t.createGain(), this.cvInput.gain.value = 1, this.cvAnalyser = t.createAnalyser(), this.cvAnalyser.fftSize = 256, this.cvData = new Float32Array(this.cvAnalyser.fftSize), this.cvInput.connect(this.cvAnalyser), this.updateGains(this.params.position), this.startMonitoring();
  }
  startMonitoring() {
    this.checkInterval = window.setInterval(() => {
      if (this.hasCVInput) {
        this.cvAnalyser.getFloatTimeDomainData(this.cvData);
        let t = 0;
        for (let i = 0; i < this.cvData.length; i++)
          t += this.cvData[i];
        const e = Math.max(0, Math.min(1, t / this.cvData.length));
        this.updateGains(e);
      }
    }, 10);
  }
  updateGains(t) {
    const e = this.context.currentTime;
    let i, s;
    switch (this.params.curve) {
      case "linear":
        i = 1 - t, s = t;
        break;
      case "equal_power":
        i = Math.cos(t * Math.PI / 2), s = Math.sin(t * Math.PI / 2);
        break;
      case "constant_power":
        i = Math.sqrt(1 - t), s = Math.sqrt(t);
        break;
      default:
        i = 1 - t, s = t;
    }
    this.gainA.gain.setTargetAtTime(i, e, 0.01), this.gainB.gain.setTargetAtTime(s, e, 0.01);
  }
  // Get input A
  getInputA() {
    return this.inputA;
  }
  // Get input B
  getInputB() {
    return this.inputB;
  }
  // Get CV input
  getCVInput() {
    return this.hasCVInput = !0, this.cvInput;
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputA;
  }
  getModulationTarget(t) {
    return t === "position_mod" ? (this.hasCVInput = !0, this.cvInput.gain) : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "position":
        this.params.position = Math.max(0, Math.min(1, e)), this.hasCVInput || this.updateGains(this.params.position);
        break;
      case "curve":
        this.params.curve = e, this.updateGains(this.params.position);
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.checkInterval !== null && window.clearInterval(this.checkInterval), this.inputA.disconnect(), this.inputB.disconnect(), this.gainA.disconnect(), this.gainB.disconnect(), this.cvInput.disconnect(), this.cvAnalyser.disconnect(), this.outputGain.disconnect();
  }
}
const oe = {
  scenes: 4,
  stepsPerScene: 16,
  mode: "forward",
  loop: !0
};
class x {
  id;
  type = "sequencechain";
  context;
  params;
  // State
  currentScene = 0;
  currentStep = 0;
  direction = 1;
  // For pingpong
  // Clock input
  clockInput;
  clockAnalyser;
  clockData;
  lastClockValue = 0;
  // Reset input
  resetInput;
  resetAnalyser;
  resetData;
  lastResetValue = 0;
  // Scene CV output (0-1 representing current scene)
  sceneSource;
  sceneGain;
  // Scene trigger output (pulse on scene change)
  triggerGain;
  // Individual scene gate outputs (high when that scene is active)
  sceneGates;
  checkInterval = null;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...oe, ...i }, this.clockInput = t.createGain(), this.clockInput.gain.value = 1, this.clockAnalyser = t.createAnalyser(), this.clockAnalyser.fftSize = 256, this.clockData = new Float32Array(this.clockAnalyser.fftSize), this.clockInput.connect(this.clockAnalyser), this.resetInput = t.createGain(), this.resetInput.gain.value = 1, this.resetAnalyser = t.createAnalyser(), this.resetAnalyser.fftSize = 256, this.resetData = new Float32Array(this.resetAnalyser.fftSize), this.resetInput.connect(this.resetAnalyser), this.sceneSource = t.createConstantSource(), this.sceneSource.offset.value = 1, this.sceneGain = t.createGain(), this.sceneGain.gain.value = 0, this.sceneSource.connect(this.sceneGain), this.sceneSource.start(), this.triggerGain = t.createGain(), this.triggerGain.gain.value = 0, this.sceneGates = [];
    for (let s = 0; s < 8; s++) {
      const a = t.createGain();
      a.gain.value = s === 0 ? 1 : 0, this.sceneSource.connect(a), this.sceneGates.push(a);
    }
    this.updateSceneOutput(), this.startMonitoring();
  }
  startMonitoring() {
    this.checkInterval = window.setInterval(() => {
      this.checkClock(), this.checkReset();
    }, 5);
  }
  checkClock() {
    this.clockAnalyser.getFloatTimeDomainData(this.clockData);
    let t = 0;
    for (let e = 0; e < this.clockData.length; e++)
      this.clockData[e] > t && (t = this.clockData[e]);
    t > 0.5 && this.lastClockValue <= 0.5 && this.onClockPulse(), this.lastClockValue = t;
  }
  checkReset() {
    this.resetAnalyser.getFloatTimeDomainData(this.resetData);
    let t = 0;
    for (let e = 0; e < this.resetData.length; e++)
      this.resetData[e] > t && (t = this.resetData[e]);
    t > 0.5 && this.lastResetValue <= 0.5 && this.reset(), this.lastResetValue = t;
  }
  onClockPulse() {
    this.currentStep++, this.currentStep >= this.params.stepsPerScene && (this.currentStep = 0, this.advanceScene());
  }
  advanceScene() {
    const t = this.currentScene;
    switch (this.params.mode) {
      case "forward":
        this.currentScene++, this.currentScene >= this.params.scenes && (this.currentScene = this.params.loop ? 0 : this.params.scenes - 1);
        break;
      case "reverse":
        this.currentScene--, this.currentScene < 0 && (this.currentScene = this.params.loop ? this.params.scenes - 1 : 0);
        break;
      case "pingpong":
        this.currentScene += this.direction, this.currentScene >= this.params.scenes - 1 ? (this.currentScene = this.params.scenes - 1, this.direction = -1) : this.currentScene <= 0 && (this.currentScene = 0, this.direction = 1);
        break;
      case "random":
        this.currentScene = Math.floor(Math.random() * this.params.scenes);
        break;
    }
    this.currentScene !== t && (this.updateSceneOutput(), this.fireTrigger());
  }
  updateSceneOutput() {
    const t = this.context.currentTime, e = this.currentScene / Math.max(1, this.params.scenes - 1);
    this.sceneGain.gain.setValueAtTime(e, t);
    for (let i = 0; i < this.sceneGates.length; i++)
      this.sceneGates[i].gain.setValueAtTime(i === this.currentScene ? 1 : 0, t);
  }
  fireTrigger() {
    const t = this.context.currentTime;
    this.triggerGain.gain.setValueAtTime(1, t), this.triggerGain.gain.setValueAtTime(0, t + 0.01);
  }
  reset() {
    this.currentScene = this.params.mode === "reverse" ? this.params.scenes - 1 : 0, this.currentStep = 0, this.direction = 1, this.updateSceneOutput();
  }
  // Get clock input
  getClockInput() {
    return this.clockInput;
  }
  // Get reset input
  getResetInput() {
    return this.resetInput;
  }
  // Get scene trigger output
  getTriggerOutput() {
    return this.triggerGain;
  }
  // Get specific scene gate (1-8)
  getSceneGate(t) {
    return t >= 1 && t <= 8 ? this.sceneGates[t - 1] : null;
  }
  getOutputNode() {
    return this.sceneGain;
  }
  getInputNode() {
    return this.clockInput;
  }
  getModulationTarget(t) {
    return null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.sceneGain.connect(e);
    } else
      this.sceneGain.connect(t);
  }
  disconnect() {
    this.sceneGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "scenes":
        this.params.scenes = Math.max(2, Math.min(8, e)), this.currentScene >= this.params.scenes && (this.currentScene = this.params.scenes - 1), this.updateSceneOutput();
        break;
      case "stepsPerScene":
        this.params.stepsPerScene = Math.max(1, Math.min(64, e));
        break;
      case "mode":
        this.params.mode = e;
        break;
      case "loop":
        this.params.loop = e === "true" || e === 1 || e === "1";
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  getCurrentScene() {
    return this.currentScene;
  }
  getCurrentStep() {
    return this.currentStep;
  }
  dispose() {
    this.checkInterval !== null && window.clearInterval(this.checkInterval), this.clockInput.disconnect(), this.clockAnalyser.disconnect(), this.resetInput.disconnect(), this.resetAnalyser.disconnect(), this.sceneSource.stop(), this.sceneSource.disconnect(), this.sceneGain.disconnect(), this.triggerGain.disconnect(), this.sceneGates.forEach((t) => t.disconnect());
  }
}
const he = {
  gain: 1,
  monitoring: !1,
  source: "microphone"
};
class ce {
  id;
  type = "audioinput";
  context;
  params;
  inputGain;
  outputGain;
  monitorGain;
  mediaStream = null;
  sourceNode = null;
  externalSourceConnected = !1;
  isActive = !1;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...he, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = this.params.gain, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.monitorGain = t.createGain(), this.monitorGain.gain.value = this.params.monitoring ? 1 : 0, this.inputGain.connect(this.outputGain), this.inputGain.connect(this.monitorGain), this.monitorGain.connect(t.destination);
  }
  // Request microphone access and start capturing
  async startMicrophone() {
    if (!(this.isActive && this.params.source === "microphone"))
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: !1,
            noiseSuppression: !1,
            autoGainControl: !1
          }
        }), this.sourceNode = this.context.createMediaStreamSource(this.mediaStream), this.sourceNode.connect(this.inputGain), this.isActive = !0;
      } catch (t) {
        console.error("AudioInputNode: Failed to get microphone access", t);
      }
  }
  // Connect an external MediaStream (e.g., from ElevenLabs, WebRTC, screen capture)
  connectStream(t) {
    this.stopCapture(), this.mediaStream = t, this.sourceNode = this.context.createMediaStreamSource(t), this.sourceNode.connect(this.inputGain), this.isActive = !0, this.externalSourceConnected = !0;
  }
  // Connect an existing AudioNode directly (e.g., MediaElementSource)
  connectAudioNode(t) {
    t.connect(this.inputGain), this.externalSourceConnected = !0, this.isActive = !0;
  }
  // Stop all capture
  stopCapture() {
    this.sourceNode && (this.sourceNode.disconnect(), this.sourceNode = null), this.mediaStream && !this.externalSourceConnected && this.mediaStream.getTracks().forEach((t) => t.stop()), this.mediaStream = null, this.isActive = !1, this.externalSourceConnected = !1;
  }
  isCapturing() {
    return this.isActive;
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return t === "gain_mod" ? this.inputGain.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "gain":
        this.params.gain = Math.max(0, Math.min(2, e)), this.inputGain.gain.setTargetAtTime(this.params.gain, this.context.currentTime, 0.01);
        break;
      case "monitoring":
        this.params.monitoring = e, this.monitorGain.gain.setTargetAtTime(
          this.params.monitoring ? 1 : 0,
          this.context.currentTime,
          0.01
        );
        break;
      case "source":
        this.params.source = e;
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.stopCapture(), this.inputGain.disconnect(), this.outputGain.disconnect(), this.monitorGain.disconnect();
  }
}
const ue = {
  semitones: 0,
  cents: 0,
  grainSize: 2048,
  mix: 1
};
let $ = !1, w = null;
async function le(r) {
  if (!$) {
    if (w) return w;
    w = r.audioWorklet.addModule("/worklets/pitch-shifter-processor.js");
    try {
      await w, $ = !0;
    } catch (t) {
      throw w = null, t;
    }
  }
}
class pe {
  id;
  type = "pitchshifter";
  context;
  params;
  inputGain;
  outputGain;
  dryGain;
  wetGain;
  workletNode = null;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...ue, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.inputGain.connect(this.dryGain), this.dryGain.connect(this.outputGain), this.updateMix(), this.initWorklet();
  }
  async initWorklet() {
    try {
      await le(this.context), this.workletNode = new AudioWorkletNode(this.context, "pitch-shifter-processor"), this.inputGain.connect(this.workletNode), this.workletNode.connect(this.wetGain), this.wetGain.connect(this.outputGain), this.sendPitchToWorklet(), this.workletNode.port.postMessage({ type: "setParam", name: "grainSize", value: this.params.grainSize }), this.workletNode.port.postMessage({ type: "setParam", name: "mix", value: 1 });
    } catch (t) {
      console.error("PitchShifterNode: Failed to init worklet", t);
    }
  }
  semitonesToRatio(t, e) {
    return Math.pow(2, (t * 100 + e) / 1200);
  }
  sendPitchToWorklet() {
    if (!this.workletNode) return;
    const t = this.semitonesToRatio(this.params.semitones, this.params.cents);
    this.workletNode.port.postMessage({ type: "setParam", name: "pitch", value: t });
  }
  updateMix() {
    const t = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, t, 0.01), this.wetGain.gain.setTargetAtTime(this.params.mix, t, 0.01);
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return t === "mix_mod" ? this.wetGain.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "semitones":
        this.params.semitones = Math.max(-24, Math.min(24, e)), this.sendPitchToWorklet();
        break;
      case "cents":
        this.params.cents = Math.max(-100, Math.min(100, e)), this.sendPitchToWorklet();
        break;
      case "grainSize":
        this.params.grainSize = Math.max(256, Math.min(8192, e)), this.workletNode && this.workletNode.port.postMessage({ type: "setParam", name: "grainSize", value: this.params.grainSize });
        break;
      case "mix":
        this.params.mix = Math.max(0, Math.min(1, e)), this.updateMix();
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.workletNode && this.workletNode.disconnect(), this.inputGain.disconnect(), this.outputGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect();
  }
}
const de = {
  shift: 0,
  mix: 1,
  bandwidth: 8,
  vowel: "auto"
}, me = [500, 1500, 2500, 3500, 4500], U = {
  a: [730, 1090, 2440, 3500, 4500],
  e: [530, 1840, 2480, 3500, 4500],
  i: [270, 2290, 3010, 3500, 4500],
  o: [570, 840, 2410, 3500, 4500],
  u: [300, 870, 2240, 3500, 4500]
}, W = 5;
class ge {
  id;
  type = "formantshifter";
  context;
  params;
  inputGain;
  outputGain;
  dryGain;
  wetGain;
  // Analysis filters (extract formant energy from input)
  analysisFilters;
  // Synthesis filters (place formant energy at shifted frequencies)
  synthesisFilters;
  // Per-band gain nodes for matching energy
  bandGains;
  // Wet summing bus
  wetSum;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...de, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.wetSum = t.createGain(), this.wetSum.gain.value = 1, this.analysisFilters = [], this.synthesisFilters = [], this.bandGains = [];
    const s = this.getFormantFrequencies();
    for (let a = 0; a < W; a++) {
      const n = t.createBiquadFilter();
      n.type = "bandpass", n.frequency.value = s[a], n.Q.value = this.params.bandwidth, this.analysisFilters.push(n);
      const o = t.createGain();
      o.gain.value = 1, this.bandGains.push(o);
      const h = t.createBiquadFilter();
      h.type = "bandpass", h.frequency.value = this.shiftFrequency(s[a]), h.Q.value = this.params.bandwidth, this.synthesisFilters.push(h), this.inputGain.connect(n), n.connect(o), o.connect(h), h.connect(this.wetSum);
    }
    this.inputGain.connect(this.dryGain), this.dryGain.connect(this.outputGain), this.wetSum.connect(this.wetGain), this.wetGain.connect(this.outputGain), this.updateMix();
  }
  getFormantFrequencies() {
    return this.params.vowel !== "auto" && U[this.params.vowel] ? U[this.params.vowel] : me;
  }
  shiftFrequency(t) {
    const e = Math.pow(2, this.params.shift / 12);
    return Math.max(20, Math.min(2e4, t * e));
  }
  updateFilters() {
    const t = this.getFormantFrequencies(), e = this.context.currentTime;
    for (let i = 0; i < W; i++)
      this.analysisFilters[i].frequency.setTargetAtTime(t[i], e, 0.02), this.analysisFilters[i].Q.setTargetAtTime(this.params.bandwidth, e, 0.02), this.synthesisFilters[i].frequency.setTargetAtTime(
        this.shiftFrequency(t[i]),
        e,
        0.02
      ), this.synthesisFilters[i].Q.setTargetAtTime(this.params.bandwidth, e, 0.02);
  }
  updateMix() {
    const t = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, t, 0.01), this.wetGain.gain.setTargetAtTime(this.params.mix, t, 0.01);
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return t === "mix_mod" ? this.wetGain.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "shift":
        this.params.shift = Math.max(-12, Math.min(12, e)), this.updateFilters();
        break;
      case "mix":
        this.params.mix = Math.max(0, Math.min(1, e)), this.updateMix();
        break;
      case "bandwidth":
        this.params.bandwidth = Math.max(1, Math.min(20, e)), this.updateFilters();
        break;
      case "vowel":
        this.params.vowel = e, this.updateFilters();
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.analysisFilters.forEach((t) => t.disconnect()), this.synthesisFilters.forEach((t) => t.disconnect()), this.bandGains.forEach((t) => t.disconnect()), this.inputGain.disconnect(), this.outputGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect(), this.wetSum.disconnect();
  }
}
const fe = {
  decay: 4,
  shimmer: 0.5,
  pitchShift: 12,
  damping: 0.3,
  mix: 0.5,
  diffusion: 0.7
}, Ge = 4;
class Q {
  id;
  type = "shimmerreverb";
  context;
  params;
  inputGain;
  outputGain;
  dryGain;
  wetGain;
  // Main reverb (convolution)
  convolver;
  // Shimmer feedback path: reverb output → pitch shift → feedback → reverb input
  shimmerGain;
  // Controls shimmer amount
  shimmerDelay;
  // Small delay to prevent instantaneous feedback
  shimmerFilter;
  // Damping filter in feedback loop
  // Diffusion network (allpass chain for early reflections)
  diffusionFilters;
  diffusionGain;
  // Simple pitch shifting via playback rate trick (detune delay lines)
  // Using two detuned delay lines for a chorus-like pitch shift in the feedback
  pitchDelay1;
  pitchDelay2;
  pitchLFO1;
  pitchLFO2;
  pitchLFOGain1;
  pitchLFOGain2;
  pitchSum;
  // Pre-delay for reverb
  preDelay;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...fe, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.preDelay = t.createDelay(0.5), this.preDelay.delayTime.value = 0.02, this.diffusionFilters = [], this.diffusionGain = t.createGain(), this.diffusionGain.gain.value = this.params.diffusion;
    let s = this.preDelay;
    for (let a = 0; a < Ge; a++) {
      const n = t.createBiquadFilter();
      n.type = "allpass", n.frequency.value = 1e3 + a * 500, n.Q.value = 0.5, this.diffusionFilters.push(n), s.connect(n), s = n;
    }
    this.convolver = t.createConvolver(), this.generateImpulseResponse(), s.connect(this.convolver), this.shimmerGain = t.createGain(), this.shimmerGain.gain.value = this.params.shimmer * 0.7, this.shimmerDelay = t.createDelay(0.5), this.shimmerDelay.delayTime.value = 0.05, this.shimmerFilter = t.createBiquadFilter(), this.shimmerFilter.type = "lowpass", this.shimmerFilter.frequency.value = this.getDampingFrequency(), this.shimmerFilter.Q.value = 0.5, this.pitchDelay1 = t.createDelay(0.5), this.pitchDelay1.delayTime.value = 0.01, this.pitchDelay2 = t.createDelay(0.5), this.pitchDelay2.delayTime.value = 0.02, this.pitchLFO1 = t.createOscillator(), this.pitchLFO1.frequency.value = this.getPitchLFORate(), this.pitchLFO1.type = "sine", this.pitchLFO2 = t.createOscillator(), this.pitchLFO2.frequency.value = this.getPitchLFORate() * 1.1, this.pitchLFO2.type = "sine", this.pitchLFOGain1 = t.createGain(), this.pitchLFOGain1.gain.value = this.getPitchLFODepth(), this.pitchLFOGain2 = t.createGain(), this.pitchLFOGain2.gain.value = this.getPitchLFODepth(), this.pitchLFO1.connect(this.pitchLFOGain1), this.pitchLFOGain1.connect(this.pitchDelay1.delayTime), this.pitchLFO2.connect(this.pitchLFOGain2), this.pitchLFOGain2.connect(this.pitchDelay2.delayTime), this.pitchSum = t.createGain(), this.pitchSum.gain.value = 0.5, this.pitchLFO1.start(), this.pitchLFO2.start(), this.convolver.connect(this.shimmerGain), this.shimmerGain.connect(this.shimmerFilter), this.shimmerFilter.connect(this.pitchDelay1), this.shimmerFilter.connect(this.pitchDelay2), this.pitchDelay1.connect(this.pitchSum), this.pitchDelay2.connect(this.pitchSum), this.pitchSum.connect(this.shimmerDelay), this.shimmerDelay.connect(this.preDelay), this.inputGain.connect(this.dryGain), this.dryGain.connect(this.outputGain), this.inputGain.connect(this.preDelay), this.convolver.connect(this.wetGain), this.wetGain.connect(this.outputGain), this.updateMix();
  }
  generateImpulseResponse() {
    const t = this.context.sampleRate, e = Math.floor(t * Math.min(this.params.decay, 8)), i = this.context.createBuffer(2, e, t);
    for (let s = 0; s < 2; s++) {
      const a = i.getChannelData(s);
      for (let n = 0; n < e; n++) {
        const o = n / e, h = Math.pow(1 - o, 1.5 + this.params.damping);
        let c = 0;
        const u = Math.floor(t * 0.1);
        n < u && n % Math.floor(t * 7e-3) < 4 && (c = (Math.random() - 0.5) * 0.3), a[n] = ((Math.random() * 2 - 1) * h + c) * 0.5;
      }
    }
    this.convolver.buffer = i;
  }
  getDampingFrequency() {
    return 2e4 * Math.pow(0.04, this.params.damping);
  }
  getPitchLFORate() {
    return 0.5 + Math.abs(this.params.pitchShift) * 0.2;
  }
  getPitchLFODepth() {
    return 1e-3 + Math.abs(this.params.pitchShift) / 12 * 8e-3;
  }
  updateMix() {
    const t = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, t, 0.01), this.wetGain.gain.setTargetAtTime(this.params.mix, t, 0.01);
  }
  // Clear the reverb tail
  clear() {
    this.wetGain.gain.setTargetAtTime(0, this.context.currentTime, 0.05), this.shimmerGain.gain.setTargetAtTime(0, this.context.currentTime, 0.05), setTimeout(() => {
      this.shimmerGain.gain.setTargetAtTime(
        this.params.shimmer * 0.7,
        this.context.currentTime,
        0.01
      ), this.params.mix > 0 && this.wetGain.gain.setTargetAtTime(this.params.mix, this.context.currentTime, 0.01);
    }, 300);
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    switch (t) {
      case "shimmer_mod":
        return this.shimmerGain.gain;
      case "mix_mod":
        return this.wetGain.gain;
      case "damping_mod":
        return this.shimmerFilter.frequency;
      default:
        return null;
    }
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    const i = this.context.currentTime;
    switch (t) {
      case "decay":
        this.params.decay = Math.max(0.5, Math.min(15, e)), this.generateImpulseResponse();
        break;
      case "shimmer":
        this.params.shimmer = Math.max(0, Math.min(1, e)), this.shimmerGain.gain.setTargetAtTime(this.params.shimmer * 0.7, i, 0.02);
        break;
      case "pitchShift":
        this.params.pitchShift = Math.max(-24, Math.min(24, e)), this.pitchLFO1.frequency.setTargetAtTime(this.getPitchLFORate(), i, 0.02), this.pitchLFO2.frequency.setTargetAtTime(this.getPitchLFORate() * 1.1, i, 0.02), this.pitchLFOGain1.gain.setTargetAtTime(this.getPitchLFODepth(), i, 0.02), this.pitchLFOGain2.gain.setTargetAtTime(this.getPitchLFODepth(), i, 0.02);
        break;
      case "damping":
        this.params.damping = Math.max(0, Math.min(1, e)), this.shimmerFilter.frequency.setTargetAtTime(this.getDampingFrequency(), i, 0.02), this.generateImpulseResponse();
        break;
      case "mix":
        this.params.mix = Math.max(0, Math.min(1, e)), this.updateMix();
        break;
      case "diffusion":
        this.params.diffusion = Math.max(0, Math.min(1, e)), this.diffusionGain.gain.setTargetAtTime(this.params.diffusion, i, 0.02);
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.pitchLFO1.stop(), this.pitchLFO2.stop(), this.inputGain.disconnect(), this.outputGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect(), this.preDelay.disconnect(), this.convolver.disconnect(), this.shimmerGain.disconnect(), this.shimmerDelay.disconnect(), this.shimmerFilter.disconnect(), this.pitchDelay1.disconnect(), this.pitchDelay2.disconnect(), this.pitchLFO1.disconnect(), this.pitchLFO2.disconnect(), this.pitchLFOGain1.disconnect(), this.pitchLFOGain2.disconnect(), this.pitchSum.disconnect(), this.diffusionGain.disconnect(), this.diffusionFilters.forEach((t) => t.disconnect());
  }
}
const ye = {
  rate: 1.5,
  depth: 0.5,
  voices: 3,
  spread: 0.5,
  mix: 0.5,
  feedback: 0
}, T = 6, ke = 7e-3, we = 0.015;
class Te {
  id;
  type = "chorus";
  context;
  params;
  inputGain;
  outputGain;
  dryGain;
  wetGain;
  // Per-voice: delay, LFO, LFO gain, feedback
  delays;
  lfos;
  lfoGains;
  voiceGains;
  feedbackGains;
  wetSum;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...ye, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.wetSum = t.createGain(), this.wetSum.gain.value = 1, this.delays = [], this.lfos = [], this.lfoGains = [], this.voiceGains = [], this.feedbackGains = [];
    for (let s = 0; s < T; s++) {
      const a = t.createDelay(0.1);
      a.delayTime.value = ke + s * we / T;
      const n = t.createOscillator();
      n.type = "sine", n.frequency.value = this.params.rate * (1 + s * 0.12);
      const o = t.createGain();
      o.gain.value = this.getDepthInSeconds();
      const h = t.createGain();
      h.gain.value = s < this.params.voices ? 1 / this.params.voices : 0;
      const c = t.createGain();
      c.gain.value = this.params.feedback, n.connect(o), o.connect(a.delayTime), this.inputGain.connect(a), a.connect(h), h.connect(this.wetSum), a.connect(c), c.connect(a), n.start(), this.delays.push(a), this.lfos.push(n), this.lfoGains.push(o), this.voiceGains.push(h), this.feedbackGains.push(c);
    }
    this.inputGain.connect(this.dryGain), this.dryGain.connect(this.outputGain), this.wetSum.connect(this.wetGain), this.wetGain.connect(this.outputGain), this.updateMix();
  }
  getDepthInSeconds() {
    return this.params.depth * 3e-3;
  }
  updateVoiceGains() {
    const t = this.context.currentTime, e = Math.floor(this.params.voices), i = e > 0 ? 1 / e : 0;
    for (let s = 0; s < T; s++) {
      const a = s < e ? i : 0;
      this.voiceGains[s].gain.setTargetAtTime(a, t, 0.02);
    }
  }
  updateMix() {
    const t = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, t, 0.01), this.wetGain.gain.setTargetAtTime(this.params.mix, t, 0.01);
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    switch (t) {
      case "rate_mod":
        return this.lfos[0]?.frequency ?? null;
      case "depth_mod":
        return this.lfoGains[0]?.gain ?? null;
      case "mix_mod":
        return this.wetGain.gain;
      default:
        return null;
    }
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    const i = this.context.currentTime;
    switch (t) {
      case "rate":
        this.params.rate = Math.max(0.1, Math.min(10, e));
        for (let s = 0; s < T; s++)
          this.lfos[s].frequency.setTargetAtTime(
            this.params.rate * (1 + s * 0.12),
            i,
            0.02
          );
        break;
      case "depth":
        this.params.depth = Math.max(0, Math.min(1, e));
        for (const s of this.lfoGains)
          s.gain.setTargetAtTime(this.getDepthInSeconds(), i, 0.02);
        break;
      case "voices":
        this.params.voices = Math.max(2, Math.min(T, Math.floor(e))), this.updateVoiceGains();
        break;
      case "spread":
        this.params.spread = Math.max(0, Math.min(1, e));
        break;
      case "mix":
        this.params.mix = Math.max(0, Math.min(1, e)), this.updateMix();
        break;
      case "feedback":
        this.params.feedback = Math.max(0, Math.min(0.8, e));
        for (const s of this.feedbackGains)
          s.gain.setTargetAtTime(this.params.feedback, i, 0.02);
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    for (const t of this.lfos) t.stop();
    for (const t of this.delays) t.disconnect();
    for (const t of this.lfos) t.disconnect();
    for (const t of this.lfoGains) t.disconnect();
    for (const t of this.voiceGains) t.disconnect();
    for (const t of this.feedbackGains) t.disconnect();
    this.inputGain.disconnect(), this.outputGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect(), this.wetSum.disconnect();
  }
}
const ve = {
  threshold: -24,
  ratio: 4,
  attack: 3e-3,
  release: 0.25,
  knee: 10,
  makeupGain: 0,
  mix: 1
};
class H {
  id;
  type = "compressor";
  context;
  params;
  inputGain;
  outputGain;
  dryGain;
  wetGain;
  compressor;
  makeupGainNode;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...ve, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.compressor = t.createDynamicsCompressor(), this.compressor.threshold.value = this.params.threshold, this.compressor.ratio.value = this.params.ratio, this.compressor.attack.value = this.params.attack, this.compressor.release.value = this.params.release, this.compressor.knee.value = this.params.knee, this.makeupGainNode = t.createGain(), this.makeupGainNode.gain.value = Math.pow(10, this.params.makeupGain / 20), this.inputGain.connect(this.dryGain), this.dryGain.connect(this.outputGain), this.inputGain.connect(this.compressor), this.compressor.connect(this.makeupGainNode), this.makeupGainNode.connect(this.wetGain), this.wetGain.connect(this.outputGain), this.updateMix();
  }
  updateMix() {
    const t = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, t, 0.01), this.wetGain.gain.setTargetAtTime(this.params.mix, t, 0.01);
  }
  // Get current gain reduction in dB (useful for metering)
  getReduction() {
    return this.compressor.reduction;
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  // Sidechain input — feed an external signal to control the compressor
  getSidechainInput() {
    return this.compressor;
  }
  getModulationTarget(t) {
    switch (t) {
      case "threshold_mod":
        return this.compressor.threshold;
      case "ratio_mod":
        return this.compressor.ratio;
      case "mix_mod":
        return this.wetGain.gain;
      default:
        return null;
    }
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    const i = this.context.currentTime;
    switch (t) {
      case "threshold":
        this.params.threshold = Math.max(-60, Math.min(0, e)), this.compressor.threshold.setTargetAtTime(this.params.threshold, i, 0.01);
        break;
      case "ratio":
        this.params.ratio = Math.max(1, Math.min(20, e)), this.compressor.ratio.setTargetAtTime(this.params.ratio, i, 0.01);
        break;
      case "attack":
        this.params.attack = Math.max(1e-3, Math.min(1, e)), this.compressor.attack.setTargetAtTime(this.params.attack, i, 0.01);
        break;
      case "release":
        this.params.release = Math.max(0.01, Math.min(2, e)), this.compressor.release.setTargetAtTime(this.params.release, i, 0.01);
        break;
      case "knee":
        this.params.knee = Math.max(0, Math.min(40, e)), this.compressor.knee.setTargetAtTime(this.params.knee, i, 0.01);
        break;
      case "makeupGain":
        this.params.makeupGain = Math.max(0, Math.min(30, e)), this.makeupGainNode.gain.setTargetAtTime(
          Math.pow(10, this.params.makeupGain / 20),
          i,
          0.01
        );
        break;
      case "mix":
        this.params.mix = Math.max(0, Math.min(1, e)), this.updateMix();
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.inputGain.disconnect(), this.outputGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect(), this.compressor.disconnect(), this.makeupGainNode.disconnect();
  }
}
const Ae = {
  lowFreq: 100,
  lowGain: 0,
  midFreq: 1e3,
  midGain: 0,
  midQ: 1,
  highFreq: 8e3,
  highGain: 0
};
class Me {
  id;
  type = "eq";
  context;
  params;
  inputGain;
  outputGain;
  lowShelf;
  midPeak;
  highShelf;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Ae, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.lowShelf = t.createBiquadFilter(), this.lowShelf.type = "lowshelf", this.lowShelf.frequency.value = this.params.lowFreq, this.lowShelf.gain.value = this.params.lowGain, this.midPeak = t.createBiquadFilter(), this.midPeak.type = "peaking", this.midPeak.frequency.value = this.params.midFreq, this.midPeak.gain.value = this.params.midGain, this.midPeak.Q.value = this.params.midQ, this.highShelf = t.createBiquadFilter(), this.highShelf.type = "highshelf", this.highShelf.frequency.value = this.params.highFreq, this.highShelf.gain.value = this.params.highGain, this.inputGain.connect(this.lowShelf), this.lowShelf.connect(this.midPeak), this.midPeak.connect(this.highShelf), this.highShelf.connect(this.outputGain);
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    switch (t) {
      case "lowGain_mod":
        return this.lowShelf.gain;
      case "midFreq_mod":
        return this.midPeak.frequency;
      case "midGain_mod":
        return this.midPeak.gain;
      case "highGain_mod":
        return this.highShelf.gain;
      default:
        return null;
    }
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    const i = this.context.currentTime;
    switch (t) {
      case "lowFreq":
        this.params.lowFreq = Math.max(20, Math.min(500, e)), this.lowShelf.frequency.setTargetAtTime(this.params.lowFreq, i, 0.01);
        break;
      case "lowGain":
        this.params.lowGain = Math.max(-18, Math.min(18, e)), this.lowShelf.gain.setTargetAtTime(this.params.lowGain, i, 0.01);
        break;
      case "midFreq":
        this.params.midFreq = Math.max(200, Math.min(8e3, e)), this.midPeak.frequency.setTargetAtTime(this.params.midFreq, i, 0.01);
        break;
      case "midGain":
        this.params.midGain = Math.max(-18, Math.min(18, e)), this.midPeak.gain.setTargetAtTime(this.params.midGain, i, 0.01);
        break;
      case "midQ":
        this.params.midQ = Math.max(0.1, Math.min(10, e)), this.midPeak.Q.setTargetAtTime(this.params.midQ, i, 0.01);
        break;
      case "highFreq":
        this.params.highFreq = Math.max(2e3, Math.min(2e4, e)), this.highShelf.frequency.setTargetAtTime(this.params.highFreq, i, 0.01);
        break;
      case "highGain":
        this.params.highGain = Math.max(-18, Math.min(18, e)), this.highShelf.gain.setTargetAtTime(this.params.highGain, i, 0.01);
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.inputGain.disconnect(), this.outputGain.disconnect(), this.lowShelf.disconnect(), this.midPeak.disconnect(), this.highShelf.disconnect();
  }
}
const Se = {
  bits: 8,
  sampleRateReduction: 1,
  mix: 1
};
let j = !1, v = null;
async function be(r) {
  if (!j) {
    if (v) return v;
    v = r.audioWorklet.addModule("/worklets/bitcrusher-processor.js");
    try {
      await v, j = !0;
    } catch (t) {
      throw v = null, t;
    }
  }
}
class Ie {
  id;
  type = "bitcrusher";
  context;
  params;
  inputGain;
  outputGain;
  dryGain;
  wetGain;
  workletNode = null;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Se, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.inputGain.connect(this.dryGain), this.dryGain.connect(this.outputGain), this.updateMix(), this.initWorklet();
  }
  async initWorklet() {
    try {
      await be(this.context), this.workletNode = new AudioWorkletNode(this.context, "bitcrusher-processor"), this.inputGain.connect(this.workletNode), this.workletNode.connect(this.wetGain), this.wetGain.connect(this.outputGain), this.workletNode.port.postMessage({ type: "setParam", name: "bits", value: this.params.bits }), this.workletNode.port.postMessage({ type: "setParam", name: "sampleRateReduction", value: this.params.sampleRateReduction }), this.workletNode.port.postMessage({ type: "setParam", name: "mix", value: 1 });
    } catch (t) {
      console.error("BitcrusherNode: Failed to init worklet", t);
    }
  }
  updateMix() {
    const t = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, t, 0.01), this.wetGain.gain.setTargetAtTime(this.params.mix, t, 0.01);
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return t === "mix_mod" ? this.wetGain.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "bits":
        this.params.bits = Math.max(1, Math.min(16, e)), this.workletNode && this.workletNode.port.postMessage({ type: "setParam", name: "bits", value: this.params.bits });
        break;
      case "sampleRateReduction":
        this.params.sampleRateReduction = Math.max(1, Math.min(40, Math.floor(e))), this.workletNode && this.workletNode.port.postMessage({ type: "setParam", name: "sampleRateReduction", value: this.params.sampleRateReduction });
        break;
      case "mix":
        this.params.mix = Math.max(0, Math.min(1, e)), this.updateMix();
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.workletNode && this.workletNode.disconnect(), this.inputGain.disconnect(), this.outputGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect();
  }
}
const Ne = {
  bands: 16,
  attack: 5e-3,
  release: 0.02,
  shift: 0,
  mix: 1
};
let J = !1, A = null;
async function De(r) {
  if (!J) {
    if (A) return A;
    A = r.audioWorklet.addModule("/worklets/vocoder-processor.js");
    try {
      await A, J = !0;
    } catch (t) {
      throw A = null, t;
    }
  }
}
class K {
  id;
  type = "vocoder";
  context;
  params;
  // Modulator input (voice)
  modulatorInput;
  // Carrier input (synth)
  carrierInput;
  // Internal carrier: noise generator for when no external carrier is connected
  internalNoise = null;
  internalNoiseGain;
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  carrierConnected = !1;
  workletNode = null;
  outputGain;
  dryGain;
  wetGain;
  merger;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Ne, ...i }, this.modulatorInput = t.createGain(), this.modulatorInput.gain.value = 1, this.carrierInput = t.createGain(), this.carrierInput.gain.value = 1, this.internalNoiseGain = t.createGain(), this.internalNoiseGain.gain.value = 0.5, this.createInternalNoise(), this.merger = t.createChannelMerger(2), this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.modulatorInput.connect(this.dryGain), this.dryGain.connect(this.outputGain), this.wetGain.connect(this.outputGain), this.updateMix(), this.initWorklet();
  }
  createInternalNoise() {
    const t = this.context.sampleRate, e = t * 2, i = this.context.createBuffer(1, e, t), s = i.getChannelData(0);
    for (let a = 0; a < e; a++)
      s[a] = Math.random() * 2 - 1;
    this.internalNoise = this.context.createBufferSource(), this.internalNoise.buffer = i, this.internalNoise.loop = !0, this.internalNoise.connect(this.internalNoiseGain), this.internalNoise.start();
  }
  async initWorklet() {
    try {
      await De(this.context), this.workletNode = new AudioWorkletNode(this.context, "vocoder-processor", {
        numberOfInputs: 2,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      }), this.modulatorInput.connect(this.workletNode, 0, 0), this.carrierInput.connect(this.workletNode, 0, 1), this.internalNoiseGain.connect(this.workletNode, 0, 1), this.workletNode.connect(this.wetGain), this.sendAllParams();
    } catch (t) {
      console.error("VocoderNode: Failed to init worklet", t);
    }
  }
  sendAllParams() {
    this.workletNode && (this.workletNode.port.postMessage({ type: "setParam", name: "bands", value: this.params.bands }), this.workletNode.port.postMessage({ type: "setParam", name: "attack", value: this.params.attack }), this.workletNode.port.postMessage({ type: "setParam", name: "release", value: this.params.release }), this.workletNode.port.postMessage({ type: "setParam", name: "shift", value: this.params.shift }), this.workletNode.port.postMessage({ type: "setParam", name: "mix", value: 1 }));
  }
  updateMix() {
    const t = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, t, 0.01), this.wetGain.gain.setTargetAtTime(this.params.mix, t, 0.01);
  }
  // Get modulator input (voice goes here)
  getModulatorInput() {
    return this.modulatorInput;
  }
  // Get carrier input (synth/noise goes here)
  getCarrierInput() {
    return this.carrierConnected = !0, this.internalNoiseGain.gain.setTargetAtTime(0, this.context.currentTime, 0.01), this.carrierInput;
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.modulatorInput;
  }
  getModulationTarget(t) {
    return t === "mix_mod" ? this.wetGain.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "bands":
        this.params.bands = Math.max(4, Math.min(32, Math.floor(e)));
        break;
      case "attack":
        this.params.attack = Math.max(1e-3, Math.min(0.1, e));
        break;
      case "release":
        this.params.release = Math.max(5e-3, Math.min(0.5, e));
        break;
      case "shift":
        this.params.shift = Math.max(-8, Math.min(8, Math.round(e)));
        break;
      case "mix":
        this.params.mix = Math.max(0, Math.min(1, e)), this.updateMix();
        break;
    }
    this.workletNode && t !== "mix" && this.workletNode.port.postMessage({ type: "setParam", name: t, value: this.params[t] });
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.internalNoise && (this.internalNoise.stop(), this.internalNoise.disconnect()), this.workletNode && this.workletNode.disconnect(), this.modulatorInput.disconnect(), this.carrierInput.disconnect(), this.internalNoiseGain.disconnect(), this.merger.disconnect(), this.outputGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect();
  }
}
const Ce = {
  rate: 8,
  size: 0.05,
  pitch: 1,
  pitchRamp: 0,
  reverse: !1,
  probability: 1,
  mix: 1,
  active: !1
};
let Y = !1, M = null;
async function Pe(r) {
  if (!Y) {
    if (M) return M;
    M = r.audioWorklet.addModule("/worklets/glitch-processor.js");
    try {
      await M, Y = !0;
    } catch (t) {
      throw M = null, t;
    }
  }
}
class X {
  id;
  type = "glitch";
  context;
  params;
  inputGain;
  outputGain;
  workletNode = null;
  // Trigger input for external triggering (from clock, euclidean, etc.)
  triggerInput;
  triggerAnalyser;
  triggerData;
  lastTriggerValue = 0;
  triggerCheckInterval = null;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Ce, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.triggerInput = t.createGain(), this.triggerAnalyser = t.createAnalyser(), this.triggerAnalyser.fftSize = 256, this.triggerData = new Float32Array(256), this.triggerInput.connect(this.triggerAnalyser), this.initWorklet();
  }
  async initWorklet() {
    try {
      await Pe(this.context), this.workletNode = new AudioWorkletNode(this.context, "glitch-processor"), this.inputGain.connect(this.workletNode), this.workletNode.connect(this.outputGain), this.sendAllParams(), this.params.active && this.workletNode.port.postMessage({ type: "trigger" }), this.startTriggerMonitoring();
    } catch (t) {
      console.error("GlitchNode: Failed to init worklet", t), this.inputGain.connect(this.outputGain);
    }
  }
  sendAllParams() {
    if (!this.workletNode) return;
    const t = this.workletNode.port;
    t.postMessage({ type: "setParam", name: "rate", value: this.params.rate }), t.postMessage({ type: "setParam", name: "size", value: this.params.size }), t.postMessage({ type: "setParam", name: "pitch", value: this.params.pitch }), t.postMessage({ type: "setParam", name: "pitchRamp", value: this.params.pitchRamp }), t.postMessage({ type: "setParam", name: "reverse", value: this.params.reverse }), t.postMessage({ type: "setParam", name: "probability", value: this.params.probability }), t.postMessage({ type: "setParam", name: "mix", value: this.params.mix });
  }
  startTriggerMonitoring() {
    this.triggerCheckInterval = window.setInterval(() => {
      this.triggerAnalyser.getFloatTimeDomainData(this.triggerData);
      let t = 0;
      for (let e = 0; e < this.triggerData.length; e++)
        this.triggerData[e] > t && (t = this.triggerData[e]);
      t > 0.5 && this.lastTriggerValue <= 0.5 && this.trigger(), this.lastTriggerValue = t;
    }, 5);
  }
  // Manual trigger — capture buffer and start stuttering
  trigger() {
    this.params.active = !0, this.workletNode && this.workletNode.port.postMessage({ type: "trigger" });
  }
  // Stop stuttering, return to pass-through
  release() {
    this.params.active = !1, this.workletNode && this.workletNode.port.postMessage({ type: "release" });
  }
  // Toggle active state
  toggle() {
    this.params.active ? this.release() : this.trigger();
  }
  getTriggerInput() {
    return this.triggerInput;
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return t === "mix_mod" ? this.outputGain.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "rate":
        this.params.rate = Math.max(0.5, Math.min(50, e));
        break;
      case "size":
        this.params.size = Math.max(5e-3, Math.min(1, e));
        break;
      case "pitch":
        this.params.pitch = Math.max(0.25, Math.min(4, e));
        break;
      case "pitchRamp":
        this.params.pitchRamp = Math.max(-1, Math.min(1, e));
        break;
      case "reverse":
        this.params.reverse = e;
        break;
      case "probability":
        this.params.probability = Math.max(0, Math.min(1, e));
        break;
      case "mix":
        this.params.mix = Math.max(0, Math.min(1, e));
        break;
      case "active":
        e ? this.trigger() : this.release();
        return;
    }
    this.workletNode && this.workletNode.port.postMessage({
      type: "setParam",
      name: t,
      value: this.params[t]
    });
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.triggerCheckInterval !== null && window.clearInterval(this.triggerCheckInterval), this.workletNode && this.workletNode.disconnect(), this.inputGain.disconnect(), this.outputGain.disconnect(), this.triggerInput.disconnect(), this.triggerAnalyser.disconnect();
  }
}
const xe = {
  shiftHz: 0,
  mode: "up",
  mix: 1
}, Z = { up: 0, down: 1, both: 2 };
let tt = !1, S = null;
async function Fe(r) {
  if (!tt) {
    if (S) return S;
    S = r.audioWorklet.addModule("/worklets/freq-shifter-processor.js");
    try {
      await S, tt = !0;
    } catch (t) {
      throw S = null, t;
    }
  }
}
class Oe {
  id;
  type = "freqshifter";
  context;
  params;
  inputGain;
  outputGain;
  dryGain;
  wetGain;
  workletNode = null;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...xe, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.inputGain.connect(this.dryGain), this.dryGain.connect(this.outputGain), this.updateMix(), this.initWorklet();
  }
  async initWorklet() {
    try {
      await Fe(this.context), this.workletNode = new AudioWorkletNode(this.context, "freq-shifter-processor"), this.inputGain.connect(this.workletNode), this.workletNode.connect(this.wetGain), this.wetGain.connect(this.outputGain), this.workletNode.port.postMessage({ type: "setParam", name: "shiftHz", value: this.params.shiftHz }), this.workletNode.port.postMessage({ type: "setParam", name: "mode", value: Z[this.params.mode] }), this.workletNode.port.postMessage({ type: "setParam", name: "mix", value: 1 });
    } catch (t) {
      console.error("FreqShifterNode: Failed to init worklet", t), this.inputGain.connect(this.wetGain), this.wetGain.connect(this.outputGain);
    }
  }
  updateMix() {
    const t = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, t, 0.01), this.wetGain.gain.setTargetAtTime(this.params.mix, t, 0.01);
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    return t === "mix_mod" ? this.wetGain.gain : null;
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    switch (t) {
      case "shiftHz":
        this.params.shiftHz = Math.max(-1e3, Math.min(1e3, e)), this.workletNode && this.workletNode.port.postMessage({ type: "setParam", name: "shiftHz", value: this.params.shiftHz });
        break;
      case "mode":
        this.params.mode = e, this.workletNode && this.workletNode.port.postMessage({ type: "setParam", name: "mode", value: Z[this.params.mode] });
        break;
      case "mix":
        this.params.mix = Math.max(0, Math.min(1, e)), this.updateMix();
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.workletNode && this.workletNode.disconnect(), this.inputGain.disconnect(), this.outputGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect();
  }
}
const Ve = {
  frequency: 200,
  feedback: 0.8,
  damping: 0.3,
  mode: "feedback",
  mix: 0.5
};
class Re {
  id;
  type = "combfilter";
  context;
  params;
  inputGain;
  outputGain;
  dryGain;
  wetGain;
  // Feedback comb path
  fbDelay;
  fbGain;
  fbDamping;
  // Feedforward comb path
  ffDelay;
  ffGain;
  // Wet summing
  wetSum;
  constructor(t, e, i) {
    this.context = t, this.id = e, this.params = { ...Ve, ...i }, this.inputGain = t.createGain(), this.inputGain.gain.value = 1, this.outputGain = t.createGain(), this.outputGain.gain.value = 1, this.dryGain = t.createGain(), this.wetGain = t.createGain(), this.wetSum = t.createGain(), this.wetSum.gain.value = 1;
    const s = 1 / this.params.frequency;
    this.fbDelay = t.createDelay(0.1), this.fbDelay.delayTime.value = Math.min(0.1, s), this.fbGain = t.createGain(), this.fbGain.gain.value = this.params.feedback, this.fbDamping = t.createBiquadFilter(), this.fbDamping.type = "lowpass", this.fbDamping.frequency.value = this.getDampingFrequency(), this.fbDamping.Q.value = 0.5, this.inputGain.connect(this.fbDelay), this.fbDelay.connect(this.fbDamping), this.fbDamping.connect(this.fbGain), this.fbGain.connect(this.fbDelay), this.fbDelay.connect(this.wetSum), this.ffDelay = t.createDelay(0.1), this.ffDelay.delayTime.value = Math.min(0.1, s), this.ffGain = t.createGain(), this.ffGain.gain.value = this.params.feedback, this.inputGain.connect(this.ffDelay), this.ffDelay.connect(this.ffGain), this.ffGain.connect(this.wetSum), this.inputGain.connect(this.wetSum), this.inputGain.connect(this.dryGain), this.dryGain.connect(this.outputGain), this.wetSum.connect(this.wetGain), this.wetGain.connect(this.outputGain), this.updateMix(), this.updateMode();
  }
  getDampingFrequency() {
    return 2e4 * Math.pow(0.01, this.params.damping);
  }
  updateMode() {
    const t = this.context.currentTime;
    switch (this.params.mode) {
      case "feedback":
        this.fbGain.gain.setTargetAtTime(this.params.feedback, t, 0.01), this.ffGain.gain.setTargetAtTime(0, t, 0.01);
        break;
      case "feedforward":
        this.fbGain.gain.setTargetAtTime(0, t, 0.01), this.ffGain.gain.setTargetAtTime(this.params.feedback, t, 0.01);
        break;
      case "both":
        this.fbGain.gain.setTargetAtTime(this.params.feedback, t, 0.01), this.ffGain.gain.setTargetAtTime(this.params.feedback * 0.5, t, 0.01);
        break;
    }
  }
  updateMix() {
    const t = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(1 - this.params.mix, t, 0.01), this.wetGain.gain.setTargetAtTime(this.params.mix, t, 0.01);
  }
  getOutputNode() {
    return this.outputGain;
  }
  getInputNode() {
    return this.inputGain;
  }
  getModulationTarget(t) {
    switch (t) {
      case "frequency_mod":
        return this.fbDelay.delayTime;
      // Modulate delay time = modulate resonant freq
      case "feedback_mod":
        return this.fbGain.gain;
      case "mix_mod":
        return this.wetGain.gain;
      default:
        return null;
    }
  }
  connect(t) {
    if ("getInputNode" in t) {
      const e = t.getInputNode();
      e && this.outputGain.connect(e);
    } else
      this.outputGain.connect(t);
  }
  disconnect() {
    this.outputGain.disconnect();
  }
  setParam(t, e) {
    const i = this.context.currentTime;
    switch (t) {
      case "frequency": {
        this.params.frequency = Math.max(20, Math.min(5e3, e));
        const s = Math.min(0.1, 1 / this.params.frequency);
        this.fbDelay.delayTime.setTargetAtTime(s, i, 0.01), this.ffDelay.delayTime.setTargetAtTime(s, i, 0.01);
        break;
      }
      case "feedback":
        this.params.feedback = Math.max(-0.99, Math.min(0.99, e)), this.updateMode();
        break;
      case "damping":
        this.params.damping = Math.max(0, Math.min(1, e)), this.fbDamping.frequency.setTargetAtTime(this.getDampingFrequency(), i, 0.02);
        break;
      case "mode":
        this.params.mode = e, this.updateMode();
        break;
      case "mix":
        this.params.mix = Math.max(0, Math.min(1, e)), this.updateMix();
        break;
    }
  }
  getParams() {
    return { ...this.params };
  }
  dispose() {
    this.inputGain.disconnect(), this.outputGain.disconnect(), this.dryGain.disconnect(), this.wetGain.disconnect(), this.wetSum.disconnect(), this.fbDelay.disconnect(), this.fbGain.disconnect(), this.fbDamping.disconnect(), this.ffDelay.disconnect(), this.ffGain.disconnect();
  }
}
class qe {
  context = null;
  ownsContext = !1;
  masterGain = null;
  outputNode = null;
  nodes = /* @__PURE__ */ new Map();
  connections = [];
  currentPatch = null;
  options;
  events = {};
  initialized = !1;
  constructor(t) {
    this.options = {
      context: t?.context ?? void 0,
      masterVolume: t?.masterVolume ?? 0.7,
      autoConnect: t?.autoConnect ?? !0
    };
  }
  // --- Lifecycle ---
  async init() {
    return this.initialized && this.context ? (this.context.state === "suspended" && await this.context.resume(), this.context) : (this.options.context ? (this.context = this.options.context, this.ownsContext = !1) : (this.context = new AudioContext(), this.ownsContext = !0), this.context.state === "suspended" && await this.context.resume(), this.masterGain = this.context.createGain(), this.masterGain.gain.value = this.options.masterVolume, this.options.autoConnect && this.masterGain.connect(this.context.destination), this.outputNode = new Rt(this.context, "output", this.masterGain), this.nodes.set("output", this.outputNode), this.initialized = !0, this.context);
  }
  dispose() {
    this.clear(), this.masterGain && (this.masterGain.disconnect(), this.masterGain = null), this.ownsContext && this.context && this.context.close(), this.context = null, this.outputNode = null, this.initialized = !1;
  }
  // --- Event Handlers ---
  on(t) {
    Object.assign(this.events, t);
  }
  // --- Patch Loading ---
  loadPatch(t) {
    this.ensureInitialized(), this.clear(), this.currentPatch = JSON.parse(JSON.stringify(t));
    for (const e of t.nodes)
      e.id !== "output" && this.createNode(e.type, e.id, e.params);
    for (const e of t.connections)
      this.connectInternal(e);
    this.nodes.forEach((e) => {
      (e instanceof y || e instanceof N) && e.start();
    }), this.events.onPatchLoaded?.(t);
  }
  // Load patch from JSON string
  loadPatchJSON(t) {
    const e = JSON.parse(t);
    if (!e.version || !e.nodes)
      throw new Error("Invalid patch format");
    this.loadPatch(e);
  }
  // Export current state as Patch JSON
  toJSON() {
    if (!this.currentPatch)
      throw new Error("No patch loaded");
    const t = this.currentPatch.nodes.map((e) => {
      const i = this.nodes.get(e.id);
      return i ? { ...e, params: { ...i.getParams() } } : e;
    });
    return {
      ...this.currentPatch,
      nodes: t,
      connections: [...this.connections],
      meta: {
        ...this.currentPatch.meta,
        modified: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  toJSONString(t = !0) {
    return JSON.stringify(this.toJSON(), null, t ? 2 : void 0);
  }
  // --- Node Operations ---
  getNode(t) {
    return this.nodes.get(t);
  }
  getNodeTyped(t) {
    return this.nodes.get(t);
  }
  getAllNodes() {
    return new Map(this.nodes);
  }
  createNode(t, e, i) {
    this.ensureInitialized();
    const s = this.context;
    let a;
    switch (t) {
      case "oscillator":
        a = new y(s, e, i);
        break;
      case "filter":
        a = new at(s, e, i);
        break;
      case "vca":
        a = new rt(s, e, i);
        break;
      case "lfo":
        a = new N(s, e, i);
        break;
      case "adsr":
        a = new k(s, e, i);
        break;
      case "delay":
        a = new F(s, e, i);
        break;
      case "reverb":
        a = new O(s, e, i);
        break;
      case "mixer":
        a = new V(s, e, i);
        break;
      case "sequencer":
        a = new wt(s, e, i);
        break;
      case "attenuverter":
        a = new vt(s, e, i);
        break;
      case "noise":
        a = new Mt(s, e, i);
        break;
      case "samplehold":
        a = new q(s, e, i);
        break;
      case "wavefolder":
        a = new It(s, e, i);
        break;
      case "ringmod":
        a = new Dt(s, e, i);
        break;
      case "quantizer":
        a = new Pt(s, e, i);
        break;
      case "clock":
        a = new Ft(s, e, i);
        break;
      case "clockdiv":
        a = new E(s, e, i);
        break;
      case "smoothrandom":
        a = new _t(s, e, i);
        break;
      case "karplusstrong":
        a = new B(s, e, i);
        break;
      case "granular":
        a = new Lt(s, e, i);
        break;
      case "euclidean":
        a = new Wt(s, e, i);
        break;
      case "slewlimiter":
        a = new Ht(s, e, i);
        break;
      case "turing":
        a = new Jt(s, e, i);
        break;
      case "envfollower":
        a = new Yt(s, e, i);
        break;
      case "probgate":
        a = new Zt(s, e, i);
        break;
      case "logic":
        a = new ee(s, e, i);
        break;
      case "macro":
        a = new z(s, e, i);
        break;
      case "counter":
        a = new D(s, e, i);
        break;
      case "comparator":
        a = new C(s, e, i);
        break;
      case "switch":
        a = new P(s, e, i);
        break;
      case "crossfader":
        a = new L(s, e, i);
        break;
      case "sequencechain":
        a = new x(s, e, i);
        break;
      case "audioinput":
        a = new ce(s, e, i);
        break;
      case "pitchshifter":
        a = new pe(s, e, i);
        break;
      case "formantshifter":
        a = new ge(s, e, i);
        break;
      case "shimmerreverb":
        a = new Q(s, e, i);
        break;
      case "chorus":
        a = new Te(s, e, i);
        break;
      case "compressor":
        a = new H(s, e, i);
        break;
      case "eq":
        a = new Me(s, e, i);
        break;
      case "bitcrusher":
        a = new Ie(s, e, i);
        break;
      case "vocoder":
        a = new K(s, e, i);
        break;
      case "glitch":
        a = new X(s, e, i);
        break;
      case "freqshifter":
        a = new Oe(s, e, i);
        break;
      case "combfilter":
        a = new Re(s, e, i);
        break;
      case "output":
        return this.outputNode;
      default:
        return console.error(`ChronoFlowEngine: Unknown node type: ${t}`), null;
    }
    return this.nodes.set(e, a), this.events.onNodeCreated?.(e, t), a;
  }
  removeNode(t) {
    if (t === "output") return;
    const e = this.nodes.get(t);
    e && (this.connections = this.connections.filter((i) => i.from.nodeId === t || i.to.nodeId === t ? (this.events.onConnectionRemoved?.(i), !1) : !0), e.dispose(), this.nodes.delete(t), this.events.onNodeRemoved?.(t));
  }
  // --- Params ---
  setParam(t, e, i) {
    const s = this.nodes.get(t);
    if (!s) {
      console.warn(`ChronoFlowEngine: Node not found: ${t}`);
      return;
    }
    if (s.setParam(e, i), this.currentPatch) {
      const a = this.currentPatch.nodes.find((n) => n.id === t);
      a && (a.params[e] = i);
    }
    this.events.onParamChanged?.(t, e, i);
  }
  getParam(t, e) {
    const i = this.nodes.get(t);
    return i ? i.getParams()[e] : void 0;
  }
  getParams(t) {
    const e = this.nodes.get(t);
    if (e)
      return e.getParams();
  }
  // Batch set multiple params at once
  setParams(t) {
    for (const { nodeId: e, param: i, value: s } of t)
      this.setParam(e, i, s);
  }
  // --- Connections ---
  connect(t, e, i, s) {
    const a = {
      id: `${t}.${e}-${i}.${s}`,
      from: { nodeId: t, port: e },
      to: { nodeId: i, port: s }
    };
    return this.connectInternal(a);
  }
  disconnect(t, e, i, s) {
    const a = this.nodes.get(t), n = this.nodes.get(i);
    if (!a || !n) return !1;
    const o = this.getOutputForPort(a, e);
    if (!o) return !1;
    try {
      if (s.endsWith("_mod")) {
        const u = this.getModulationTarget(n, s);
        u && (u instanceof AudioParam, o.disconnect(u));
      } else {
        const u = this.getInputForPort(n, s);
        u && o.disconnect(u);
      }
    } catch {
    }
    const h = `${t}.${e}-${i}.${s}`, c = this.connections.find((u) => u.id === h);
    return this.connections = this.connections.filter((u) => u.id !== h), c && this.events.onConnectionRemoved?.(c), !0;
  }
  getConnections() {
    return [...this.connections];
  }
  // --- Audio Routing Helpers ---
  getAudioContext() {
    return this.ensureInitialized(), this.context;
  }
  // Get the master output GainNode — connect this to your own destination
  getMasterOutput() {
    return this.ensureInitialized(), this.masterGain;
  }
  // Get the SynthOutputNode (the last node in the patch graph)
  getOutputNode() {
    return this.outputNode;
  }
  setMasterVolume(t) {
    this.masterGain && this.masterGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, t)),
      this.context.currentTime,
      0.01
    );
  }
  // Connect master output to an arbitrary AudioNode (e.g., another app's gain node)
  routeTo(t) {
    this.masterGain && this.masterGain.connect(t);
  }
  // Disconnect master output from context.destination (if you want to route elsewhere)
  disconnectFromDestination() {
    if (this.masterGain && this.context)
      try {
        this.masterGain.disconnect(this.context.destination);
      } catch {
      }
  }
  // --- MIDI / Note Control ---
  noteOn(t, e = 100) {
    const i = 440 * Math.pow(2, (t - 69) / 12), s = e / 127;
    this.nodes.forEach((a) => {
      a instanceof y && a.setParam("frequency", i);
    }), this.nodes.forEach((a) => {
      a instanceof k && a.trigger(s);
    });
  }
  noteOff(t) {
    this.nodes.forEach((e) => {
      e instanceof k && e.release();
    });
  }
  // --- Utility ---
  // Stop all sound immediately
  panic() {
    this.nodes.forEach((t) => {
      t instanceof y ? t.stop() : t instanceof k ? t.release() : (t instanceof F || t instanceof O || t instanceof Q) && t.clear();
    });
  }
  // Clear everything except the output node
  clear() {
    this.nodes.forEach((t) => {
      (t instanceof y || t instanceof N) && t.stop();
    }), this.nodes.forEach((t, e) => {
      e !== "output" && t.dispose();
    }), this.nodes.clear(), this.connections = [], this.outputNode && this.nodes.set("output", this.outputNode), this.currentPatch = null;
  }
  isInitialized() {
    return this.initialized;
  }
  getCurrentPatch() {
    return this.currentPatch ? JSON.parse(JSON.stringify(this.currentPatch)) : null;
  }
  // --- Internal ---
  ensureInitialized() {
    if (!this.initialized || !this.context)
      throw new Error("ChronoFlowEngine not initialized. Call init() first.");
  }
  connectInternal(t) {
    const e = this.nodes.get(t.from.nodeId), i = this.nodes.get(t.to.nodeId);
    if (!e || !i)
      return console.warn(`ChronoFlowEngine: Cannot connect - node not found: ${t.from.nodeId} -> ${t.to.nodeId}`), !1;
    const s = this.getOutputForPort(e, t.from.port);
    if (!s)
      return console.warn(`ChronoFlowEngine: Cannot connect - output port not found: ${t.from.port}`), !1;
    if (t.to.port.endsWith("_mod")) {
      const a = this.getModulationTarget(i, t.to.port);
      if (!a)
        return console.warn(`ChronoFlowEngine: Cannot connect - mod target not found: ${t.to.port}`), !1;
      try {
        a instanceof AudioParam, s.connect(a);
      } catch (n) {
        return console.error("ChronoFlowEngine: Modulation connection failed", n), !1;
      }
    } else {
      const a = this.getInputForPort(i, t.to.port);
      if (!a)
        return console.warn(`ChronoFlowEngine: Cannot connect - input port not found: ${t.to.port}`), !1;
      try {
        s.connect(a);
      } catch (n) {
        return console.error("ChronoFlowEngine: Connection failed", n), !1;
      }
    }
    return this.connections.push(t), this.events.onConnectionAdded?.(t), !0;
  }
  getOutputForPort(t, e) {
    if (t instanceof E)
      switch (e) {
        case "div1":
          return t.getDiv1Output();
        case "div2":
          return t.getDiv2Output();
        case "div4":
          return t.getDiv4Output();
        case "div8":
          return t.getDiv8Output();
      }
    if (t instanceof z)
      switch (e) {
        case "out1":
          return t.getOutput1();
        case "out2":
          return t.getOutput2();
        case "out3":
          return t.getOutput3();
        case "out4":
          return t.getOutput4();
      }
    if (t instanceof C)
      switch (e) {
        case "inverted":
          return t.getInvertedOutput();
        case "trigger":
          return t.getTriggerOutput();
      }
    if (t instanceof x)
      switch (e) {
        case "trigger":
          return t.getTriggerOutput();
        default: {
          const i = e.match(/^scene(\d+)$/);
          if (i) return t.getSceneGate(parseInt(i[1], 10));
        }
      }
    return t.getOutputNode();
  }
  getModulationTarget(t, e) {
    return t instanceof y ? t.getModulationInputNode(e) : t.getModulationTarget(e);
  }
  getInputForPort(t, e) {
    if (e === "trigger") {
      if (t instanceof B) return t.getTriggerInput();
      if (t instanceof q)
        return t.setExternalTrigger(!0), t.getTriggerInput();
      if (t instanceof k || t instanceof D || t instanceof P) return t.getTriggerInput();
    }
    if (t instanceof D && e === "reset")
      return t.getResetInput();
    if (t instanceof C && e === "threshold")
      return t.getThresholdInput();
    if (t instanceof P) {
      const i = e.match(/^input([1-4])$/);
      if (i) return t.getInput(parseInt(i[1], 10));
      if (e === "cv") return t.getCVInput();
    }
    if (t instanceof L) {
      if (e === "inputA" || e === "input") return t.getInputA();
      if (e === "inputB") return t.getInputB();
      if (e === "cv") return t.getCVInput();
    }
    if (t instanceof x) {
      if (e === "clock" || e === "input") return t.getClockInput();
      if (e === "reset") return t.getResetInput();
    }
    if (t instanceof V) {
      const i = e.match(/^input([1-4])$/);
      if (i) return t.getInputChannel(parseInt(i[1], 10));
    }
    return t instanceof H && e === "sidechain" ? t.getSidechainInput() : t instanceof K && e === "carrier" ? t.getCarrierInput() : t instanceof X && e === "trigger" ? t.getTriggerInput() : t.getInputNode();
  }
}
function _e(r = "Untitled") {
  const t = (/* @__PURE__ */ new Date()).toISOString();
  return {
    version: "1.0",
    meta: {
      name: r,
      created: t,
      modified: t
    },
    nodes: [
      {
        id: "output",
        type: "output",
        position: { x: 600, y: 200 },
        params: { gain: 0.7 }
      }
    ],
    connections: [],
    groups: []
  };
}
export {
  qe as ChronoFlowEngine,
  k as SynthADSRNode,
  ce as SynthAudioInputNode,
  Ie as SynthBitcrusherNode,
  Te as SynthChorusNode,
  Re as SynthCombFilterNode,
  H as SynthCompressorNode,
  F as SynthDelayNode,
  Me as SynthEQNode,
  at as SynthFilterNode,
  ge as SynthFormantShifterNode,
  Oe as SynthFreqShifterNode,
  X as SynthGlitchNode,
  N as SynthLFONode,
  V as SynthMixerNode,
  y as SynthOscillatorNode,
  Rt as SynthOutputNode,
  pe as SynthPitchShifterNode,
  O as SynthReverbNode,
  Q as SynthShimmerReverbNode,
  rt as SynthVCANode,
  K as SynthVocoderNode,
  _e as createEmptyPatch
};
