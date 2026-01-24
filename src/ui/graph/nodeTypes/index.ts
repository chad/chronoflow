import { OscillatorNodeUI } from './OscillatorNodeUI';
import { FilterNodeUI } from './FilterNodeUI';
import { VCANodeUI } from './VCANodeUI';
import { LFONodeUI } from './LFONodeUI';
import { ADSRNodeUI } from './ADSRNodeUI';
import { DelayNodeUI } from './DelayNodeUI';
import { ReverbNodeUI } from './ReverbNodeUI';
import { MixerNodeUI } from './MixerNodeUI';
import { SequencerNodeUI } from './SequencerNodeUI';
import { AttenuverterNodeUI } from './AttenuverterNodeUI';
import { NoiseNodeUI } from './NoiseNodeUI';
import { SampleHoldNodeUI } from './SampleHoldNodeUI';
import { WavefolderNodeUI } from './WavefolderNodeUI';
import { RingModNodeUI } from './RingModNodeUI';
import { QuantizerNodeUI } from './QuantizerNodeUI';
import { OutputNodeUI } from './OutputNodeUI';
import { GroupNodeUI } from './GroupNodeUI';

export const nodeTypes = {
  oscillator: OscillatorNodeUI,
  filter: FilterNodeUI,
  vca: VCANodeUI,
  lfo: LFONodeUI,
  adsr: ADSRNodeUI,
  delay: DelayNodeUI,
  reverb: ReverbNodeUI,
  mixer: MixerNodeUI,
  sequencer: SequencerNodeUI,
  attenuverter: AttenuverterNodeUI,
  noise: NoiseNodeUI,
  samplehold: SampleHoldNodeUI,
  wavefolder: WavefolderNodeUI,
  ringmod: RingModNodeUI,
  quantizer: QuantizerNodeUI,
  output: OutputNodeUI,
  group: GroupNodeUI,
};
