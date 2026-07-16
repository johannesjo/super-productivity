/**
 * Magic Link Registration Tests
 *
 * Tests for email-only registration (no passkey required).
 * Mirrors the passkey registration test patterns.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

// Must set JWT_SECRET before auth.ts is imported (top-level getJwtSecret() call).
// vi.hoisted runs before vi.mock factories, which are hoisted above normal code.
vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';
});

// Mock db - use factory function to avoid hoisting issues
vi.mock('../src/db', () => {
  const mockDb = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    passkey: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    pendingPasskeyRegistration: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { db: mockDb };
});

// Mock email sending
vi.mock('../src/email', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(true),
  sendLoginMagicLinkEmail: vi.fn().mockResolvedValue(true),
}));

// Mock crypto.randomBytes for predictable tokens
vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto');
  return {
    ...actual,
    randomBytes: vi.fn().mockReturnValue(Buffer.from('test-token-1234567890'.repeat(3))),
  };
});

// Override the global setup.ts mock of ../src/auth — use the real module
// so we can test registerWithMagicLink with mocked dependencies
vi.mock('../src/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return actual;
});

// Import mocked modules to get references
import { db } from '../src/db';
import { sendLoginMagicLinkEmail, sendVerificationEmail } from '../src/email';
import { UniqueViolationError } from './sql-state-error';

// Import module under test
import {
  registerWithMagicLink,
  requestLoginMagicLink,
  verifyEmail,
  verifyLoginMagicLink,
} from '../src/auth';

describe('Magic Link Registration', () => {
  const testEmail = 'test@example.com';
  const registrationResponse = {
    message: 'Registration successful. Please check your email to verify your account.',
  };
  const loginResponse = {
    message: 'If an account with that email exists, a login link has been sent.',
  };

  // Cast to access mock functions
  const mockDb = db as unknown as {
    user: {
      findUnique: Mock;
      findFirst: Mock;
      create: Mock;
      update: Mock;
      updateMany: Mock;
      delete: Mock;
      deleteMany: Mock;
    };
    passkey: {
      create: Mock;
      deleteMany: Mock;
    };
    pendingPasskeyRegistration: {
      findUnique: Mock;
      deleteMany: Mock;
    };
    $transaction: Mock;
  };

  const mockSendVerificationEmail = sendVerificationEmail as Mock;
  const mockSendLoginMagicLinkEmail = sendLoginMagicLinkEmail as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.user.updateMany.mockResolvedValue({ count: 1 });
    mockDb.pendingPasskeyRegistration.findUnique.mockResolvedValue(null);
    mockDb.$transaction.mockImplementation(
      async (callback: (tx: typeof mockDb) => Promise<unknown>) => callback(mockDb),
    );
  });

  describe('New user registration', () => {
    it('should create a new user and send verification email', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.user.create.mockResolvedValue({
        id: 1,
        email: testEmail,
        isVerified: 0,
      });

      const result = await registerWithMagicLink(testEmail, Date.now());

      expect(result).toEqual(registrationResponse);
      expect(mockDb.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: testEmail,
            passwordHash: null,
            verificationToken: expect.any(String),
            verificationTokenExpiresAt: expect.any(BigInt),
            termsAcceptedAt: expect.any(BigInt),
          }),
        }),
      );
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        testEmail,
        expect.any(String),
      );
    });

    it('should normalize email to lowercase', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.user.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        isVerified: 0,
      });

      await registerWithMagicLink('Test@Example.COM', Date.now());

      expect(mockDb.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockDb.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
          }),
        }),
      );
    });

    it('should use Date.now() for termsAcceptedAt when not provided', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.user.create.mockResolvedValue({
        id: 1,
        email: testEmail,
        isVerified: 0,
      });

      await registerWithMagicLink(testEmail);

      expect(mockDb.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            termsAcceptedAt: expect.any(BigInt),
          }),
        }),
      );
    });
  });

  describe('Existing user handling', () => {
    it('should return the neutral registration response for an existing verified user', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 1,
        email: testEmail,
        isVerified: 1,
      });

      const result = await registerWithMagicLink(testEmail, Date.now());

      expect(result).toEqual(registrationResponse);
      expect(mockDb.user.create).not.toHaveBeenCalled();
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should send email first, then update token for existing unverified user', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 1,
        email: testEmail,
        isVerified: 0,
        verificationResendCount: 2,
      });
      const result = await registerWithMagicLink(testEmail, Date.now());

      expect(result).toEqual(registrationResponse);
      expect(mockDb.user.create).not.toHaveBeenCalled();
      // Email sent before DB update to avoid invalidating old token on failure
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        testEmail,
        expect.any(String),
      );
      expect(mockDb.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 1, isVerified: 0 }),
          data: expect.objectContaining({
            verificationToken: expect.any(String),
            verificationTokenExpiresAt: expect.any(BigInt),
            verificationResendCount: { increment: 1 },
          }),
        }),
      );
    });

    it('should return the neutral response when verification resend cap is reached', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 1,
        email: testEmail,
        isVerified: 0,
        verificationResendCount: 20,
      });

      const result = await registerWithMagicLink(testEmail, Date.now());

      expect(result).toEqual(registrationResponse);
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
      expect(mockDb.user.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('Email failure handling', () => {
    it('should retain a newly created user when email sending fails', async () => {
      mockDb.user.findUnique.mockResolvedValueOnce(null);
      mockDb.user.create.mockResolvedValue({
        id: 1,
        email: testEmail,
        isVerified: 0,
      });
      mockSendVerificationEmail.mockResolvedValueOnce(false);

      const result = await registerWithMagicLink(testEmail, Date.now());

      expect(result).toEqual(registrationResponse);
      expect(mockDb.user.deleteMany).not.toHaveBeenCalled();
    });

    it('should NOT delete or update pre-existing unverified user when email sending fails', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 1,
        email: testEmail,
        isVerified: 0,
        verificationResendCount: 1,
      });
      mockSendVerificationEmail.mockResolvedValueOnce(false);

      const result = await registerWithMagicLink(testEmail, Date.now());

      expect(result).toEqual(registrationResponse);
      // Should NOT delete the pre-existing user
      expect(mockDb.user.delete).not.toHaveBeenCalled();
      expect(mockDb.user.deleteMany).not.toHaveBeenCalled();
      // Should NOT have updated the token (email sent before DB update)
      expect(mockDb.user.update).not.toHaveBeenCalled();
    });
  });

  describe('Email verification', () => {
    it('should activate only the passkey bound to the supplied token', async () => {
      mockDb.pendingPasskeyRegistration.findUnique.mockResolvedValue({
        userId: 1,
        verificationToken: 'pending-token',
        verificationTokenExpiresAt: BigInt(Date.now() + 60_000),
        credentialId: Buffer.from('owner-credential'),
        publicKey: Buffer.from('owner-public-key'),
        counter: 0n,
        transports: '["internal"]',
      });

      await verifyEmail('pending-token');

      expect(mockDb.passkey.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(mockDb.passkey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 1,
          credentialId: Buffer.from('owner-credential'),
        }),
      });
      expect(mockDb.pendingPasskeyRegistration.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
    });

    it('should not activate passkeys when a magic-link token verifies the email', async () => {
      const token = 'legacy-or-current-magic-token';
      mockDb.user.findFirst.mockResolvedValue({
        id: 1,
        verificationToken: token,
        verificationTokenExpiresAt: BigInt(Date.now() + 60_000),
      });

      await verifyEmail(token);

      expect(mockDb.passkey.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(mockDb.passkey.create).not.toHaveBeenCalled();
      expect(mockDb.pendingPasskeyRegistration.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
    });
  });

  describe('unique constraint handling', () => {
    it('should return the neutral response after a PostgreSQL registration race', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      mockDb.user.create.mockRejectedValue(new UniqueViolationError());

      const result = await registerWithMagicLink(testEmail, Date.now());

      expect(result).toEqual(registrationResponse);
    });
  });

  describe('Login magic-link requests', () => {
    const verifiedUser = {
      id: 1,
      email: testEmail,
      isVerified: 1,
      loginToken: null,
      loginTokenExpiresAt: null,
    };

    it('should not rotate or resend a still-valid login token', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        ...verifiedUser,
        loginToken: 'active-token',
        loginTokenExpiresAt: BigInt(Date.now() + 60_000),
      });

      const result = await requestLoginMagicLink(testEmail);

      expect(result).toEqual(loginResponse);
      expect(mockDb.user.updateMany).not.toHaveBeenCalled();
      expect(mockSendLoginMagicLinkEmail).not.toHaveBeenCalled();
    });

    it('should atomically claim an expired token slot before sending', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        ...verifiedUser,
        loginToken: 'expired-token',
        loginTokenExpiresAt: BigInt(Date.now() - 1),
      });
      mockDb.user.updateMany.mockResolvedValue({ count: 1 });

      await requestLoginMagicLink(testEmail);

      expect(mockDb.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: verifiedUser.id,
          OR: [
            { loginToken: null },
            { loginTokenExpiresAt: null },
            { loginTokenExpiresAt: { lte: expect.any(BigInt) } },
          ],
        },
        data: {
          loginToken: expect.any(String),
          loginTokenExpiresAt: expect.any(BigInt),
        },
      });
      expect(mockSendLoginMagicLinkEmail).toHaveBeenCalledOnce();
    });

    it('should not send when another request wins the token claim race', async () => {
      mockDb.user.findUnique.mockResolvedValue(verifiedUser);
      mockDb.user.updateMany.mockResolvedValue({ count: 0 });

      await requestLoginMagicLink(testEmail);

      expect(mockSendLoginMagicLinkEmail).not.toHaveBeenCalled();
    });

    it('should only clear the token claimed by a failed email attempt', async () => {
      mockDb.user.findUnique.mockResolvedValue(verifiedUser);
      mockDb.user.updateMany.mockResolvedValueOnce({ count: 1 });
      mockDb.user.updateMany.mockResolvedValueOnce({ count: 1 });
      mockSendLoginMagicLinkEmail.mockResolvedValueOnce(false);

      const result = await requestLoginMagicLink(testEmail);

      expect(result).toEqual(loginResponse);
      const claimedToken = mockDb.user.updateMany.mock.calls[0][0].data.loginToken;
      expect(mockDb.user.updateMany.mock.calls[1][0]).toEqual({
        where: { id: verifiedUser.id, loginToken: claimedToken },
        data: { loginToken: null, loginTokenExpiresAt: null },
      });
    });

    it('should consume a login token with a token-scoped atomic update', async () => {
      const loginToken = 'single-use-token';
      mockDb.user.findFirst.mockResolvedValue({
        id: verifiedUser.id,
        email: testEmail,
        loginToken,
        loginTokenExpiresAt: BigInt(Date.now() + 60_000),
        tokenVersion: 0,
      });
      mockDb.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await verifyLoginMagicLink(loginToken);

      expect(result.user).toEqual({ id: verifiedUser.id, email: testEmail });
      expect(mockDb.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: verifiedUser.id,
          loginToken,
          OR: [
            { loginTokenExpiresAt: null },
            { loginTokenExpiresAt: { gte: expect.any(BigInt) } },
          ],
        },
        data: {
          loginToken: null,
          loginTokenExpiresAt: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });

    it('should reject a login token already consumed by another request', async () => {
      const loginToken = 'already-consumed-token';
      mockDb.user.findFirst.mockResolvedValue({
        id: verifiedUser.id,
        email: testEmail,
        loginToken,
        loginTokenExpiresAt: BigInt(Date.now() + 60_000),
        tokenVersion: 0,
      });
      mockDb.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(verifyLoginMagicLink(loginToken)).rejects.toThrow(
        'Invalid or expired login link',
      );
    });

    it('should not clear a replacement when an expired login token races renewal', async () => {
      const expiredToken = 'expired-login-token';
      mockDb.user.findFirst.mockResolvedValue({
        id: verifiedUser.id,
        email: testEmail,
        loginToken: expiredToken,
        loginTokenExpiresAt: BigInt(Date.now() - 1),
        tokenVersion: 0,
      });
      mockDb.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(verifyLoginMagicLink(expiredToken)).rejects.toThrow(
        'Invalid or expired login link',
      );

      expect(mockDb.user.updateMany).toHaveBeenCalledWith({
        where: { id: verifiedUser.id, loginToken: expiredToken },
        data: { loginToken: null, loginTokenExpiresAt: null },
      });
    });
  });
});
