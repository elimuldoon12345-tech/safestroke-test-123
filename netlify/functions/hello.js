exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      message: "Hello from Netlify Functions!",
      time: new Date().toISOString()
    })
  };
};