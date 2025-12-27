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
    
    const { username, name, password } = body;
    if (!username || !name || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    const exists = await users.findOne({ username });
    if (exists) return res.status(409).json({ error: 'Username already exists' });
    
    await users.insertOne({ username, name, password, tasks: {}, timezone: 'auto', createdAt: new Date() });
    return res.status(201).json({ success: true, username, name, tasks: {}, timezone: 'auto' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', message: error.message });
  }
};
