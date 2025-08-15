# Marvin - Chrome Extension Native Messaging with MCP

This project is a Chrome extension that uses native messaging to communicate with a local Node.js script. The local script acts as a bridge, implementing the Model Context Protocol (MCP) to allow communication with other applications, such as a `gemini-cli`.

## Features

*   **Chrome Extension:** A simple UI to interact with the native host.
*   **Native Host (`native-host.js`):** A Node.js script that acts as a bridge between the extension and other applications.
*   **Model Context Protocol (MCP):** The native host implements a JSON-RPC-based MCP server to allow communication with other applications.
*   **Service Discovery:** The native host registers itself as an MCP service, allowing other applications to discover and connect to it.

## How it Works

1.  **Extension UI (`popup.html`, `popup.js`):** The popup provides a simple UI to send messages. It communicates with the `background.js` script.
2.  **Background Script (`background.js`):** This script runs in the background and maintains a persistent connection to the `native-host.js`.
3.  **Native Host (`native-host.js`):** This is the core of the project. It does two things:
    *   It communicates with the Chrome extension using the standard native messaging protocol.
    *   It starts a TCP server on a random available port and listens for incoming connections from other applications (like `gemini-cli`).
4.  **Service Discovery:** When the native host starts, it creates a file in `~/.mcp/services/` that contains the port number it is listening on. This allows other applications to find and connect to it.
5.  **MCP Server:** The native host implements a simple JSON-RPC-based MCP server to handle requests from connected clients.

## How to Test

1.  **Load the Extension:**
    *   Open Chrome and navigate to `chrome://extensions`.
    *   Enable "Developer mode".
    *   Click on "Load unpacked" and select the directory containing these files.

2.  **Start the MCP Connection:**
    *   Click on the extension icon in the Chrome toolbar.
    *   Click the "Start MCP Connection" button. This will start the `native-host.js` script.

3.  **Find the Service Port:**
    *   The `native-host.js` will create a file in `~/.mcp/services/`. You can find the port number by reading this file:
        ```bash
        cat ~/.mcp/services/com.my.native_host.json
        ```

4.  **Connect with a Test Client:**
    *   Open a new terminal and use `netcat` (or `nc`) to connect to the port you found in the previous step. For example, if the port is `12345`:
        ```bash
        nc localhost 12345
        ```

5.  **Send Messages:**
    *   **From the Test Client (acting as `gemini-cli`):**
        *   To get the content of the `h1` tag of the current page, send this JSON-RPC message in your `netcat` terminal:
            ```json
            {"jsonrpc": "2.0", "id": 1, "method": "mcp.getBrowserContent"}
            ```
        *   You should see a response in the same terminal with the `h1` content.
    *   **From the Extension:**
        *   Type a message in the popup's input field and click "Send".
        *   You should see a JSON-RPC notification appear in your `netcat` terminal.