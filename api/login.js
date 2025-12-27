const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  await client.connect();
  cachedDb = client.db('todoapp');
  return cachedDb;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = await connectToDatabase();
    const users = db.collection('users');
    
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    
    const { username, password } = body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const user = await users.findOne({ username, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    return res.status(200).json({ success: true, username: user.username, name: user.name, tasks: user.tasks || {}, timezone: user.timezone || 'auto' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', message: error.message });
  }
};
