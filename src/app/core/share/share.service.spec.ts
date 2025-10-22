import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ShareService } from './share.service';
import { SnackService } from '../snack/snack.service';
import { SharePayload } from './share.model';

describe('ShareService', () => {
  let service: ShareService;
  let mockSnackService: jasmine.SpyObj<SnackService>;
  let mockMatDialog: jasmine.SpyObj<MatDialog>;

  beforeEach(() => {
    mockSnackService = jasmine.createSpyObj('SnackService', ['open']);
    mockMatDialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      providers: [
        ShareService,
        { provide: SnackService, useValue: mockSnackService },
        { provide: MatDialog, useValue: mockMatDialog },
      ],
    });

    service = TestBed.inject(ShareService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getShareTargets', () => {
    it('should return all share target configurations', () => {
      const targets = service.getShareTargets();

      expect(targets.length).toBeGreaterThan(0);
      expect(targets[0]).toHaveProperty('label');
      expect(targets[0]).toHaveProperty('icon');
      expect(targets[0]).toHaveProperty('available');
    });

    it('should include Twitter target', () => {
      const targets = service.getShareTargets();
      const twitter = targets.find((t) => t.label === 'Twitter');

      expect(twitter).toBeDefined();
      expect(twitter!.available).toBe(true);
    });

    it('should include Email target', () => {
      const targets = service.getShareTargets();
      const email = targets.find((t) => t.label === 'Email');

      expect(email).toBeDefined();
      expect(email!.icon).toBe('email');
    });
  });

  describe('share', () => {
    it('should return error when no content provided', async () => {
      const payload: SharePayload = {};

      const result = await service.share(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No content to share');
    });

    it('should accept text-only payload', async () => {
      const payload: SharePayload = { text: 'Test content' };

      // This will attempt native share or show dialog
      const result = await service.share(payload);

      // Result depends on platform capabilities
      expect(result).toBeDefined();
    });

    it('should accept URL-only payload', async () => {
      const payload: SharePayload = { url: 'https://example.com' };

      const result = await service.share(payload);

      expect(result).toBeDefined();
    });
  });

  describe('_buildShareUrl', () => {
    it('should build Twitter share URL', () => {
      const payload: SharePayload = {
        text: 'Test tweet',
        url: 'https://example.com',
      };

      const url = service['_buildShareUrl'](payload, 'twitter');

      expect(url).toContain('twitter.com/intent/tweet');
      expect(url).toContain(encodeURIComponent('Test tweet'));
    });

    it('should build LinkedIn share URL', () => {
      const payload: SharePayload = { url: 'https://example.com' };

      const url = service['_buildShareUrl'](payload, 'linkedin');

      expect(url).toContain('linkedin.com');
      expect(url).toContain(encodeURIComponent('https://example.com'));
    });

    it('should build Email share URL', () => {
      const payload: SharePayload = {
        title: 'Check this out',
        text: 'Great content',
        url: 'https://example.com',
      };

      const url = service['_buildShareUrl'](payload, 'email');

      expect(url).toContain('mailto:');
      expect(url).toContain('subject=');
      expect(url).toContain('body=');
    });

    it('should build WhatsApp share URL', () => {
      const payload: SharePayload = {
        text: 'Check this out',
        url: 'https://example.com',
      };

      const url = service['_buildShareUrl'](payload, 'whatsapp');

      expect(url).toContain('wa.me');
      expect(url).toContain('text=');
    });

    it('should throw error for unknown target', () => {
      const payload: SharePayload = { text: 'Test' };

      expect(() => {
        service['_buildShareUrl'](payload, 'unknown' as any);
      }).toThrow();
    });
  });

  describe('_formatTextForClipboard', () => {
    it('should format payload with title, text, and URL', () => {
      const payload: SharePayload = {
        title: 'My Title',
        text: 'My text content',
        url: 'https://example.com',
      };

      const formatted = service['_formatTextForClipboard'](payload);

      expect(formatted).toContain('My Title');
      expect(formatted).toContain('My text content');
      expect(formatted).toContain('https://example.com');
    });

    it('should handle text-only payload', () => {
      const payload: SharePayload = { text: 'Just text' };

      const formatted = service['_formatTextForClipboard'](payload);

      expect(formatted).toBe('Just text');
    });

    it('should handle URL-only payload', () => {
      const payload: SharePayload = { url: 'https://example.com' };

      const formatted = service['_formatTextForClipboard'](payload);

      expect(formatted).toBe('https://example.com');
    });
  });
});
