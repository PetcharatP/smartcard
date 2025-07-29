// Vercel serverless function to proxy API requests
export default async function handler(req, res) {
  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path || '';
  
  // Backend API URL
  const backendUrl = `http://103.91.205.153:3000/api/${apiPath}`;
  
  try {
    // Forward the request to your backend
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward other necessary headers
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization }),
      },
      ...(req.method !== 'GET' && req.method !== 'HEAD' && { 
        body: JSON.stringify(req.body) 
      }),
    });

    const data = await response.json();
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
}
