export default async function handler(req: Request) {
  return new Response(JSON.stringify({ 
    message: 'Simple API is working!',
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