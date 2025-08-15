#!/usr/bin/env node

process.stdin.on('data', (chunk) => {
  const length = chunk.readUInt32LE(0);
  const message = chunk.slice(4).toString();

  if (message === '{"text":"Hello"}') {
    const response = {
      text: 'There'
    };
    const responseBuffer = Buffer.from(JSON.stringify(response));
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(responseBuffer.length, 0);

    process.stdout.write(lengthBuffer);
    process.stdout.write(responseBuffer);
  }
});
