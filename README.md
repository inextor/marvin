# Marvin Extension

browser extension using 
## Architecture

The system is composed of three main parts:

1.  **Browser Extension**: The frontend running in the browser (`popup.js`, `background.js`).
2.  **Browser Host (`browser-host.js`)**: A script launched by the browser via the Native Messaging API. It communicates with the browser over `stdio` and connects to the MCP Server via a TCP socket.


## Setup

### 1. Install the Native Host

You must run the installation script to configure the native messaging host for your browser. This will create a manifest file that tells the browser where to find the `browser-host.js` script.

```bash
bash ./install.sh
```

This script will automatically detect the absolute path to the project and make the host scripts executable.

### 2. Configure Gemini CLI

You need to tell the Gemini CLI how to run the MCP server. Add the following configuration to your `.gemini/settings.json` file (either in your project or home directory):

```json
{
  "mcpServers": {
    "marvin-mcp": {
      "command": "/path/to/your/project/MarvinExtension/mcp-server.js",
      "trust": true
    }
  }
}
```

**IMPORTANT:** Replace `/path/to/your/project/MarvinExtension/` with the actual absolute path to this project directory on your machine.

### 3. Load the Browser Extension

Load the extension into your browser (`chrome://extensions/` -> "Load unpacked").

## Debugging

Both `mcp-server.js` and `browser-host.js` write logs to your home directory:

*   `~/browser-host-debug.log`

You can monitor these logs to trace communication between the different parts of the system.
