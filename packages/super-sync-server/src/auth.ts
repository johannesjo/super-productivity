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
  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = randomBytes(32).toString('hex');
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const expiresAt = Date.now() + TWENTY_FOUR_HOURS_MS;

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
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const existingUser = db
        .prepare('SELECT * FROM users WHERE email = ?')
        .get(email) as User | undefined;

      if (!existingUser) {
        Logger.warn(`Unique constraint hit but user not found for email: ${email}`);
      } else if (existingUser.is_verified === 1) {
        Logger.info(`Registration attempt for verified email: ${email}`);
      } else if (existingUser.verification_resend_count >= 1) {
        Logger.info(`Verification resend already sent for email: ${email}`);
      } else {
        const tokenStillValid =
          !!existingUser.verification_token &&
          !!existingUser.verification_token_expires_at &&
          existingUser.verification_token_expires_at > Date.now();

        const newToken =
          tokenStillValid && existingUser.verification_token
            ? existingUser.verification_token
            : randomBytes(32).toString('hex');
        const newExpiresAt = tokenStillValid
          ? existingUser.verification_token_expires_at
          : Date.now() + TWENTY_FOUR_HOURS_MS;

        const previousToken = existingUser.verification_token;
        const previousExpiresAt = existingUser.verification_token_expires_at;
        const previousResendCount = existingUser.verification_resend_count;

        db.prepare(
          `
            UPDATE users
            SET verification_token = ?, verification_token_expires_at = ?, verification_resend_count = verification_resend_count + 1
            WHERE id = ?
          `,
        ).run(newToken, newExpiresAt, existingUser.id);

        const emailSent = await sendVerificationEmail(email, newToken);
        if (!emailSent) {
          db.prepare(
            `
              UPDATE users
              SET verification_token = ?, verification_token_expires_at = ?, verification_resend_count = ?
              WHERE id = ?
            `,
          ).run(previousToken, previousExpiresAt, previousResendCount, existingUser.id);

          throw new Error('Failed to send verification email. Please try again later.');
        }

        Logger.info(`Resent verification email for: ${email}`);
      }
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
    `
      UPDATE users
      SET is_verified = 1, verification_token = NULL, verification_token_expires_at = NULL, verification_resend_count = 0
      WHERE id = ?
    `,
  ).run(user.id);

  Logger.info(`User verified: ${user.email}`);
  return true;
};

export const loginUser = async (
  email: string,
  password: string,
): Promise<{ token: string; user: { id: number; email: string } }> => {
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | User
    | undefined;

  // Timing attack mitigation: always perform a comparison
  // Even if the user is not found, we hash and compare against a dummy hash.
  // This ensures the response time is roughly the same for valid and invalid emails,
  // preventing attackers from enumerating valid email addresses based on timing differences.
  // This is a valid bcrypt hash (12 rounds) of the string "dummy"
  const dummyHash = '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
  const hashToCompare = user ? user.password_hash : dummyHash;

  const isMatch = await bcrypt.compare(password, hashToCompare);

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

export const verifyToken = async (
  token: string,
): Promise<{ userId: number; email: string } | null> => {
  try {
    const payload = await new Promise<{ userId: number; email: string }>(
      (resolve, reject) => {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded as { userId: number; email: string });
        });
      },
    );

    // Verify user exists in DB to prevent foreign key errors if user was deleted
    // or if the DB was reset but the client has an old token
    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(payload.userId);

    if (!user) {
      Logger.warn(`Token verification failed: User ${payload.userId} not found in DB`);
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
};
