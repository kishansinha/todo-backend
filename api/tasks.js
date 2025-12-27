const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI not set');

const client = new MongoClient(uri);
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  await client.connect();
  cachedDb = client.db('todoapp');
  return cachedDb;
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await connectToDatabase();
    const users = db.collection('users');
    
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    
    const action = req.query.action;
    const username = req.query.username || body?.username;

    // SIGNUP
    if (action === 'signup' && req.method === 'POST') {
      const { username, name, password } = body;
      if (!username || !name || !password) {
        return res.status(400).json({ error: 'All fields required' });
      }
      
      const exists = await users.findOne({ username });
      if (exists) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      
      await users.insertOne({ username, name, password, tasks: {}, timezone: 'auto', createdAt: new Date() });
      return res.status(201).json({ success: true, username, name, tasks: {}, timezone: 'auto' });
    }

    // LOGIN
    if (action === 'login' && req.method === 'POST') {
      const { username, password } = body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }
      
      const user = await users.findOne({ username, password });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      return res.status(200).json({ success: true, username: user.username, name: user.name, tasks: user.tasks || {}, timezone: user.timezone || 'auto' });
    }

    // GET user data
    if (req.method === 'GET') {
      if (!username) {
        return res.status(400).json({ error: 'Username required' });
      }
      
      const user = await users.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.status(200).json({ username: user.username, name: user.name, tasks: user.tasks || {}, timezone: user.timezone || 'auto' });
    }

    // PUT - Update
    if (req.method === 'PUT') {
      const { username, tasks, timezone } = body;
      if (!username) {
        return res.status(400).json({ error: 'Username required' });
      }
      
      const update = { updatedAt: new Date() };
      if (tasks !== undefined) update.tasks = tasks;
      if (timezone !== undefined) update.timezone = timezone;
      
      await users.updateOne({ username }, { $set: update });
      return res.status(200).json({ success: true });
    }

    // DELETE - Clear tasks
    if (req.method === 'DELETE') {
      if (!username) {
        return res.status(400).json({ error: 'Username required' });
      }
      
      await users.updateOne({ username }, { $set: { tasks: {}, updatedAt: new Date() } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Server error', message: error.message });
  }
};
