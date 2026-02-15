import { useEffect, useState } from 'react';
import { midiEngine } from '../../midi/MidiEngine';
import { midiRouter } from '../../midi/MidiRouter';
import type { MidiDevice } from '../../midi/MidiEngine';

export function MidiPanel() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [inputs, setInputs] = useState<MidiDevice[]>([]);
  const [outputs, setOutputs] = useState<MidiDevice[]>([]);
  const [selectedInput, setSelectedInput] = useState<string | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<number | null>(null);
  const [iacConnected, setIacConnected] = useState(false);
  const [pitchBendRange, setPitchBendRange] = useState(midiRouter.getPitchBendRange());
  const [activeNotes, setActiveNotes] = useState(0);

  useEffect(() => {
    const initMidi = async () => {
      const available = await midiEngine.init();
      setIsAvailable(available);
      if (available) {
        refreshDevices();
        checkIACConnection();
      }
    };

    initMidi();

    const unsubState = midiEngine.onStateChange(() => {
      refreshDevices();
      checkIACConnection();
    });

    const unsubMsg = midiEngine.onMessage(() => {
      setLastActivity(Date.now());
      setTimeout(() => setLastActivity(null), 100);
    });

    const unsubNoteOn = midiRouter.onNoteOn(() => {
      setActiveNotes(midiRouter.getHeldNotes().size);
    });
    const unsubNoteOff = midiRouter.onNoteOff(() => {
      setActiveNotes(midiRouter.getHeldNotes().size);
    });

    return () => {
      unsubState();
      unsubMsg();
      unsubNoteOn();
      unsubNoteOff();
    };
  }, []);

  const refreshDevices = () => {
    setInputs(midiEngine.getInputs());
    setOutputs(midiEngine.getOutputs());
  };

  const checkIACConnection = () => {
    const input = midiEngine.getSelectedInput();
    setIacConnected(input !== null && !!input.name && input.name.toLowerCase().includes('iac'));
    if (input) {
      setSelectedInput(input.id);
    }
  };

  const handleInputChange = (deviceId: string) => {
    const id = deviceId === '' ? null : deviceId;
    midiEngine.selectInput(id);
    setSelectedInput(id);
    checkIACConnection();
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
        <p className="text-[10px] text-gray-600 mt-1">
          Make sure Chrome has MIDI permission
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-bold text-gray-300">MIDI</h3>
        <div
          className={`w-2 h-2 rounded-full transition-colors ${
            lastActivity ? 'bg-green-400' : iacConnected ? 'bg-cyan-400' : 'bg-gray-600'
          }`}
          title={iacConnected ? 'IAC Connected' : 'No connection'}
        />
        {iacConnected && (
          <span className="text-[10px] text-cyan-400">IAC ✓</span>
        )}
      </div>

      {/* IAC Status Banner */}
      {iacConnected && (
        <div className="mb-2 px-2 py-1.5 bg-cyan-900/30 border border-cyan-800 rounded text-[10px] text-cyan-300">
          <strong>GarageBand → ChronoFlow</strong> ready
          {activeNotes > 0 && (
            <span className="ml-1 text-green-400">• {activeNotes} note{activeNotes !== 1 ? 's' : ''}</span>
          )}
          <br />
          <span className="text-gray-400">
            In GarageBand: add <em>External MIDI</em> track → set MIDI destination to "IAC Driver Bus 1"
          </span>
        </div>
      )}

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
                {device.name} {device.name?.toLowerCase().includes('iac') ? '(GarageBand)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Output</label>
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

      {/* Pitch Bend Range */}
      {isAvailable && (
        <div className="mt-3">
          <label className="text-xs text-gray-400 block mb-1">Pitch Bend Range</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={24}
              value={pitchBendRange}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setPitchBendRange(val);
                midiRouter.setPitchBendRange(val);
              }}
              className="flex-1 h-1 accent-cyan-500"
            />
            <span className="text-xs text-gray-300 font-mono w-8 text-right">±{pitchBendRange}st</span>
          </div>
        </div>
      )}

      {!iacConnected && inputs.length === 0 && (
        <div className="mt-2 text-[10px] text-gray-500">
          No MIDI devices found.
          <br />
          <strong>To use with GarageBand:</strong>
          <ol className="mt-1 ml-3 list-decimal space-y-0.5">
            <li>Open <em>Audio MIDI Setup</em> (Spotlight → "MIDI")</li>
            <li>Show MIDI Studio (⌘2)</li>
            <li>Double-click <em>IAC Driver</em></li>
            <li>Check "Device is online"</li>
            <li>Reload this page</li>
          </ol>
        </div>
      )}
    </div>
  );
}
