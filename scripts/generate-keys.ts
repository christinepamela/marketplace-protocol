/**
 * Generate ECDSA key pair for signing reputation proofs
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

async function generateKeys() {
  console.log('Generating ECDSA P-256 key pair...');

  // Generate key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1', // P-256
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // Save to files
  const keysDir = path.join(__dirname, '..', 'keys');
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  fs.writeFileSync(path.join(keysDir, 'private.pem'), privateKey);
  fs.writeFileSync(path.join(keysDir, 'public.pem'), publicKey);

  console.log('\n✅ Keys generated successfully!');
  console.log('\nPrivate key saved to: keys/private.pem');
  console.log('Public key saved to: keys/public.pem');
  console.log('\n⚠️  IMPORTANT: Add keys/ directory to .gitignore');
  console.log('⚠️  Store private key securely (do not commit to git)');
  
  // Show keys for .env
  console.log('\n📋 Add these to your .env file:');
  console.log('\nPROTOCOL_SIGNING_KEY_PEM="' + privateKey.replace(/\n/g, '\\n') + '"');
  console.log('\nPROTOCOL_VERIFYING_KEY_PEM="' + publicKey.replace(/\n/g, '\\n') + '"');
}

generateKeys().catch(console.error);