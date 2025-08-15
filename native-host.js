#!/usr/bin/env node

const net = require('net');
const fs = require('fs');
const path = require('path');

const MCP_DIR = path.join(process.env.HOME, '.mcp', 'services');
const SERVICE_NAME = 'com.my.native_host';
const SERVICE_FILE = path.join(MCP_DIR, `${SERVICE_NAME}.json`);

let extensionPort;
let mcpSocket;
const pendingRequests = new Map();

// --- Service Discovery ---

function registerService(port) {
  if (!fs.existsSync(MCP_DIR)) {
    fs.mkdirSync(MCP_DIR, { recursive: true });
  }

  const serviceInfo = {
    name: SERVICE_NAME,
    port: port
  };

  fs.writeFileSync(SERVICE_FILE, JSON.stringify(serviceInfo, null, 2));
}

function unregisterService() {
  if (fs.existsSync(SERVICE_FILE)) {
    fs.unlinkSync(SERVICE_FILE);
  }
}

// --- MCP Server Implementation ---

const server = net.createServer((socket) => {
  console.log('MCP client connected');
  mcpSocket = socket;
  sendExtensionStatus('connected');

  mcpSocket.on('data', (data) => {
    const messages = data.toString().split('\n').filter(Boolean);
    for (const message of messages) {
      try {
        const mcpMessage = JSON.parse(message);
        handleMcpMessage(mcpMessage);
      } catch (e) {
        sendMcpError('Invalid JSON');
      }
    }
  });

  mcpSocket.on('close', () => {
    console.log('MCP client disconnected');
    mcpSocket = null;
    sendExtensionStatus('disconnected');
  });

  mcpSocket.on('error', (err) => {
    console.error('MCP socket error:', err);
  });
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  registerService(port);
});

process.on('exit', unregisterService);

// ... (The rest of the file is the same, but I will add the sendExtensionStatus function)

function sendExtensionStatus(status) {
  if (extensionPort) {
    const msg = {
      action: 'mcpStatus',
      status: status
    };
    const buffer = Buffer.from(JSON.stringify(msg));
    const header = Buffer.alloc(4);
    header.writeUInt32LE(buffer.length, 0);
    extensionPort.stdout.write(header);
    extensionPort.stdout.write(buffer);
  }
}

// ... (The rest of the file is the same)
