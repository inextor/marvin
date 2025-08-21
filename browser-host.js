#!/usr/bin/env node

const net = require('net');
const fs = require('fs');
const path = require('path');
const os =require('os');

const LOG_FILE = path.join(os.homedir(), 'browser-host-debug.log');
fs.writeFileSync(LOG_FILE, ''); // Clear log on start
function debugLog(message) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${message}\n`);
}

debugLog('--- Browser Host started ---');

const MCP_DIR = path.join(os.homedir(), '.mcp', 'services');
const SERVICE_NAME = 'com.my.native_host';
const SERVICE_FILE = path.join(MCP_DIR, `${SERVICE_NAME}.json`);

function getServicePort() {
  try {
    if (fs.existsSync(SERVICE_FILE)) {
      const serviceInfo = JSON.parse(fs.readFileSync(SERVICE_FILE, 'utf8'));
      return serviceInfo.port;
    }
  } catch (e) {
    debugLog(`Error reading service file: ${e}`);
  }
  return null;
}

function connectToMcpServer() {
  const port = getServicePort();
  if (!port) {
    debugLog('MCP service file not found. Retrying in 5 seconds...');
    setTimeout(connectToMcpServer, 5000);
    return;
  }

  const mcpSocket = net.createConnection({ port: port, host: '127.0.0.1' });

  mcpSocket.on('connect', () => {
    debugLog('Successfully connected to MCP server.');
    
    // Handle communication bi-directionally
    handleCommunication(mcpSocket);
  });

  mcpSocket.on('error', (err) => {
    debugLog(`Connection error: ${err.code}. Will retry.`);
    mcpSocket.destroy();
  });

  mcpSocket.on('close', () => {
    debugLog('Disconnected from MCP server. Retrying in 5 seconds...');
    setTimeout(connectToMcpServer, 5000);
  });
}

function handleCommunication(socket) {
    // --- Browser to Server ---
    let inputBuffer = Buffer.alloc(0);
    const onStdinData = (chunk) => {
        inputBuffer = Buffer.concat([inputBuffer, chunk]);
        while (inputBuffer.length >= 4) {
            const messageLength = inputBuffer.readUInt32LE(0);
            if (inputBuffer.length >= 4 + messageLength) {
                const messageChunk = inputBuffer.slice(4, 4 + messageLength);
                inputBuffer = inputBuffer.slice(4 + messageLength);

				//parse message must be { action: '', 'data': '' }
				//{ response: tabId, data: title }
				
                const parsedMessage = JSON.parse(messageChunk.toString());
                debugLog(`Browser -> Server: ${JSON.stringify(parsedMessage)}`);
                socket.write(JSON.stringify(parsedMessage) + '\n');
            } else {
                break;
            }
        }
    };
    process.stdin.on('data', onStdinData);

    // --- Server to Browser ---
    const onSocketData = (data) => {
        const messages = data.toString().split('\n').filter(Boolean);
        for (const message of messages) {
            debugLog(`Server -> Browser: ${message}`);
            const buffer = Buffer.from(message);
            const header = Buffer.alloc(4);
            header.writeUInt32LE(buffer.length, 0);
            process.stdout.write(header);
            process.stdout.write(buffer);
        }
    };
    socket.on('data', onSocketData);

    // Clean up listeners on disconnect
    socket.on('close', () => {
        process.stdin.removeListener('data', onStdinData);
        socket.removeListener('data', onSocketData);
    });
}

// Start the connection process
connectToMcpServer();
