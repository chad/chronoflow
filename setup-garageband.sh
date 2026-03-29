#!/bin/bash
# Mosh + GarageBand MIDI Setup
# This script configures IAC Driver and launches everything needed.

set -e

echo "═══════════════════════════════════════════"
echo "  Mosh + GarageBand MIDI Setup"
echo "═══════════════════════════════════════════"
echo ""

# 1. Enable IAC Driver
echo "→ Enabling IAC Driver..."
PLIST=$(ls ~/Library/Preferences/ByHost/com.apple.MIDI.*.plist 2>/dev/null | head -1)
if [ -z "$PLIST" ]; then
  echo "  ✗ MIDI preferences not found. Open Audio MIDI Setup first."
  open -a "Audio MIDI Setup"
  exit 1
fi

CURRENT=$(/usr/libexec/PlistBuddy -c "Print :MIDISetup:devices:1:offline" "$PLIST" 2>/dev/null || echo "unknown")
if [ "$CURRENT" = "1" ]; then
  /usr/libexec/PlistBuddy -c "Set :MIDISetup:devices:1:offline 0" "$PLIST"
  killall MIDIServer 2>/dev/null || true
  sleep 1
  echo "  ✓ IAC Driver enabled"
else
  echo "  ✓ IAC Driver already enabled"
fi

# 2. Start Mosh dev server (if not running)
echo ""
echo "→ Starting Mosh..."
if lsof -i :5173 >/dev/null 2>&1; then
  echo "  ✓ Already running on http://localhost:5173"
else
  cd "$(dirname "$0")"
  npx vite --host &
  VITE_PID=$!
  sleep 2
  echo "  ✓ Started on http://localhost:5173 (PID: $VITE_PID)"
fi

# 3. Open Chrome with MIDI permissions
echo ""
echo "→ Opening Mosh in Chrome..."
open -a "Google Chrome" "http://localhost:5173"

# 4. Open GarageBand
echo ""
echo "→ Opening GarageBand..."
open -a "GarageBand"

sleep 2

echo ""
echo "═══════════════════════════════════════════"
echo "  Setup Complete!"
echo "═══════════════════════════════════════════"
echo ""
echo "  How to connect GarageBand → Mosh:"
echo ""
echo "  1. In GarageBand, open Musical Typing:"
echo "     Window → Show Musical Typing  (or ⌘K)"
echo ""  
echo "  2. In Mosh (Chrome), check the MIDI"
echo "     panel on the left sidebar — it should"
echo "     show 'IAC ✓' with auto-connection."
echo ""
echo "  3. Play notes in GarageBand's Musical Typing"
echo "     — you'll hear them through Mosh!"
echo ""
echo "  Alternatively, if you have a MIDI keyboard:"
echo "     - It will appear in Mosh's MIDI Input"
echo "       dropdown automatically via Web MIDI API"
echo "     - Select it directly — no IAC needed for"
echo "       hardware controllers"
echo ""
echo "  To record Mosh audio in GarageBand:"
echo "     - Install BlackHole (brew install --cask blackhole-2ch)"
echo "     - Set BlackHole as Mosh's audio output"  
echo "     - Set BlackHole as GarageBand's audio input"
echo ""
