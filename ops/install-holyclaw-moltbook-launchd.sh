#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="com.holyclaw.moltbook"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$ROOT_DIR/.data"
mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$ROOT_DIR/ops/run-holyclaw-moltbook-poster.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$ROOT_DIR</string>
  <key>StartInterval</key>
  <integer>1800</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/Users/owenwong/.local/youtubeautomation/node/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/holyclaw-moltbook.launchd.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/holyclaw-moltbook.launchd.err.log</string>
</dict>
</plist>
PLIST

chmod +x "$ROOT_DIR/ops/run-holyclaw-moltbook-poster.sh" "$ROOT_DIR/ops/holyclaw-moltbook-poster.mjs"
launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl kickstart -k "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true

echo "Installed $LABEL -> $PLIST"
