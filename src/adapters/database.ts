import mongoose from 'mongoose';

export class DatabaseAdapter {
  private static instance: DatabaseAdapter;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseAdapter {
    if (!DatabaseAdapter.instance) {
      DatabaseAdapter.instance = new DatabaseAdapter();
    }
    return DatabaseAdapter.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Database already connected');
      return;
    }

    try {
      let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mtg-investor';
      
      // Replace password placeholder if using MongoDB Atlas
      if (mongoUri.includes('<db_password>') && process.env.DB_PASSWORD) {
        mongoUri = mongoUri.replace('<db_password>', process.env.DB_PASSWORD);
      }
      
      // Set a connection timeout for development
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000, // 10 second timeout for Atlas
        socketTimeoutMS: 10000,
      });
      
      this.isConnected = true;
      console.log('Connected to MongoDB');
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        this.isConnected = false;
      });

    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      console.log('Continuing without database connection...');
      // Don't throw error, just continue without database
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}