import { prisma, User } from './db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Logger } from './logger';
import { randomBytes } from 'crypto';
import { sendVerificationEmail, sendPasswordResetEmail } from './email';
import { Prisma } from '@prisma/client';

// Auth constants
const MIN_JWT_SECRET_LENGTH = 32;
const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY = '7d';
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_PASSWORD_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

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

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const verificationToken = randomBytes(32).toString('hex');
  const expiresAt = BigInt(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS);
  const acceptedAt = termsAcceptedAt ? BigInt(termsAcceptedAt) : BigInt(Date.now());

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        verificationToken,
        verificationTokenExpiresAt: expiresAt,
        termsAcceptedAt: acceptedAt,
      },
    });

    Logger.info(`User registered (ID: ${user.id})`);

    // Send verification email asynchronously
    const emailSent = await sendVerificationEmail(email, verificationToken);
    if (!emailSent) {
      // Clean up the newly created account to prevent unusable, un-verifiable entries
      try {
        await prisma.user.delete({ where: { id: user.id } });
        Logger.info(`Cleaned up failed registration (ID: ${user.id})`);
      } catch (cleanupErr) {
        // Log but don't mask the original email failure
        Logger.error(
          `Failed to clean up user ${user.id} after email failure:`,
          cleanupErr,
        );
      }
      throw new Error('Failed to send verification email. Please try again later.');
    }
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002' // Unique constraint violation (email)
    ) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (!existingUser) {
        Logger.warn('Unique constraint hit but user not found');
      } else if (existingUser.isVerified === 1) {
        Logger.info(
          `Registration attempt for already verified account (ID: ${existingUser.id})`,
        );
      } else {
        const now = BigInt(Date.now());
        const tokenStillValid =
          !!existingUser.verificationToken &&
          !!existingUser.verificationTokenExpiresAt &&
          existingUser.verificationTokenExpiresAt > now;

        const newToken =
          tokenStillValid && existingUser.verificationToken
            ? existingUser.verificationToken
            : randomBytes(32).toString('hex');
        const newExpiresAt =
          tokenStillValid && existingUser.verificationTokenExpiresAt
            ? existingUser.verificationTokenExpiresAt
            : BigInt(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS);

        const previousToken = existingUser.verificationToken;
        const previousExpiresAt = existingUser.verificationTokenExpiresAt;
        const previousResendCount = existingUser.verificationResendCount;

        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            verificationToken: newToken,
            verificationTokenExpiresAt: newExpiresAt,
            verificationResendCount: { increment: 1 },
          },
        });

        const emailSent = await sendVerificationEmail(email, newToken);
        if (!emailSent) {
          try {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                verificationToken: previousToken,
                verificationTokenExpiresAt: previousExpiresAt,
                verificationResendCount: previousResendCount,
              },
            });
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

export const verifyEmail = async (token: string): Promise<boolean> => {
  const user = await prisma.user.findFirst({
    where: { verificationToken: token },
  });

  if (!user) {
    throw new Error('Invalid verification token');
  }

  if (
    user.verificationTokenExpiresAt &&
    user.verificationTokenExpiresAt < BigInt(Date.now())
  ) {
    throw new Error('Verification token has expired');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: 1,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      verificationResendCount: 0,
    },
  });

  Logger.info(`User verified (ID: ${user.id})`);
  return true;
};

