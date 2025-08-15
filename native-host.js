#!/usr/bin/env node

const { exec } = require('child_process');

process.stdin.on('data', (chunk) => {
  const length = chunk.readUInt32LE(0);
  const message = chunk.slice(4).toString();
  const parsedMessage = JSON.parse(message);

  exec(`gemini -p "${parsedMessage.text}"`, (error, stdout, stderr) => {
    if (error) {
      const response = {
        text: `Error: ${error.message}`
      };
      const responseBuffer = Buffer.from(JSON.stringify(response));
      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32LE(responseBuffer.length, 0);

      process.stdout.write(lengthBuffer);
      process.stdout.write(responseBuffer);
      return;
    }
    if (stderr) {
      const response = {
        text: `Stderr: ${stderr}`
      };
      const responseBuffer = Buffer.from(JSON.stringify(response));
      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32LE(responseBuffer.length, 0);

      process.stdout.write(lengthBuffer);
      process.stdout.write(responseBuffer);
      return;
    }

    const response = {
      text: stdout
    };
    const responseBuffer = Buffer.from(JSON.stringify(response));
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(responseBuffer.length, 0);

    process.stdout.write(lengthBuffer);
    process.stdout.write(responseBuffer);
  });
});
