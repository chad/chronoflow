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
import { ClockNodeUI } from './ClockNodeUI';
import { ClockDividerNodeUI } from './ClockDividerNodeUI';
import { OutputNodeUI } from './OutputNodeUI';
import { GroupNodeUI } from './GroupNodeUI';
import { SmoothRandomNodeUI } from './SmoothRandomNodeUI';
import { KarplusStrongNodeUI } from './KarplusStrongNodeUI';
import { GranularNodeUI } from './GranularNodeUI';
import { EuclideanNodeUI } from './EuclideanNodeUI';
import { SlewLimiterNodeUI } from './SlewLimiterNodeUI';
import { TuringMachineNodeUI } from './TuringMachineNodeUI';
import { EnvelopeFollowerNodeUI } from './EnvelopeFollowerNodeUI';
import { ProbabilityGateNodeUI } from './ProbabilityGateNodeUI';
import { LogicNodeUI } from './LogicNodeUI';
import { MacroNodeUI } from './MacroNodeUI';
import { SequenceChainNodeUI } from './SequenceChainNodeUI';
import { CrossfaderNodeUI } from './CrossfaderNodeUI';
import { CounterNodeUI } from './CounterNodeUI';
import { SwitchNodeUI } from './SwitchNodeUI';
import { ComparatorNodeUI } from './ComparatorNodeUI';

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
  clock: ClockNodeUI,
  clockdiv: ClockDividerNodeUI,
  output: OutputNodeUI,
  group: GroupNodeUI,
  smoothrandom: SmoothRandomNodeUI,
  karplusstrong: KarplusStrongNodeUI,
  granular: GranularNodeUI,
  euclidean: EuclideanNodeUI,
  slewlimiter: SlewLimiterNodeUI,
  turing: TuringMachineNodeUI,
  envfollower: EnvelopeFollowerNodeUI,
  probgate: ProbabilityGateNodeUI,
  logic: LogicNodeUI,
  macro: MacroNodeUI,
  sequencechain: SequenceChainNodeUI,
  crossfader: CrossfaderNodeUI,
  counter: CounterNodeUI,
  switch: SwitchNodeUI,
  comparator: ComparatorNodeUI,
};