export const loginUser = async (
  email: string,
  password: string,
): Promise<{ token: string; user: { id: number; email: string } }> => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Check if account is locked (do this after fetching user but before password check)
  if (user && user.lockedUntil && user.lockedUntil > BigInt(Date.now())) {
    const remainingMinutes = Math.ceil(
      Number(user.lockedUntil - BigInt(Date.now())) / 60000,
    );
    Logger.warn(
      `Login attempt for locked account (ID: ${user.id}), ${remainingMinutes}min remaining`,
    );
    throw new Error(
      'Account temporarily locked due to too many failed login attempts. Please try again later.',
    );
  }

  // Timing attack mitigation: always perform a comparison
  // Even if the user is not found, we hash and compare against a dummy hash.
  const dummyHash = '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
  const hashToCompare = user ? user.passwordHash : dummyHash;

  const isMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !isMatch) {
    // Increment failed attempts if user exists
    if (user) {
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      const shouldLock = newFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;
      const lockedUntil = shouldLock ? BigInt(Date.now() + LOCKOUT_DURATION_MS) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newFailedAttempts,
          lockedUntil,
        },
      });

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

  if (user.isVerified === 0) {
    throw new Error('Email not verified');
  }

  // Reset failed attempts on successful login
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  // Include token_version in JWT for revocation support
  const tokenVersion = user.tokenVersion ?? 0;
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
export const revokeAllTokens = async (userId: number): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
  Logger.info(`All tokens revoked for user ${userId}`);
};

/**
 * Replace the current JWT with a new one.
 * This invalidates all existing tokens (including the current one) and returns a fresh token.
 */
export const replaceToken = async (
  userId: number,
  email: string,
): Promise<{ token: string; user: { id: number; email: string } }> => {
  // Use transaction to ensure atomicity of version increment and read
  const newTokenVersion = await prisma.$transaction(async (tx) => {
    // Increment token version to invalidate all existing tokens
    const user = await tx.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });
    return user.tokenVersion;
  });

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
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, tokenVersion: true },
    });

    if (!user) {
      Logger.warn(`Token verification failed: User ${payload.userId} not found in DB`);
      return null;
    }

    // Check token version - if it doesn't match, the token has been revoked
    // (e.g., user changed password). Tokens without version are treated as version 0.
    const tokenVersion = payload.tokenVersion ?? 0;
    const currentVersion = user.tokenVersion ?? 0;
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

/**
 * Request a password reset for the given email.
 * Generates a reset token, stores it in the database, and sends an email.
 * Always returns success message to prevent email enumeration.
 */
export const requestPasswordReset = async (
  email: string,
): Promise<{ message: string }> => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Always return the same message to prevent email enumeration
  const successMessage = {
    message: 'If an account with that email exists, a password reset link has been sent.',
  };

  if (!user) {
    // Don't reveal that the email doesn't exist
    Logger.debug(`Password reset requested for non-existent email`);
    return successMessage;
  }

  if (user.isVerified === 0) {
    // Don't reveal that the account is unverified
    Logger.debug(`Password reset requested for unverified account (ID: ${user.id})`);
    return successMessage;
  }

  const resetToken = randomBytes(32).toString('hex');
  const expiresAt = BigInt(Date.now() + RESET_PASSWORD_TOKEN_EXPIRY_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: resetToken,
      resetPasswordTokenExpiresAt: expiresAt,
    },
  });

  const emailSent = await sendPasswordResetEmail(email, resetToken);
  if (!emailSent) {
    // Clear the token if email failed
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
      },
    });
    throw new Error('Failed to send password reset email. Please try again later.');
  }

  Logger.info(`Password reset requested (ID: ${user.id})`);
  return successMessage;
};

/**
 * Reset password using a reset token.
 * Validates the token, updates the password, and revokes all existing tokens.
 */
export const resetPassword = async (
  token: string,
  newPassword: string,
): Promise<{ message: string }> => {
  const user = await prisma.user.findFirst({
    where: { resetPasswordToken: token },
  });

  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  if (
    user.resetPasswordTokenExpiresAt &&
    user.resetPasswordTokenExpiresAt < BigInt(Date.now())
  ) {
    // Clear expired token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
      },
    });
    throw new Error('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Update password, clear reset token, increment token version to invalidate all sessions
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordTokenExpiresAt: null,
      tokenVersion: { increment: 1 },
      // Also clear any lockout
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  Logger.info(`Password reset completed (ID: ${user.id})`);

  return {
    message:
      'Password has been reset successfully. Please log in with your new password.',
  };
};
