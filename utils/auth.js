export function validateApiKey(req) {
  const authKey = req.headers['x-api-key'];
  return authKey === process.env.API_AUTH_KEY;
} 