#!/bin/bash
set -e

# Define the name of the native host and the target directory for Chrome
HOST_NAME="com.my.native_host"
TARGET_DIR_CHROME="$HOME/.config/google-chrome/NativeMessagingHosts"
TARGET_DIR_FIREFOX="$HOME/.mozilla/native-messaging-hosts"

# Get the absolute path of the project directory
INSTALL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
HOST_SCRIPT_PATH="$INSTALL_DIR/browser-host.js"

# Create the manifest content, replacing the placeholder with the correct path
MANIFEST_CONTENT='{
  "name": "'$HOST_NAME'",
  "description": "Marvin Extension Native Host",
  "path": "'$HOST_SCRIPT_PATH'",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://pdldfnckgdlcniaelobmlgblngkoiloc/"
  ]
}'

# Create the manifest file in the target directories
echo "Installing native messaging host for Chrome..."
mkdir -p "$TARGET_DIR_CHROME"
echo "$MANIFEST_CONTENT" > "$TARGET_DIR_CHROME/$HOST_NAME.json"

echo "Installing native messaging host for Firefox..."
mkdir -p "$TARGET_DIR_FIREFOX"
echo "$MANIFEST_CONTENT" > "$TARGET_DIR_FIREFOX/$HOST_NAME.json"

# Make the host scripts executable
chmod +x "$HOST_SCRIPT_PATH"
chmod +x "$INSTALL_DIR/mcp-server.js"

echo "Installation complete."
echo "Make sure to update the 'allowed_origins' in the manifest if your extension ID changes."
