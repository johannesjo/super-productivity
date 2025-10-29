import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { SnackService } from '../snack/snack.service';
import {
  ShareCanvasImageParams,
  ShareCanvasTagline,
  SharePayload,
  ShareResult,
  ShareTarget,
  ShareTargetConfig,
} from './share.model';

const FALLBACK_SHARE_URL = 'https://super-productivity.com';

export type ShareOutcome = 'shared' | 'cancelled' | 'unavailable' | 'failed';
export type ShareSupport = 'native' | 'web' | 'none';

interface ShareParams {
  title?: string | null;
  text: string;
}

/**
 * Share service for multi-platform content sharing.
 * Supports Electron (Desktop), Capacitor (Android), and Web (PWA/Browser).
 * Provides a legacy shareText API that only triggers native/web share without UI fallbacks.
 */
@Injectable({
  providedIn: 'root',
})
export class ShareService {
  private _shareSupportPromise?: Promise<ShareSupport>;

  private _snackService = inject(SnackService);
  private _matDialog = inject(MatDialog);

  async shareText({ title, text }: ShareParams): Promise<ShareOutcome> {
    if (!text || typeof window === 'undefined') {
      return 'failed';
    }

    const result = await this.tryNativeShare({
      title: title ?? undefined,
      text,
    });

    if (result.success) {
      return 'shared';
    }

    if (result.error === 'Share cancelled') {
      return 'cancelled';
    }

    if (result.error === 'Native share not available') {
      return 'unavailable';
    }

    return 'failed';
  }

  canOpenDownloadResult(result: ShareResult): boolean {
    if (!result) {
      return false;
    }

    if (typeof window !== 'undefined' && result.path && (window as any).ea?.openPath) {
      return true;
    }

    if (Capacitor.isNativePlatform() || IS_ANDROID_WEB_VIEW) {
      return false;
    }

    if (typeof window !== 'undefined' && (result.uri || result.path)) {
      return true;
    }

    return false;
  }

  async openDownloadResult(result: ShareResult): Promise<void> {
    if (!result) {
      return;
    }

    const { uri, path } = result;

    if (typeof window !== 'undefined' && path && (window as any).ea?.openPath) {
      try {
        (window as any).ea.openPath(path);
        return;
      } catch (error) {
        console.warn('Failed to open path via Electron bridge:', error);
      }
    }

    const candidate = uri ?? path;

    if (typeof window !== 'undefined' && candidate) {
      try {
        window.open(candidate, '_blank', 'noopener');
        return;
      } catch (error) {
        console.warn('Failed to open download in new window:', error);
      }
    }
  }

  async getShareSupport(): Promise<ShareSupport> {
    if (typeof window === 'undefined') {
      return 'none';
    }

    if (!this._shareSupportPromise) {
      this._shareSupportPromise = this._detectShareSupport();
    }

    return this._shareSupportPromise;
  }

  /**
   * Main share method - automatically detects platform and uses best method.
   */
  async share(payload: SharePayload, target?: ShareTarget): Promise<ShareResult> {
    const normalizedPayload = this._ensureShareText(payload);

    if (!payload.text && !payload.url) {
      return {
        success: false,
        error: 'No content to share',
      };
    }

    if (target) {
      return this.shareToTarget(payload, target);
    }

    const nativeResult = await this.tryNativeShare(normalizedPayload);
    if (nativeResult.success) {
      return nativeResult;
    }

    return this._showShareDialog(normalizedPayload);
  }

  /**
   * Share to a specific target (public API for dialog component).
   */
  async shareToTarget(payload: SharePayload, target: ShareTarget): Promise<ShareResult> {
    const normalized = this._ensureShareText(payload);

    try {
      switch (target) {
        case 'native':
          return this.tryNativeShare(normalized);
        case 'clipboard-text':
          return this.copyToClipboard(this.formatTextForClipboard(payload), 'Text');
        default:
          return this._openShareUrl(normalized, target);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        target,
      };
    }
  }

