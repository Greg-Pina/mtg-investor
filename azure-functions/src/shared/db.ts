import mongoose from 'mongoose';

let connected = false;

export async function ensureConnected(): Promise<void> {
  if (connected && mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);
  connected = true;
}
