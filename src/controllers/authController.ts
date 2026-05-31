import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';

function sign(userId: string, role: string, secret: string, expiresIn: string): string {
  return jwt.sign({ sub: userId, role }, secret, { expiresIn } as jwt.SignOptions);
}

export class AuthController {
  /** POST /api/auth/register — Body: { email, password } */
  public async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body || {};
      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ success: false, error: 'email and password required' });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
        return;
      }
      const existing = await UserModel.findOne({ email });
      if (existing) {
        res.status(409).json({ success: false, error: 'Email already registered' });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await UserModel.create({ email, passwordHash });
      res.status(201).json({ success: true, userId: user._id });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /** POST /api/auth/login — Body: { email, password } */
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body || {};
      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ success: false, error: 'email and password required' });
        return;
      }
      const user = await UserModel.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }
      const secret = process.env.JWT_SECRET;
      const refreshSecret = process.env.JWT_REFRESH_SECRET;
      if (!secret || !refreshSecret) {
        res.status(500).json({ success: false, error: 'Auth not configured' });
        return;
      }
      const accessToken = sign(String(user._id), user.role, secret, '15m');
      const refreshToken = sign(String(user._id), user.role, refreshSecret, '7d');
      res.json({ success: true, accessToken, refreshToken });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /** POST /api/auth/refresh — Body: { refreshToken } */
  public async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken) {
        res.status(400).json({ success: false, error: 'refreshToken required' });
        return;
      }
      const refreshSecret = process.env.JWT_REFRESH_SECRET;
      const secret = process.env.JWT_SECRET;
      if (!refreshSecret || !secret) {
        res.status(500).json({ success: false, error: 'Auth not configured' });
        return;
      }
      const payload = jwt.verify(refreshToken, refreshSecret) as { sub: string; role: string };
      const accessToken = sign(payload.sub, payload.role, secret, '15m');
      res.json({ success: true, accessToken });
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }
  }
}
