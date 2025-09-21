// Simplest possible function - no dependencies
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Function is working!',
      timestamp: new Date().toISOString(),
      path: event.path,
      httpMethod: event.httpMethod
    })
  };
};