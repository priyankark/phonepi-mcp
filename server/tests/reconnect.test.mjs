import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { WebSocket } from 'ws';

test('a replaced phone closing does not disconnect the new phone from MCP', { timeout: 15000 }, async () => {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/index.js', '--stdio', '--port', String(port)], stderr: 'pipe' });
  const client = new Client({ name: 'reconnection-regression', version: '1.0.0' });
  let first, second;
  try {
    await client.connect(transport);
    const attach = async () => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}`);
      socket.on('message', raw => {
        const message = JSON.parse(raw);
        if (message.type === 'ping') socket.send(JSON.stringify({ type: 'pong' }));
        if (message.type === 'request') socket.send(JSON.stringify({ type: 'response', requestId: message.requestId, data: { success: true, batteryLevel: 87 } }));
      });
      await once(socket, 'open');
      return socket;
    };
    first = await attach();
    const closed = once(first, 'close');
    second = await attach();
    await closed;
    await delay(50);
    const result = await client.callTool({ name: 'get_battery_level', arguments: {} });
    assert.equal(result.isError, undefined, JSON.stringify(result));
    assert.match(JSON.stringify(result), /87/);
  } finally {
    first?.terminate();
    second?.terminate();
    await client.close();
  }
});
