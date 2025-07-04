export default async function handler(req) {
  return new Response(JSON.stringify({ 
    message: 'JavaScript API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
} 