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
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const db = await connectToDatabase();
    const users = db.collection('users');
    
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    
    const username = req.query.username || body?.username;

    // GET - Retrieve user data
    if (req.method === 'GET') {
      if (!username) return res.status(400).json({ error: 'Username required' });
      
      const user = await users.findOne({ username });
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      return res.status(200).json({ username: user.username, name: user.name, tasks: user.tasks || {}, timezone: user.timezone || 'auto' });
    }

    // PUT - Update
    if (req.method === 'PUT') {
      const { username, tasks, timezone } = body;
      if (!username) return res.status(400).json({ error: 'Username required' });
      
      const update = { updatedAt: new Date() };
      if (tasks !== undefined) update.tasks = tasks;
      if (timezone !== undefined) update.timezone = timezone;
      
      await users.updateOne({ username }, { $set: update });
      return res.status(200).json({ success: true });
    }

    // DELETE - Clear tasks
    if (req.method === 'DELETE') {
      if (!username) return res.status(400).json({ error: 'Username required' });
      
      await users.updateOne({ username }, { $set: { tasks: {}, updatedAt: new Date() } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    return res.status(500).json({ error: 'Server error', message: error.message });
  }
};
