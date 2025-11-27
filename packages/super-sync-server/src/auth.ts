import { getDb, User } from './db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Logger } from './logger';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from './email';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    Logger.warn('JWT_SECRET not set - using insecure default for development only');
    return 'dev-only-insecure-secret';
  }
  return secret;
};

const JWT_SECRET = getJwtSecret();

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email);

export const registerUser = (email: string, password: string) => {
  // Validate email format
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  // Validate password length
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const db = getDb();

  // Check if user exists
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const verificationToken = randomBytes(32).toString('hex');

  const info = db
    .prepare(
      `
    INSERT INTO users (email, password_hash, verification_token)
    VALUES (?, ?, ?)
  `,
    )
    .run(email, passwordHash, verificationToken);

  Logger.info(`User registered: ${email} (ID: ${info.lastInsertRowid})`);

  // Send verification email asynchronously
  sendVerificationEmail(email, verificationToken).catch((err) => {
    Logger.error(`Failed to send verification email to ${email}:`, err);
  });

  return {
    id: info.lastInsertRowid,
    email,
    // verificationToken, // Don't return token in response for security, user must check email
  };
};

export const verifyEmail = (token: string) => {
  const db = getDb();

  const user = db
    .prepare('SELECT * FROM users WHERE verification_token = ?')
    .get(token) as User | undefined;

  if (!user) {
    throw new Error('Invalid verification token');
  }

  db.prepare(
    'UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?',
  ).run(user.id);

  Logger.info(`User verified: ${user.email}`);
  return true;
};

export const loginUser = (email: string, password: string) => {
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | User
    | undefined;

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    throw new Error('Invalid credentials');
  }

  if (user.is_verified === 0) {
    throw new Error('Email not verified');
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '30d',
  });

  return { token, user: { id: user.id, email: user.email } };
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
  } catch (err) {
    return null;
  }
};
