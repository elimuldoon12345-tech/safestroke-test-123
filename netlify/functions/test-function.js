// Test function with NO dependencies - to verify functions are working
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Functions are working!',
      timestamp: new Date().toISOString(),
      env_vars: {
        has_stripe: !!process.env.STRIPE_SECRET_KEY,
        has_supabase: !!process.env.SUPABASE_URL,
        stripe_first_chars: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) : 'not set',
        node_version: process.version
      }
    })
  };
};