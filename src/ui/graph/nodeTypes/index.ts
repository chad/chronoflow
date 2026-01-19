import { OscillatorNodeUI } from './OscillatorNodeUI';
import { FilterNodeUI } from './FilterNodeUI';
import { VCANodeUI } from './VCANodeUI';
import { LFONodeUI } from './LFONodeUI';
import { OutputNodeUI } from './OutputNodeUI';

export const nodeTypes = {
  oscillator: OscillatorNodeUI,
  filter: FilterNodeUI,
  vca: VCANodeUI,
  lfo: LFONodeUI,
  output: OutputNodeUI,
};
