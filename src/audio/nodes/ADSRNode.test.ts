import { describe, it, expect, beforeEach } from 'vitest';
import { SynthADSRNode } from './ADSRNode';

describe('SynthADSRNode', () => {
  let context: AudioContext;

  beforeEach(() => {
    context = new AudioContext();
  });

  describe('constructor', () => {
    it('should create with default parameters', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      const params = adsr.getParams();
      expect(params.attack).toBe(0.01);
      expect(params.decay).toBe(0.1);
      expect(params.sustain).toBe(0.7);
      expect(params.release).toBe(0.3);
    });

    it('should accept custom parameters', () => {
      const adsr = new SynthADSRNode(context, 'adsr1', {
        attack: 0.5,
        decay: 0.2,
        sustain: 0.5,
        release: 1.0,
      });

      const params = adsr.getParams();
      expect(params.attack).toBe(0.5);
      expect(params.decay).toBe(0.2);
      expect(params.sustain).toBe(0.5);
      expect(params.release).toBe(1.0);
    });

    it('should have correct type', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');
      expect(adsr.type).toBe('adsr');
    });

    it('should have correct id', () => {
      const adsr = new SynthADSRNode(context, 'my-adsr');
      expect(adsr.id).toBe('my-adsr');
    });
  });

  describe('setParam', () => {
    it('should update attack time', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      adsr.setParam('attack', 0.5);

      expect(adsr.getParams().attack).toBe(0.5);
    });

    it('should clamp attack to minimum 0.001', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      adsr.setParam('attack', 0);

      expect(adsr.getParams().attack).toBe(0.001);
    });

    it('should update decay time', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      adsr.setParam('decay', 0.5);

      expect(adsr.getParams().decay).toBe(0.5);
    });

    it('should clamp decay to minimum 0.001', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      adsr.setParam('decay', 0);

      expect(adsr.getParams().decay).toBe(0.001);
    });

    it('should update sustain level', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      adsr.setParam('sustain', 0.5);

      expect(adsr.getParams().sustain).toBe(0.5);
    });

    it('should clamp sustain between 0 and 1', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      adsr.setParam('sustain', -0.5);
      expect(adsr.getParams().sustain).toBe(0);

      adsr.setParam('sustain', 1.5);
      expect(adsr.getParams().sustain).toBe(1);
    });

    it('should update release time', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      adsr.setParam('release', 2.0);

      expect(adsr.getParams().release).toBe(2.0);
    });

    it('should clamp release to minimum 0.001', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      adsr.setParam('release', 0);

      expect(adsr.getParams().release).toBe(0.001);
    });
  });

  describe('trigger', () => {
    it('should activate envelope', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      expect(adsr.isEnvelopeActive()).toBe(false);

      adsr.trigger();

      expect(adsr.isEnvelopeActive()).toBe(true);
    });

    it('should accept velocity parameter', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      // Should not throw
      adsr.trigger(0.5);
      expect(adsr.isEnvelopeActive()).toBe(true);
    });

    it('should handle retrigger while active', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      adsr.trigger(1.0);
      adsr.trigger(0.5); // Retrigger

      expect(adsr.isEnvelopeActive()).toBe(true);
    });
  });

  describe('release', () => {
    it('should deactivate envelope after release', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      adsr.trigger();
      expect(adsr.isEnvelopeActive()).toBe(true);

      adsr.release();
      expect(adsr.isEnvelopeActive()).toBe(false);
    });

    it('should do nothing if envelope is not active', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      // Should not throw
      adsr.release();
      expect(adsr.isEnvelopeActive()).toBe(false);
    });
  });

  describe('forceStop', () => {
    it('should immediately stop envelope', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      adsr.trigger();
      adsr.forceStop();

      expect(adsr.isEnvelopeActive()).toBe(false);
    });

    it('should work even if envelope is not active', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      // Should not throw
      adsr.forceStop();
      expect(adsr.isEnvelopeActive()).toBe(false);
    });
  });

  describe('audio node interface', () => {
    it('should return output node', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      const output = adsr.getOutputNode();

      expect(output).toBeDefined();
      // Check it has gain property (GainNode characteristic)
      expect((output as GainNode).gain).toBeDefined();
    });

    it('should return null for input node (ADSR generates signal)', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      const input = adsr.getInputNode();

      expect(input).toBeNull();
    });

    it('should return null for modulation targets', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');

      expect(adsr.getModulationTarget('attack_mod')).toBeNull();
      expect(adsr.getModulationTarget('decay_mod')).toBeNull();
    });

    it('should connect to audio param', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');
      const gainNode = context.createGain();

      // Should not throw
      adsr.connectToParam(gainNode.gain);
    });

    it('should connect to another node', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');
      const gainNode = context.createGain();

      // Should not throw
      adsr.connect(gainNode);
    });

    it('should disconnect', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');
      const gainNode = context.createGain();
      adsr.connect(gainNode);

      // Should not throw
      adsr.disconnect();
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      const adsr = new SynthADSRNode(context, 'adsr1');
      adsr.trigger();

      // Should not throw
      adsr.dispose();
      expect(adsr.isEnvelopeActive()).toBe(false);
    });
  });
});