  /**
   * Share a canvas element as an image, supporting native, web, and download fallbacks.
   */
  async shareCanvasImage(params: ShareCanvasImageParams): Promise<ShareResult> {
    if (typeof window === 'undefined' || !params?.canvas) {
      return {
        success: false,
        error: 'Canvas not available',
      };
    }

    const filename = this._sanitizeFilename(params.filename ?? 'shared-image.png');
    const shareTitle = params.shareTitle ?? filename;
    const canvasForExport = this._prepareCanvasForShare(params.canvas, params.tagline);
    const dataUrl = canvasForExport.toDataURL('image/png', 1.0);
    const base64 = this._extractBase64(dataUrl);
    const blob = await this._canvasToBlob(canvasForExport);
    if (!blob) {
      return {
        success: false,
        error: 'Failed to export image',
      };
    }

    if (params.mode === 'download-only') {
      return this._saveCanvasDownload({
        blob,
        base64,
        filename,
        dataUrl,
      });
    }

    if (base64) {
      const nativeResult = await this._shareCanvasViaNative(base64, filename, shareTitle);
      if (nativeResult.success || nativeResult.error === 'Share cancelled') {
        return nativeResult;
      }
    }

    const webResult = await this._shareCanvasViaWeb(blob, filename, shareTitle, dataUrl);
    if (webResult.success || webResult.error === 'Share cancelled') {
      return webResult;
    }

    if (params.fallbackToDownload !== false) {
      return this._saveCanvasDownload({
        blob,
        base64,
        filename,
        dataUrl,
      });
    }

    return {
      success: false,
      error: 'Share not available',
    };
  }

