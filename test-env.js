// Quick test to verify environment variables are accessible
console.log('🔑 Environment Variable Test:');
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('✅ Environment test complete'); 