export default async function handler(req: Request) {
  return new Response(JSON.stringify({ 
    message: 'API is working!',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
} 