const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod = null;

// Setup before all tests
beforeAll(async () => {
  try {
    // Start in-memory MongoDB server
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Test database connected successfully');
  } catch (error) {
    console.error('Test database connection failed:', error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    // Close mongoose connections
    await mongoose.connection.close();
    
    // Stop the in-memory MongoDB server
    if (mongod) {
      await mongod.stop();
    }
    
    console.log('Test database disconnected and cleaned up');
  } catch (error) {
    console.error('Test database cleanup failed:', error);
  }
});

// Clean up database between tests
afterEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
});
