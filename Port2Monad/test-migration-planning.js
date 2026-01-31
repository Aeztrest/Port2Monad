import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;
const anthropic = new Anthropic({ apiKey });

const SYSTEM_PROMPT = `You are an expert Solidity developer specializing in blockchain migrations.
Your task is to analyze Solidity smart contract codebases and provide specific migration recommendations for Monad blockchain.

Return recommendations in this JSON format:
{
  "recommendations": [
    {
      "category": "optimization|compatibility|best-practice|security|gas-efficiency",
      "severity": "critical|high|medium|low",
      "confidence": "high|medium|low",
      "title": "Brief title",
      "description": "Detailed description",
      "affectedContracts": ["Contract1", "Contract2"],
      "codeSnippet": "Optional code example",
      "estimatedEffort": "small|medium|large"
    }
  ]
}`;

const testContext = `
Repository: test-repo
Total Contracts: 2

Contract: Token
Type: contract
Functions: 5 (transfer, balanceOf, approve, transferFrom, mint)
State Variables: 3 (balances, allowances, totalSupply)

Contract: TokenSale
Type: contract  
Functions: 3 (buyTokens, withdraw, setPrice)
State Variables: 2 (token, price)
Dependencies: Token

This is a simple ERC20 token with a basic sale contract.
`;

async function testMigrationPlan() {
  console.log('🔄 Testing migration planning with Claude...\n');
  
  try {
    const startTime = Date.now();
    
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Analyze this Solidity codebase for Monad migration and provide recommendations:\n\n${testContext}`,
      }],
    });
    
    const duration = Date.now() - startTime;
    
    console.log('✅ SUCCESS!');
    console.log(`Response time: ${duration}ms`);
    console.log(`Input tokens: ${response.usage.input_tokens}`);
    console.log(`Output tokens: ${response.usage.output_tokens}`);
    console.log('\n--- Claude Response ---');
    console.log(response.content[0].text);
    console.log('\n--- End Response ---');
    
    // Try to parse JSON
    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      console.log('\n✅ JSON extracted successfully');
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`Found ${parsed.recommendations?.length || 0} recommendations`);
    } else {
      console.log('\n⚠️ No JSON found in response');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FAILED');
    console.error('Error:', error.message);
    if (error.status) console.error('Status:', error.status);
    if (error.error) console.error('Details:', error.error);
    process.exit(1);
  }
}

testMigrationPlan();
