#!/usr/bin/env node

const net = require('net');

// This is the one variable we need to connect the two conversations.
// It will hold the function that knows how to send the final response
// back to the MCP server socket.
let sendFinalResponse;

// --- Part 1: Listen for the final answer from the browser ---
process.stdin.on('data', (buffer) => {
    // The browser sends a 4-byte length header, followed by the message.
    try {
        const messageLength = buffer.readUInt32LE(0);
        if (buffer.length >= 4 + messageLength) {
            const messageJson = buffer.slice(4, 4 + messageLength).toString();
            const finalAnswer = JSON.parse(messageJson);

            // If we have a function waiting, it means we are in the middle of a
            // request. We call it now with the final answer.
            if (sendFinalResponse) {
                sendFinalResponse(finalAnswer);
                sendFinalResponse = null; // Clear it after use
            }
        }
    } catch (e) {
        // Handle cases where the buffer is malformed
        if (sendFinalResponse) {
            sendFinalResponse({ error: `Error reading from browser: ${e.message}`});
            sendFinalResponse = null;
        }
    }
});


// --- Part 2: Listen for the initial request from the MCP Server ---
const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        try {
            const request = JSON.parse(data.toString());

            // If a request is already in progress, reject this new one.
            if (sendFinalResponse) {
                socket.write(JSON.stringify({ id: request.id, error: "Host is busy" }) + '\n');
                return;
            }

            // We define the function that will handle the eventual response.
            // Its job is to write the final answer back to this specific socket.
            // We store it in our single global variable.
            sendFinalResponse = (browserResponse) => {
                socket.write(JSON.stringify(browserResponse) + '\n');
            };

            // Now, we send the request to the browser via standard output,
            // making sure to frame it with the 4-byte length header.
            const requestBuffer = Buffer.from(JSON.stringify(request));
            const header = Buffer.alloc(4);
            header.writeUInt32LE(requestBuffer.length, 0);
            process.stdout.write(header);
            process.stdout.write(requestBuffer);
            //Here you can start readin async because it will send the 4 bytes
            //and the response is the length of th4 uin32le next bytes and only one message a time
            //No need to be more complicated
        } catch (e) {
            socket.write(JSON.stringify({ error: `Invalid request from client: ${e.message}` }) + '\n');
        }
    });

    socket.on('error', () => { /* ignore client errors */ });
});

server.listen(8888);
