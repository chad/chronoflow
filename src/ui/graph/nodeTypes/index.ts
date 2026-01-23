import { OscillatorNodeUI } from './OscillatorNodeUI';
import { FilterNodeUI } from './FilterNodeUI';
import { VCANodeUI } from './VCANodeUI';
import { LFONodeUI } from './LFONodeUI';
import { ADSRNodeUI } from './ADSRNodeUI';
import { DelayNodeUI } from './DelayNodeUI';
import { ReverbNodeUI } from './ReverbNodeUI';
import { MixerNodeUI } from './MixerNodeUI';
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
  output: OutputNodeUI,
  group: GroupNodeUI,
};
