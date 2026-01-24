/**
 * Tracker-style pattern notation parser for the sequencer.
 *
 * Supports:
 * - Note names: C-4, D#4, Eb4 (octave 0-9)
 * - Velocity: C-4:80 (0-127, default 100)
 * - Probability: C-4?50 (0-100%, default 100)
 * - Combined: C-4:80?50
 * - Rests: ---, ., -, ...
 * - Space-separated tokens
 *
 * Examples:
 * - "C-4 D-4 E-4 F-4" - C major scale fragment
 * - "C-4:127 D-4:80 E-4:60 F-4:40" - Velocity dynamics
 * - "C-4?50 D-4?75 E-4 F-4" - Probability variation
 * - "C-4:80?50 --- E-4:100?75 ---" - Combined with rests
 */

export interface ParsedStep {
  type: 'note' | 'rest';
  midiNote?: number;      // MIDI note number (60 = C4)
  velocity: number;       // 0-127, default 100
  probability: number;    // 0-100, default 100
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

// Regex to match note tokens with optional velocity and probability
// Format: NOTE[:VELOCITY][?PROBABILITY]
// Examples: C-4, D#4:80, Eb4?50, F4:127?75
const NOTE_REGEX = /^([A-Ga-g])([#b])?-?(-?\d)(?::(\d+))?(?:\?(\d+))?$/;

// Rest tokens (can also have probability: ---?50)
const REST_REGEX = /^(---|\.\.\.|--|\.|-)?(?:\?(\d+))?$/;

// Simple rest tokens for quick check
const SIMPLE_REST_TOKENS = new Set(['---', '.', '-', '...', '--', '']);

// Default values
const DEFAULT_VELOCITY = 100;
const DEFAULT_PROBABILITY = 100;

/**
 * Parse result for a single token
 */
interface TokenParseResult {
  midiNote: number | null;
  velocity: number;
  probability: number;
  isRest: boolean;
}

/**
 * Parse a single token (note or rest) with velocity and probability.
 */
export function parseToken(token: string): TokenParseResult {
  const trimmed = token.trim();

  // Check if it's a rest (possibly with probability)
  const restMatch = trimmed.match(REST_REGEX);
  if (restMatch && (restMatch[1] || trimmed === '')) {
    const probability = restMatch[2] ? parseInt(restMatch[2], 10) : DEFAULT_PROBABILITY;
    return {
      midiNote: null,
      velocity: DEFAULT_VELOCITY,
      probability: Math.max(0, Math.min(100, probability)),
      isRest: true,
    };
  }

  // Try to parse as note
  const noteMatch = trimmed.match(NOTE_REGEX);
  if (!noteMatch) {
    // Invalid token - treat as rest
    return {
      midiNote: null,
      velocity: DEFAULT_VELOCITY,
      probability: DEFAULT_PROBABILITY,
      isRest: true,
    };
  }

  const [, noteLetter, accidental, octaveStr, velocityStr, probabilityStr] = noteMatch;
  const baseOffset = NOTE_OFFSETS[noteLetter];

  if (baseOffset === undefined) {
    return {
      midiNote: null,
      velocity: DEFAULT_VELOCITY,
      probability: DEFAULT_PROBABILITY,
      isRest: true,
    };
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
    return {
      midiNote: null,
      velocity: DEFAULT_VELOCITY,
      probability: DEFAULT_PROBABILITY,
      isRest: true,
    };
  }

  // Parse velocity and probability
  const velocity = velocityStr
    ? Math.max(0, Math.min(127, parseInt(velocityStr, 10)))
    : DEFAULT_VELOCITY;
  const probability = probabilityStr
    ? Math.max(0, Math.min(100, parseInt(probabilityStr, 10)))
    : DEFAULT_PROBABILITY;

  return {
    midiNote,
    velocity,
    probability,
    isRest: false,
  };
}

/**
 * Parse a single note token to MIDI number (legacy compatibility).
 * Returns null for rests or invalid tokens.
 */
export function parseNoteToMidi(token: string): number | null {
  const result = parseToken(token);
  return result.midiNote;
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
    return {
      steps: [{
        type: 'rest',
        velocity: DEFAULT_VELOCITY,
        probability: DEFAULT_PROBABILITY,
        originalToken: ''
      }],
      errors: []
    };
  }

  // Split by whitespace
  const tokens = pattern.trim().split(/\s+/);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const result = parseToken(token);

    if (result.isRest) {
      // Check if it was an invalid token (not a recognized rest format)
      if (!SIMPLE_REST_TOKENS.has(token.split('?')[0]) && token !== '') {
        errors.push(`Invalid token at position ${i + 1}: "${token}"`);
      }
      steps.push({
        type: 'rest',
        velocity: result.velocity,
        probability: result.probability,
        originalToken: token
      });
    } else {
      steps.push({
        type: 'note',
        midiNote: result.midiNote!,
        velocity: result.velocity,
        probability: result.probability,
        originalToken: token
      });
    }
  }

  // Ensure at least one step
  if (steps.length === 0) {
    steps.push({
      type: 'rest',
      velocity: DEFAULT_VELOCITY,
      probability: DEFAULT_PROBABILITY,
      originalToken: ''
    });
  }

  // Limit to 64 steps per pattern (increased from 32)
  if (steps.length > 64) {
    steps.length = 64;
    errors.push('Pattern truncated to 64 steps');
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
 * @returns Number of steps (1-64)
 */
export function getPatternStepCount(pattern: string): number {
  const { steps } = parseTrackerPattern(pattern);
  return steps.length;
}

/**
 * Parse a chain string into pattern sequence.
 * Examples: "AABA", "A B A B", "ABCD"
 *
 * @param chain - Chain string
 * @returns Array of pattern keys ('A', 'B', 'C', 'D')
 */
export function parseChain(chain: string): string[] {
  if (!chain || !chain.trim()) {
    return ['A'];
  }

  // Remove spaces and convert to uppercase
  const cleaned = chain.replace(/\s+/g, '').toUpperCase();

  // Filter to only valid pattern keys
  const validKeys = new Set(['A', 'B', 'C', 'D']);
  const patterns: string[] = [];

  for (const char of cleaned) {
    if (validKeys.has(char)) {
      patterns.push(char);
    }
  }

  return patterns.length > 0 ? patterns : ['A'];
}

/**
 * Get display string for velocity (shows if not default)
 */
export function formatVelocity(velocity: number): string {
  return velocity !== DEFAULT_VELOCITY ? `:${velocity}` : '';
}

/**
 * Get display string for probability (shows if not default)
 */
export function formatProbability(probability: number): string {
  return probability !== DEFAULT_PROBABILITY ? `?${probability}` : '';
}
