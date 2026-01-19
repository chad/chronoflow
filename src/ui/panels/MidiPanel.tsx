import { useEffect, useState } from 'react';
import { midiEngine } from '../../midi/MidiEngine';
import type { MidiDevice } from '../../midi/MidiEngine';

export function MidiPanel() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [inputs, setInputs] = useState<MidiDevice[]>([]);
  const [outputs, setOutputs] = useState<MidiDevice[]>([]);
  const [selectedInput, setSelectedInput] = useState<string | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<number | null>(null);

  useEffect(() => {
    const initMidi = async () => {
      const available = await midiEngine.init();
      setIsAvailable(available);
      if (available) {
        refreshDevices();
      }
    };

    initMidi();

    // Subscribe to state changes
    const unsubState = midiEngine.onStateChange(() => {
      refreshDevices();
    });

    // Subscribe to MIDI messages for activity indicator
    const unsubMsg = midiEngine.onMessage(() => {
      setLastActivity(Date.now());
      setTimeout(() => setLastActivity(null), 100);
    });

    return () => {
      unsubState();
      unsubMsg();
    };
  }, []);

  const refreshDevices = () => {
    setInputs(midiEngine.getInputs());
    setOutputs(midiEngine.getOutputs());
  };

  const handleInputChange = (deviceId: string) => {
    const id = deviceId === '' ? null : deviceId;
    midiEngine.selectInput(id);
    setSelectedInput(id);
  };

  const handleOutputChange = (deviceId: string) => {
    const id = deviceId === '' ? null : deviceId;
    midiEngine.selectOutput(id);
    setSelectedOutput(id);
  };

  if (!isAvailable) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
        <h3 className="text-sm font-bold text-gray-300 mb-2">MIDI</h3>
        <p className="text-xs text-gray-500">MIDI not available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold text-gray-300">MIDI</h3>
        <div
          className={`w-2 h-2 rounded-full transition-colors ${
            lastActivity ? 'bg-green-400' : 'bg-gray-600'
          }`}
          title="MIDI Activity"
        />
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Input</label>
          <select
            value={selectedInput || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-gray-200 text-xs rounded px-2 py-1.5"
          >
            <option value="">None</option>
            {inputs.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Output (IAC)</label>
          <select
            value={selectedOutput || ''}
            onChange={(e) => handleOutputChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-gray-200 text-xs rounded px-2 py-1.5"
          >
            <option value="">None</option>
            {outputs.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
