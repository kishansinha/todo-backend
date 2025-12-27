const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI environment variable is not set');
}

const client = new MongoClient(uri);
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  await client.connect();
  const db = client.db('todoapp');
  cachedDb = db;
  return db;
}

// Helper function to set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

module.exports = async (req, res) => {
  // Set CORS headers for all requests
  setCorsHeaders(res);

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const db = await connectToDatabase();
    const users = db.collection('users');

    // Parse request body for POST/PUT requests
    let body = req.body;
    if (req.method === 'POST' || req.method === 'PUT') {
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          // Body is already an object
        }
      }
    }

    const { method, query } = req;
    const username = query.username || body?.username;

    // GET - Retrieve user data
    if (method === 'GET') {
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      const userData = await users.findOne({ username });
      
      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        username: userData.username,
        name: userData.name,
        tasks: userData.tasks || {},
        timezone: userData.timezone || 'auto'
      });
    }

    // POST - Signup or Login
    if (method === 'POST') {
      // Determine if it's signup or login based on URL
      const isSignup = req.url.includes('/signup');
      const isLogin = req.url.includes('/login');

      if (isSignup) {
        const { username, name, password } = body;

        if (!username || !name || !password) {
          return res.status(400).json({ error: 'Username, name, and password are required' });
        }

        // Check if user already exists
        const existingUser = await users.findOne({ username });
        if (existingUser) {
          return res.status(409).json({ error: 'Username already exists' });
        }

        // Create new user
        await users.insertOne({
          username,
          name,
          password,
          tasks: {},
          timezone: 'auto',
          createdAt: new Date()
        });

        return res.status(201).json({
          success: true,
          username,
          name,
          tasks: {},
          timezone: 'auto'
        });
      }

      if (isLogin) {
        const { username, password } = body;

        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await users.findOne({ username, password });

        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        return res.status(200).json({
          success: true,
          username: user.username,
          name: user.name,
          tasks: user.tasks || {},
          timezone: user.timezone || 'auto'
        });
      }

      return res.status(400).json({ error: 'Invalid endpoint' });
    }

    // PUT - Update user tasks and settings
    if (method === 'PUT') {
      const { username, tasks, timezone } = body;

      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      const updateData = {};
      if (tasks !== undefined) updateData.tasks = tasks;
      if (timezone !== undefined) updateData.timezone = timezone;
      updateData.updatedAt = new Date();

      await users.updateOne(
        { username },
        { $set: updateData }
      );

      return res.status(200).json({ success: true });
    }

    // DELETE - Clear all tasks for a user
    if (method === 'DELETE') {
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      await users.updateOne(
        { username },
        { $set: { tasks: {}, updatedAt: new Date() } }
      );

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
};
