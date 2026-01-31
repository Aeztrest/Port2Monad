import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;

console.log('Testing Claude API connection...');
console.log('API Key present:', apiKey ? 'Yes' : 'No');
console.log('API Key prefix:', apiKey ? apiKey.substring(0, 20) + '...' : 'N/A');

const anthropic = new Anthropic({
  apiKey: apiKey,
});

async function testConnection() {
  const models = [
    'claude-3-5-sonnet-latest',
    'claude-3-5-sonnet',
    'claude-3-sonnet-20240229',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307'
  ];
  
  for (const model of models) {
    try {
      console.log(`\n🔄 Testing model: ${model}`);
      const startTime = Date.now();
      
      const message = await anthropic.messages.create({
        model: model,
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: 'Say "Connection successful!" in exactly 3 words.'
        }]
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('\n✅ SUCCESS with model:', model);
      console.log('Response time:', duration, 'ms');
      console.log('Usage:', JSON.stringify(message.usage, null, 2));
      console.log('Response:', message.content[0].text);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed with ${model}:`, error.message);
      continue;
    }
  }
}

testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
