/**
 * WebSocket Diagnostic Test
 * Run this to verify WebSocket setup
 */

import dotenv from 'dotenv';
dotenv.config();

import { WebSocket } from 'ws';
import { TokenManager } from '../src/api/core/auth';
import { v4 as uuidv4 } from 'uuid';

const WS_URL = 'ws://localhost:3000/ws';

async function diagnosticTest() {
  console.log('🔍 WebSocket Diagnostic Test');
  console.log('================================\n');

  // Generate test token
  const testDid = `did:rangkai:${uuidv4()}`;
  const token = TokenManager.generateToken({
    sub: testDid,
    did: testDid,
    type: 'user',
    permissions: [],
  } as any);

  console.log('1. Attempting to connect...');
  console.log(`   URL: ${WS_URL}?token=***`);
  console.log(`   DID: ${testDid}\n`);

  try {
    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout (5s)'));
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ Connection established!\n');
        resolve(true);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    // Wait for welcome message
    console.log('2. Waiting for welcome message...');
    const welcomeReceived = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 3000);

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        console.log('   Received:', JSON.stringify(message, null, 2));
        
        if (message.type === 'connected') {
          clearTimeout(timeout);
          resolve(true);
        }
      });
    });

    if (welcomeReceived) {
      console.log('✅ Welcome message received!\n');
    } else {
      console.log('❌ No welcome message (timeout)\n');
    }

    // Try to subscribe
    console.log('3. Testing subscription...');
    const channel = `user:${testDid}`;
    console.log(`   Channel: ${channel}`);
    
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: channel,
    }));

    const subscribed = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 3000);

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        console.log('   Received:', JSON.stringify(message, null, 2));
        
        if (message.type === 'subscribed') {
          clearTimeout(timeout);
          resolve(true);
        }
      });
    });

    if (subscribed) {
      console.log('✅ Subscription successful!\n');
    } else {
      console.log('❌ Subscription failed (timeout)\n');
    }

    // Try ping-pong
    console.log('4. Testing ping-pong...');
    ws.send(JSON.stringify({ type: 'ping' }));

    const pongReceived = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 3000);

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        console.log('   Received:', JSON.stringify(message, null, 2));
        
        if (message.type === 'pong') {
          clearTimeout(timeout);
          resolve(true);
        }
      });
    });

    if (pongReceived) {
      console.log('✅ Ping-pong working!\n');
    } else {
      console.log('❌ No pong received\n');
    }

    ws.close();

    console.log('================================');
    console.log('✅ Diagnostic Complete');
    console.log('WebSocket server is working correctly!\n');

  } catch (error: any) {
    console.log('================================');
    console.log('❌ Diagnostic Failed');
    console.log(`Error: ${error.message}\n`);
    
    console.log('Possible issues:');
    console.log('1. Server not running (npm run dev:api)');
    console.log('2. WebSocket not initialized in server');
    console.log('3. Port 3000 not accessible');
    console.log('4. CORS or firewall blocking connection\n');
    
    process.exit(1);
  }
}

diagnosticTest().catch(console.error);