  /**
   * Try to use native share (Android, Web Share API).
   * Public API for dialog component.
   */
  async tryNativeShare(payload: SharePayload): Promise<ShareResult> {
    const normalized = this._ensureShareText(payload);

    const capacitorShare = await this._getCapacitorSharePlugin();
    if (capacitorShare) {
      try {
        await capacitorShare.share({
          title: normalized.title,
          text: normalized.text,
          url: normalized.url,
          files: normalized.files,
          dialogTitle: 'Share via',
        });
        this._snackService.open('Shared successfully!');
        return {
          success: true,
          usedNative: true,
          target: 'native',
        };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            success: false,
            error: 'Share cancelled',
          };
        }
        console.warn('Capacitor share failed:', error);
      }
    }

    if (IS_ANDROID_WEB_VIEW) {
      try {
        const win = window as any;
        if (win.Capacitor?.Plugins?.Share) {
          await win.Capacitor.Plugins.Share.share({
            title: normalized.title,
            text: normalized.text,
            url: normalized.url,
            dialogTitle: 'Share via',
          });
          this._snackService.open('Shared successfully!');
          return {
            success: true,
            usedNative: true,
            target: 'native',
          };
        }
      } catch (error) {
        console.warn('Capacitor share via window failed:', error);
      }
    }

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: normalized.title,
          text: normalized.text,
          url: normalized.url,
        });
        this._snackService.open('Shared successfully!');
        return {
          success: true,
          usedNative: true,
          target: 'native',
        };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return { success: false, error: 'Share cancelled' };
        }
        console.warn('Web Share API failed:', error);
      }
    }

    return {
      success: false,
      error: 'Native share not available',
    };
  }

  /**
   * Open share dialog with all available targets.
   */
  private async _showShareDialog(payload: SharePayload): Promise<ShareResult> {
    try {
      // Import dialog component dynamically to avoid circular dependencies
      const { DialogShareComponent } = await import(
        './dialog-share/dialog-share.component'
      );

      const dialogRef = this._matDialog.open(DialogShareComponent, {
        width: '500px',
        data: {
          payload,
          showNative: await this._isSystemShareAvailable(),
        },
      });

      const result = await dialogRef.afterClosed().toPromise();

      if (result) {
        return result;
      }

      return {
        success: false,
        error: 'Share cancelled',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open share dialog',
      };
    }
  }

  /**
   * Open a share URL in the default browser.
   */
  private async _openShareUrl(
    payload: SharePayload,
    target: ShareTarget,
  ): Promise<ShareResult> {
    const normalized = this._ensureShareText(payload);
    const url = this._buildShareUrl(normalized, target);

    window.open(url, '_blank', 'noopener,noreferrer');

    this._snackService.open('Opening share window...');

    return {
      success: true,
      target,
    };
  }

  /**
   * Build share URL for a specific target.
   */
  private _buildShareUrl(payload: SharePayload, target: ShareTarget): string {
    const enc = encodeURIComponent;
    const shareUrl = payload.url?.trim() || FALLBACK_SHARE_URL;
    const baseTitle = this._getShareTitle(payload);

    const providerText = this._buildProviderText(payload, target);
    const providerTitle = this._buildProviderTitle(baseTitle, target);
    const inlineText = this._inlineShareText(providerText || providerTitle);

    const encodedUrl = enc(shareUrl);
    const encodedText = enc(providerText || providerTitle || shareUrl);
    const encodedInline = enc(inlineText || providerTitle || shareUrl);
    const encodedTitle = enc(providerTitle || 'Check this out');

    switch (target) {
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodedInline}`;
      case 'linkedin':
        // LinkedIn ignores summary/message params in the modern share dialog (policy
        // to prevent prefilled spam). We still pass summary for legacy/preview rendering.
        return `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedText}`;
      case 'reddit':
        // New reddit drops text params. The legacy reddit (old.reddit.com) still honors
        // them so we point there for best-effort prefill.
        return `https://old.reddit.com/submit?title=${encodedTitle}&kind=self&text=${encodedText}`;
      case 'facebook':
        // Facebook ignores prefilled body text since 2018. quote= is preserved as a caption.
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
      case 'whatsapp':
        return `https://wa.me/?text=${this._encodeForWhatsApp(providerText || providerTitle || shareUrl)}`;
      case 'telegram':
        return `https://t.me/share/url?url=${encodedUrl}&text=${enc(providerText || providerTitle || shareUrl)}`;
      case 'email':
        return `mailto:?subject=${encodedTitle}&body=${encodedText}`;
      case 'mastodon': {
        const instance = 'mastodon.social';
        return `https://${instance}/share?text=${enc(providerText || shareUrl)}`;
      }
      default:
        throw new Error(`Unknown share target: ${target}`);
    }
  }

  /**
   * Copy text to clipboard (public API for dialog component).
   */
  async copyToClipboard(text: string, label: string): Promise<ShareResult> {
    try {
      await navigator.clipboard.writeText(text);
      this._snackService.open(`${label} copied to clipboard!`);
      return {
        success: true,
        target: 'clipboard-text',
      };
    } catch (error) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        this._snackService.open(`${label} copied to clipboard!`);
        return {
          success: true,
          target: 'clipboard-text',
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: 'Failed to copy to clipboard',
        };
      }
    }
  }

  /**
   * Format payload as plain text for clipboard (public API for dialog component).
   */
  formatTextForClipboard(payload: SharePayload): string {
    const parts: string[] = [];

    if (payload.title) {
      parts.push(payload.title);
      parts.push('');
    }

    if (payload.text) {
      parts.push(payload.text);
    }

    if (payload.url) {
      if (payload.text) {
        parts.push('');
      }
      parts.push(payload.url);
    }

    return parts.join('\n');
  }

  /**
   * Check if native/system share is available on current platform.
   */
  private async _isSystemShareAvailable(): Promise<boolean> {
    if (await this._isCapacitorShareAvailable()) {
      return true;
    }

    if (IS_ANDROID_WEB_VIEW) {
      const win = window as any;
      return !!win.Capacitor?.Plugins?.Share;
    }

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      return true;
    }

    return false;
  }

  /**
   * Get available share targets with their configurations.
   */
  getShareTargets(): ShareTargetConfig[] {
    return [
      {
        label: 'Twitter',
        icon: 'link',
        available: true,
        color: '#1DA1F2',
      },
      {
        label: 'LinkedIn',
        icon: 'link',
        available: true,
        color: '#0A66C2',
      },
      {
        label: 'Reddit',
        icon: 'link',
        available: true,
        color: '#FF4500',
      },
      {
        label: 'Facebook',
        icon: 'link',
        available: true,
        color: '#1877F2',
      },
      {
        label: 'WhatsApp',
        icon: 'chat',
        available: true,
        color: '#25D366',
      },
      {
        label: 'Telegram',
        icon: 'send',
        available: true,
        color: '#0088CC',
      },
      {
        label: 'Email',
        icon: 'email',
        available: true,
      },
      {
        label: 'Mastodon',
        icon: 'link',
        available: true,
        color: '#6364FF',
      },
    ];
  }

  private _ensureShareText(payload: SharePayload): SharePayload {
    const existingText = typeof payload.text === 'string' ? payload.text.trim() : '';
    if (existingText.length > 0) {
      if (payload.text === existingText) {
        return payload;
      }
      return {
        ...payload,
        text: existingText,
      };
    }

    const fallbackParts: string[] = [];
    const title = payload.title?.trim();
    if (title) {
      fallbackParts.push(title);
    }

    const url = payload.url?.trim();
    if (url) {
      fallbackParts.push(url);
    }

    const fallbackText = fallbackParts.join('\n\n').trim();
    if (!fallbackText) {
      return payload;
    }

    return {
      ...payload,
      text: fallbackText,
    };
  }

  private _buildShareText(payload: SharePayload): string {
    const text = payload.text?.trim() ?? '';
    const url = payload.url?.trim() ?? '';

    if (!text && !url) {
      return '';
    }

    if (!url) {
      return text;
    }

    if (!text) {
      return url;
    }

    if (text.includes(url)) {
      return text;
    }

    return `${text}\n\n${url}`;
  }

  private _cleanupText(text: string): string {
    if (!text) {
      return '';
    }

    const lines = text.split(/\r?\n/);
    const cleaned: string[] = [];
    let pendingBlank = false;

    for (const rawLine of lines) {
      const normalizedLine = rawLine.replace(/\s{2,}/g, ' ').trim();
      if (!normalizedLine) {
        if (cleaned.length > 0) {
          pendingBlank = true;
        }
        continue;
      }
      if (pendingBlank) {
        cleaned.push('');
        pendingBlank = false;
      }
      cleaned.push(normalizedLine);
    }

    return cleaned.join('\n').trim();
  }

  private _inlineShareText(text: string): string {
    const normalized = this._cleanupText(text);
    if (!normalized) {
      return '';
    }

    return normalized
      .split(/\r?\n+/)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private _getShareTitle(payload: SharePayload): string {
    const title = payload.title?.trim();
    if (title) {
      return title.slice(0, 300);
    }

    const text = payload.text?.trim();
    if (text) {
      const firstNonEmptyLine = text
        .split(/\r?\n+/)
        .map((line) => line.trim())
        .find((line) => line.length > 0);
      if (firstNonEmptyLine) {
        return firstNonEmptyLine.slice(0, 300);
      }
    }

    const url = payload.url?.trim();
    if (url) {
      return url;
    }

    return 'Check this out';
  }

  private _buildProviderText(payload: SharePayload, provider: ShareTarget): string {
    let text = this._cleanupText(this._buildShareText(payload));

    if (!text) {
      return payload.url?.trim() || '';
    }

    if (provider !== 'twitter' && provider !== 'mastodon') {
      text = this._cleanupText(this._stripHashtags(text));
    }

    if (provider === 'whatsapp') {
      text = this._cleanupText(this._stripEmojis(text));
    }

    return text || payload.url?.trim() || '';
  }

  private _buildProviderTitle(baseTitle: string, provider: ShareTarget): string {
    let title = baseTitle?.trim() || '';

    if (!title) {
      return title;
    }

    if (provider !== 'twitter' && provider !== 'mastodon') {
      title = this._stripHashtags(title);
    }

    if (provider === 'whatsapp') {
      title = this._stripEmojis(title);
    }

    return title.replace(/\s{2,}/g, ' ').trim();
  }

  private _encodeForWhatsApp(text: string): string {
    const cleaned = this._cleanupText(text);
    return encodeURIComponent(cleaned || FALLBACK_SHARE_URL);
  }

  private _stripHashtags(text: string): string {
    if (!text) {
      return '';
    }

    return text.replace(/(^|[\s])#[\p{L}\p{N}_-]+/gu, (match, prefix) => prefix);
  }

  private _stripEmojis(text: string): string {
    if (!text) {
      return '';
    }

    return text.replace(/\p{Extended_Pictographic}|\uFE0F|\uFE0E|\u200D/gu, '');
  }

  private _prepareCanvasForShare(
    canvas: HTMLCanvasElement,
    tagline?: ShareCanvasTagline,
  ): HTMLCanvasElement {
    if (!tagline?.text) {
      return canvas;
    }

    const taglineHeight = Math.max(1, tagline.height ?? 48);
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height + taglineHeight;

    const ctx = newCanvas.getContext('2d');
    if (!ctx) {
      return canvas;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    ctx.fillStyle = tagline.color ?? 'rgba(0, 0, 0, 0.6)';
    const baseFontSize = Math.max(20, Math.round(newCanvas.width / 40));
    ctx.font = `${baseFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const taglineOffset = taglineHeight / 2;
    const taglineY = canvas.height + taglineOffset;
    ctx.fillText(tagline.text, newCanvas.width / 2, taglineY);

    return newCanvas;
  }

  private _canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });
  }

  private async _shareCanvasViaNative(
    base64: string,
    filename: string,
    title: string,
  ): Promise<ShareResult> {
    const sharePlugin = await this._getCapacitorSharePlugin();
    if (!sharePlugin) {
      return {
        success: false,
        error: 'Native share not available',
      };
    }

    const sanitizedName = this._sanitizeFilename(filename);
    const relativePath = `shared-images/${Date.now()}-${sanitizedName}`;
    let fileUrl: string | null = null;
    let resolvedUri: string | null = null;

    try {
      const writeResult = await Filesystem.writeFile({
        path: relativePath,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });

      resolvedUri =
        writeResult.uri ??
        (
          await Filesystem.getUri({
            directory: Directory.Cache,
            path: relativePath,
          })
        ).uri;

      if (!resolvedUri) {
        throw new Error('Failed to resolve native share uri');
      }

      fileUrl = resolvedUri.startsWith('file://')
        ? resolvedUri
        : resolvedUri.startsWith('/')
          ? `file://${resolvedUri}`
          : `file:///${resolvedUri}`;

      console.debug('[ShareService] shareCanvasViaNative', {
        resolvedUri,
        fileUrl,
        relativePath,
      });

      try {
        const stat = await Filesystem.stat({
          path: relativePath,
          directory: Directory.Cache,
        });
        console.debug('[ShareService] shareCanvasViaNative stat', stat);
      } catch (statError) {
        console.warn('[ShareService] stat failed for shared image', statError);
      }

      const canShare = (await sharePlugin.canShare?.())?.value ?? true;
      if (!canShare) {
        return {
          success: false,
          error: 'Native share not available',
        };
      }

      await sharePlugin.share({
        title,
        text: '',
        files: [fileUrl],
        dialogTitle: 'Share via',
      });

      this._snackService.open('Shared successfully!');
      this._scheduleCacheCleanup(relativePath);
      return {
        success: true,
        usedNative: true,
        target: 'native',
      };
    } catch (error: any) {
      if (error?.name === 'AbortError' || /Share canceled/i.test(error?.message)) {
        return {
          success: false,
          error: 'Share cancelled',
        };
      }
      console.warn('Native image share failed:', error, {
        fileUrl: fileUrl ?? 'n/a',
        resolvedUri: resolvedUri ?? 'n/a',
        relativePath,
      });
      this._scheduleCacheCleanup(relativePath);
      return {
        success: false,
        error: 'Native share failed',
      };
    }
  }

  private async _shareCanvasViaWeb(
    blob: Blob,
    filename: string,
    title: string,
    dataUrl: string,
  ): Promise<ShareResult> {
    if (typeof navigator === 'undefined') {
      return {
        success: false,
        error: 'Share not available',
      };
    }

    try {
      if (typeof File !== 'undefined') {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title,
          });
          this._snackService.open('Shared successfully!');
          return {
            success: true,
            usedNative: true,
            target: 'native',
          };
        }
      }

      if (typeof navigator.share === 'function') {
        await navigator.share({
          title,
          url: dataUrl,
        });
        this._snackService.open('Shared successfully!');
        return {
          success: true,
          usedNative: true,
          target: 'native',
        };
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return {
          success: false,
          error: 'Share cancelled',
        };
      }
      console.warn('Web Share API failed:', error);
    }

    return {
      success: false,
      error: 'Share not available',
    };
  }

  private async _saveCanvasDownload({
    blob,
    base64,
    filename,
    dataUrl,
  }: {
    blob: Blob;
    base64?: string | null;
    filename: string;
    dataUrl: string;
  }): Promise<ShareResult> {
    if (base64 && (Capacitor.isNativePlatform() || IS_ANDROID_WEB_VIEW)) {
      const sanitizedName = this._sanitizeFilename(filename);
      const relativePath = `shared-images/${Date.now()}-${sanitizedName}`;
      try {
        const writeResult = await Filesystem.writeFile({
          path: relativePath,
          data: base64,
          directory: Directory.Documents,
          recursive: true,
        });

        const uri =
          writeResult.uri ??
          (
            await Filesystem.getUri({
              directory: Directory.Documents,
              path: relativePath,
            })
          ).uri;

        const storedPath = `Documents/${relativePath}`;

        return {
          success: true,
          target: 'download',
          usedNative: true,
          path: storedPath,
          uri,
        };
      } catch (error) {
        console.warn('Native download failed, falling back to browser download:', error);
      }
    }

    const downloaded = this._downloadBlob(blob, filename);
    if (downloaded) {
      return {
        success: true,
        target: 'download',
      };
    }

    if (typeof window !== 'undefined' && dataUrl) {
      try {
        window.open(dataUrl, '_blank');
        return {
          success: true,
          target: 'download',
        };
      } catch (error) {
        console.warn('Opening image in new tab failed:', error);
      }
    }

    return {
      success: false,
      error: 'Download failed',
    };
  }

  private _downloadBlob(blob: Blob, filename: string): boolean {
    if (typeof document === 'undefined') {
      return false;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    try {
      anchor.click();
      return true;
    } catch (error) {
      console.warn('Browser download failed:', error);
      return false;
    } finally {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }
  }

  private async _cleanupCacheFile(relativePath: string): Promise<void> {
    if (!relativePath) {
      return;
    }

    try {
      await Filesystem.deleteFile({
        path: relativePath,
        directory: Directory.Cache,
      });
    } catch (cleanupError) {
      console.warn('Failed to cleanup shared file:', cleanupError);
    }
  }

  private _scheduleCacheCleanup(relativePath: string): void {
    if (!relativePath) {
      return;
    }

    setTimeout(() => {
      void this._cleanupCacheFile(relativePath);
    }, 15_000);
  }

  private _sanitizeFilename(filename: string): string {
    const trimmed = filename.trim() || 'shared-image.png';
    const sanitized = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!sanitized.toLowerCase().endsWith('.png')) {
      return `${sanitized}.png`;
    }
    return sanitized;
  }

  private _extractBase64(dataUrl: string): string | null {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) {
      return null;
    }

    return dataUrl.slice(commaIndex + 1);
  }

  private async _detectShareSupport(): Promise<ShareSupport> {
    if (await this._isCapacitorShareAvailable()) {
      return 'native';
    }

    if (IS_ANDROID_WEB_VIEW) {
      const win = window as any;
      if (win.Capacitor?.Plugins?.Share) {
        return 'native';
      }
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      return 'web';
    }

    return 'none';
  }

  private async _isCapacitorShareAvailable(): Promise<boolean> {
    const sharePlugin = await this._getCapacitorSharePlugin();
    return !!sharePlugin;
  }

  private async _getCapacitorSharePlugin(): Promise<any | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    const win = window as any;

    if (Capacitor.isNativePlatform()) {
      const nativePlugin = win.Capacitor?.Plugins?.Share;
      if (nativePlugin && typeof nativePlugin.share === 'function') {
        return nativePlugin;
      }
    }

    if (IS_ANDROID_WEB_VIEW) {
      const webViewPlugin = win.Capacitor?.Plugins?.Share;
      if (webViewPlugin && typeof webViewPlugin.share === 'function') {
        return webViewPlugin;
      }
    }

    return null;
  }
}
