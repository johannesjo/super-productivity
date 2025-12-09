import { getDb, User } from './db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Logger } from './logger';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from './email';

// Auth constants
const MIN_JWT_SECRET_LENGTH = 32;
const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY = '7d';
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Account lockout constants
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters for security`,
    );
  }
  return secret;
};

const JWT_SECRET = getJwtSecret();

export const registerUser = async (
  email: string,
  password: string,
  termsAcceptedAt?: number,
): Promise<{ message: string }> => {
  // Password strength validation is handled by Zod in api.ts

  const db = getDb();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const verificationToken = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + VERIFICATION_TOKEN_EXPIRY_MS;
  const acceptedAt = termsAcceptedAt || Date.now();

  try {
    const info = db
      .prepare(
        `
      INSERT INTO users (email, password_hash, verification_token, verification_token_expires_at, terms_accepted_at)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(email, passwordHash, verificationToken, expiresAt, acceptedAt);

    Logger.info(`User registered (ID: ${info.lastInsertRowid})`);

    // Send verification email asynchronously
    const emailSent = await sendVerificationEmail(email, verificationToken);
    if (!emailSent) {
      // Clean up the newly created account to prevent unusable, un-verifiable entries
      try {
        db.prepare('DELETE FROM users WHERE id = ?').run(info.lastInsertRowid);
        Logger.info(`Cleaned up failed registration (ID: ${info.lastInsertRowid})`);
      } catch (cleanupErr) {
        // Log but don't mask the original email failure
        Logger.error(
          `Failed to clean up user ${info.lastInsertRowid} after email failure:`,
          cleanupErr,
        );
      }
      throw new Error('Failed to send verification email. Please try again later.');
    }
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const existingUser = db
        .prepare('SELECT * FROM users WHERE email = ?')
        .get(email) as User | undefined;

      if (!existingUser) {
        Logger.warn('Unique constraint hit but user not found');
      } else if (existingUser.is_verified === 1) {
        Logger.info(
          `Registration attempt for already verified account (ID: ${existingUser.id})`,
        );
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
          : Date.now() + VERIFICATION_TOKEN_EXPIRY_MS;

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
          try {
            db.prepare(
              `
              UPDATE users
              SET verification_token = ?, verification_token_expires_at = ?, verification_resend_count = ?
              WHERE id = ?
            `,
            ).run(previousToken, previousExpiresAt, previousResendCount, existingUser.id);
            Logger.info(
              `Rolled back token update for user ${existingUser.id} after email failure`,
            );
          } catch (rollbackErr) {
            // Log but don't mask the original email failure
            Logger.error(
              `Failed to rollback token update for user ${existingUser.id}:`,
              rollbackErr,
            );
          }

          throw new Error('Failed to send verification email. Please try again later.');
        }

        Logger.info(
          `Resent verification email (ID: ${existingUser.id}, count: ${
            previousResendCount + 1
          })`,
        );
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

  Logger.info(`User verified (ID: ${user.id})`);
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

  // Check if account is locked (do this after fetching user but before password check)
  if (user && user.locked_until && user.locked_until > Date.now()) {
    const remainingMinutes = Math.ceil((user.locked_until - Date.now()) / 60000);
    Logger.warn(
      `Login attempt for locked account (ID: ${user.id}), ${remainingMinutes}min remaining`,
    );
    throw new Error(
      'Account temporarily locked due to too many failed login attempts. Please try again later.',
    );
  }

  // Timing attack mitigation: always perform a comparison
  // Even if the user is not found, we hash and compare against a dummy hash.
  // This ensures the response time is roughly the same for valid and invalid emails,
  // preventing attackers from enumerating valid email addresses based on timing differences.
  // This is a valid bcrypt hash (12 rounds) of the string "dummy"
  const dummyHash = '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
  const hashToCompare = user ? user.password_hash : dummyHash;

  const isMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !isMatch) {
    // Increment failed attempts if user exists
    if (user) {
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      const shouldLock = newFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;
      const lockedUntil = shouldLock ? Date.now() + LOCKOUT_DURATION_MS : null;

      db.prepare(
        'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
      ).run(newFailedAttempts, lockedUntil, user.id);

      if (shouldLock) {
        Logger.warn(
          `Account locked after ${newFailedAttempts} failed attempts (ID: ${user.id})`,
        );
      } else {
        Logger.debug(
          `Failed login attempt ${newFailedAttempts}/${MAX_FAILED_LOGIN_ATTEMPTS} (ID: ${user.id})`,
        );
      }
    }
    throw new Error('Invalid credentials');
  }

  if (user.is_verified === 0) {
    throw new Error('Email not verified');
  }

  // Reset failed attempts on successful login
  if (user.failed_login_attempts > 0 || user.locked_until) {
    db.prepare(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
    ).run(user.id);
  }

  // Include token_version in JWT for revocation support
  const tokenVersion = user.token_version ?? 0;
  const token = jwt.sign(
    { userId: user.id, email: user.email, tokenVersion },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY },
  );

  Logger.info(`User logged in (ID: ${user.id})`);

  return { token, user: { id: user.id, email: user.email } };
};

/**
 * Revoke all existing tokens for a user by incrementing their token version.
 * Call this when the user changes their password or explicitly logs out all devices.
 */
export const revokeAllTokens = (userId: number): void => {
  const db = getDb();
  db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(
    userId,
  );
  Logger.info(`All tokens revoked for user ${userId}`);
};

/**
 * Replace the current JWT with a new one.
 * This invalidates all existing tokens (including the current one) and returns a fresh token.
 * Use this when a token was accidentally shared or compromised.
 */
export const replaceToken = (
  userId: number,
  email: string,
): { token: string; user: { id: number; email: string } } => {
  const db = getDb();

  // Use transaction to ensure atomicity of version increment and read
  const newTokenVersion = db.transaction(() => {
    // Increment token version to invalidate all existing tokens
    db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(
      userId,
    );

    // Get the new token version
    const user = db
      .prepare('SELECT token_version FROM users WHERE id = ?')
      .get(userId) as { token_version: number } | undefined;

    if (!user) {
      throw new Error('User not found');
    }

    return user.token_version;
  })();

  const token = jwt.sign({ userId, email, tokenVersion: newTokenVersion }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });

  Logger.info(`Token replaced for user ${userId} (new version: ${newTokenVersion})`);

  return { token, user: { id: userId, email } };
};

export const verifyToken = async (
  token: string,
): Promise<{ userId: number; email: string } | null> => {
  try {
    const payload = await new Promise<{
      userId: number;
      email: string;
      tokenVersion?: number;
    }>((resolve, reject) => {
      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded as { userId: number; email: string; tokenVersion?: number });
      });
    });

    // Verify user exists and token version matches
    const db = getDb();
    const user = db
      .prepare('SELECT id, token_version FROM users WHERE id = ?')
      .get(payload.userId) as { id: number; token_version: number } | undefined;

    if (!user) {
      Logger.warn(`Token verification failed: User ${payload.userId} not found in DB`);
      return null;
    }

    // Check token version - if it doesn't match, the token has been revoked
    // (e.g., user changed password). Tokens without version are treated as version 0.
    const tokenVersion = payload.tokenVersion ?? 0;
    const currentVersion = user.token_version ?? 0;
    if (tokenVersion !== currentVersion) {
      Logger.warn(
        `Token verification failed: Token version mismatch for user ${payload.userId} ` +
          `(token: ${tokenVersion}, current: ${currentVersion})`,
      );
      return null;
    }

    return { userId: payload.userId, email: payload.email };
  } catch (err) {
    return null;
  }
};
