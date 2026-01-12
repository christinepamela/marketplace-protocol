/**
 * Create Test Token Script
 * Generates a test provider identity and JWT token for API testing
 */

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Fixed: Use SUPABASE_SERVICE_KEY (not SUPABASE_SERVICE_ROLE_KEY)
);

async function createTestToken() {
  try {
    console.log('🔑 Creating test provider identity...\n');
    
    // Create a test KYC identity
    const { data: identity, error } = await supabase
      .from('identities')
      .insert({
        type: 'kyc',
        kyc_data: { 
          name: 'Test Provider',
          country: 'MY',
          business_license: 'TEST-LICENSE-123'
        }
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Test Identity Created');
    console.log('   DID:', identity.did);
    console.log('');
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        did: identity.did, 
        sub: identity.did, 
        type: 'kyc' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    console.log('✅ JWT Token Generated (valid for 30 days)');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('COPY THIS TOKEN:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(token);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📋 Save these for testing:');
    console.log(`   DID: ${identity.did}`);
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestToken();