/**
 * Tracker-style pattern notation parser for the sequencer.
 *
 * Supports:
 * - Note names: C-4, D#4, Eb4 (octave 0-9)
 * - Rests: ---, ., -, ...
 * - Space-separated tokens
 *
 * Examples:
 * - "C-4 D-4 E-4 F-4" - C major scale fragment
 * - "C-4 --- E-4 ---" - Notes with rests
 * - "E-4 E-4 . E-4 . C-4" - Mario-style rhythm
 */

export interface ParsedStep {
  type: 'note' | 'rest';
  midiNote?: number;      // MIDI note number (60 = C4)
  originalToken: string;  // For error display
}

export interface ParseResult {
  steps: ParsedStep[];
  errors: string[];
}

// Note name to semitone offset (C=0, C#/Db=1, etc.)
const NOTE_OFFSETS: Record<string, number> = {
  'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11,
  'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11,
};

// Regex to match note tokens: letter + optional accidental + octave
// Examples: C-4, D#4, Eb4, F4, G#-1
const NOTE_REGEX = /^([A-Ga-g])([#b])?-?(-?\d)$/;

// Rest tokens
const REST_TOKENS = new Set(['---', '.', '-', '...', '--', '']);

/**
 * Parse a single note token to MIDI number.
 * Returns null for rests or invalid tokens.
 */
export function parseNoteToMidi(token: string): number | null {
  const trimmed = token.trim();

  // Check if it's a rest
  if (REST_TOKENS.has(trimmed)) {
    return null;
  }

  const match = trimmed.match(NOTE_REGEX);
  if (!match) {
    return null;
  }

  const [, noteLetter, accidental, octaveStr] = match;
  const baseOffset = NOTE_OFFSETS[noteLetter];

  if (baseOffset === undefined) {
    return null;
  }

  let semitone = baseOffset;

  // Apply accidental
  if (accidental === '#') {
    semitone += 1;
  } else if (accidental === 'b') {
    semitone -= 1;
  }

  const octave = parseInt(octaveStr, 10);

  // MIDI note calculation: (octave + 1) * 12 + semitone
  // C4 (middle C) = (4 + 1) * 12 + 0 = 60
  const midiNote = (octave + 1) * 12 + semitone;

  // Validate MIDI range (0-127)
  if (midiNote < 0 || midiNote > 127) {
    return null;
  }

  return midiNote;
}

/**
 * Convert MIDI note number to note name.
 * Used for display purposes.
 */
export function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${noteNames[noteIndex]}${octave}`;
}

/**
 * Parse a tracker pattern string into steps.
 *
 * @param pattern - Space-separated pattern string
 * @returns ParseResult with steps array and any errors
 */
export function parseTrackerPattern(pattern: string): ParseResult {
  const steps: ParsedStep[] = [];
  const errors: string[] = [];

  // Handle empty pattern
  if (!pattern || !pattern.trim()) {
    return { steps: [{ type: 'rest', originalToken: '' }], errors: [] };
  }

  // Split by whitespace
  const tokens = pattern.trim().split(/\s+/);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check for rest tokens
    if (REST_TOKENS.has(token)) {
      steps.push({ type: 'rest', originalToken: token });
      continue;
    }

    // Try to parse as note
    const midiNote = parseNoteToMidi(token);

    if (midiNote !== null) {
      steps.push({ type: 'note', midiNote, originalToken: token });
    } else {
      // Invalid token - treat as rest but record error
      errors.push(`Invalid token at position ${i + 1}: "${token}"`);
      steps.push({ type: 'rest', originalToken: token });
    }
  }

  // Ensure at least one step
  if (steps.length === 0) {
    steps.push({ type: 'rest', originalToken: '' });
  }

  // Limit to 32 steps
  if (steps.length > 32) {
    steps.length = 32;
    errors.push('Pattern truncated to 32 steps');
  }

  return { steps, errors };
}

/**
 * Convert legacy step parameters to tracker pattern notation.
 * Used for migrating old patches.
 *
 * @param params - Object with step1-step8 properties (semitone offsets from C4)
 * @param stepCount - Number of active steps (1-8)
 * @returns Tracker pattern string
 */
export function legacyStepsToPattern(
  params: Record<string, number | string | boolean>,
  stepCount: number
): string {
  const notes: string[] = [];

  for (let i = 1; i <= stepCount; i++) {
    const semitone = params[`step${i}`] as number;
    if (semitone !== undefined) {
      // Convert semitone offset from C4 to MIDI note
      const midiNote = 60 + semitone; // C4 = 60, so offset adds directly
      notes.push(midiToNoteName(midiNote));
    }
  }

  return notes.join(' ') || 'C-4';
}

/**
 * Validate a pattern string without full parsing.
 * Useful for quick UI validation.
 *
 * @param pattern - Pattern string to validate
 * @returns true if pattern has no errors
 */
export function isValidPattern(pattern: string): boolean {
  const { errors } = parseTrackerPattern(pattern);
  return errors.length === 0;
}

/**
 * Get step count from a pattern string.
 *
 * @param pattern - Pattern string
 * @returns Number of steps (1-32)
 */
export function getPatternStepCount(pattern: string): number {
  const { steps } = parseTrackerPattern(pattern);
  return steps.length;
}
