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
    Logger.warn('JWT_SECRET not set - using random secret for development');
    return randomBytes(64).toString('hex');
  }
  return secret;
};

const JWT_SECRET = getJwtSecret();

export const registerUser = async (
  email: string,
  password: string,
): Promise<{ message: string }> => {
  // Password strength validation is handled by Zod in api.ts

  const db = getDb();
  const passwordHash = bcrypt.hashSync(password, 12);
  const verificationToken = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  try {
    const info = db
      .prepare(
        `
      INSERT INTO users (email, password_hash, verification_token, verification_token_expires_at)
      VALUES (?, ?, ?, ?)
    `,
      )
      .run(email, passwordHash, verificationToken, expiresAt);

    Logger.info(`User registered: ${email} (ID: ${info.lastInsertRowid})`);

    // Send verification email asynchronously
    const emailSent = await sendVerificationEmail(email, verificationToken);
    if (!emailSent) {
      // Clean up the newly created account to prevent unusable, un-verifiable entries
      db.prepare('DELETE FROM users WHERE id = ?').run(info.lastInsertRowid);
      throw new Error('Failed to send verification email. Please try again later.');
    }
  } catch (err: any) {
    // If unique constraint violation (user exists), we swallow the error
    // to prevent email enumeration.
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      Logger.info(`Registration attempt for existing email: ${email}`);
      // In a real system, we might want to send a "You already have an account" email here
    } else {
      throw err;
    }
  }

  return {
    message: 'Registration successful. Please check your email to verify your account.',
  };
};

export const verifyEmail = (token: string): boolean => {
  const db = getDb();

  const user = db
    .prepare('SELECT * FROM users WHERE verification_token = ?')
    .get(token) as User | undefined;

  if (!user) {
    throw new Error('Invalid verification token');
  }

  if (
    user.verification_token_expires_at &&
    user.verification_token_expires_at < Date.now()
  ) {
    throw new Error('Verification token has expired');
  }

  db.prepare(
    'UPDATE users SET is_verified = 1, verification_token = NULL, verification_token_expires_at = NULL WHERE id = ?',
  ).run(user.id);

  Logger.info(`User verified: ${user.email}`);
  return true;
};

export const loginUser = (
  email: string,
  password: string,
): { token: string; user: { id: number; email: string } } => {
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | User
    | undefined;

  // Timing attack mitigation: always perform a comparison
  // Use a dummy hash so the comparison takes roughly the same time
  // $2a$12$ is bcrypt prefix for 12 rounds
  const dummyHash = '$2a$12$e0MyzXyjpJS7dAC5B5S3.O/p.u.m.u.m.u.m.u.m.u.m.u.m.u.m.';
  const hashToCompare = user ? user.password_hash : dummyHash;

  const isMatch = bcrypt.compareSync(password, hashToCompare);

  if (!user || !isMatch) {
    throw new Error('Invalid credentials');
  }

  if (user.is_verified === 0) {
    throw new Error('Email not verified');
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '7d',
  });

  return { token, user: { id: user.id, email: user.email } };
};

export const verifyToken = (token: string): { userId: number; email: string } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
  } catch (err) {
    return null;
  }
};
