import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Capacitor } from '@capacitor/core';
import { IS_ELECTRON } from '../../app.constants';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { SnackService } from '../snack/snack.service';
import { SharePayload, ShareResult, ShareTarget, ShareTargetConfig } from './share.model';

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
    if (!payload.text && !payload.url) {
      return {
        success: false,
        error: 'No content to share',
      };
    }

    if (target) {
      return this.shareToTarget(payload, target);
    }

    const nativeResult = await this.tryNativeShare(payload);
    if (nativeResult.success) {
      return nativeResult;
    }

    return this._showShareDialog(payload);
  }

  /**
   * Share to a specific target (public API for dialog component).
   */
  async shareToTarget(payload: SharePayload, target: ShareTarget): Promise<ShareResult> {
    try {
      switch (target) {
        case 'native':
          return this.tryNativeShare(payload);
        case 'clipboard-link':
          return this.copyToClipboard(payload.url || '', 'Link');
        case 'clipboard-text':
          return this.copyToClipboard(this.formatTextForClipboard(payload), 'Text');
        default:
          return this._openShareUrl(payload, target);
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
   * Try to use native share (Electron, Android, Web Share API).
   * Public API for dialog component.
   */
  async tryNativeShare(payload: SharePayload): Promise<ShareResult> {
    if (IS_ELECTRON && typeof window.ea?.shareNative === 'function') {
      try {
        const result = await window.ea.shareNative(payload);
        if (result.success) {
          this._snackService.open('Shared successfully!');
          return {
            success: true,
            usedNative: true,
            target: 'native',
          };
        }
      } catch (error) {
        console.warn('Electron native share failed:', error);
      }
    }

    const capacitorShare = await this._getCapacitorSharePlugin();
    if (capacitorShare) {
      try {
        await capacitorShare.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
          files: payload.files,
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
            title: payload.title,
            text: payload.text,
            url: payload.url,
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
          title: payload.title,
          text: payload.text,
          url: payload.url,
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
    const url = this._buildShareUrl(payload, target);

    if (IS_ELECTRON && window.ea?.openExternalUrl) {
      window.ea.openExternalUrl(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

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
    const textAndUrl = [payload.text, payload.url].filter(Boolean).join(' ');

    const urlBuilders: Record<string, () => string> = {
      twitter: () => `https://twitter.com/intent/tweet?text=${enc(textAndUrl)}`,
      linkedin: () =>
        `https://www.linkedin.com/sharing/share-offsite/?url=${enc(payload.url || '')}`,
      reddit: () =>
        `https://www.reddit.com/submit?url=${enc(payload.url || '')}&title=${enc(payload.title || payload.text || '')}`,
      facebook: () =>
        `https://www.facebook.com/sharer/sharer.php?u=${enc(payload.url || '')}`,
      whatsapp: () => `https://wa.me/?text=${enc(textAndUrl)}`,
      telegram: () =>
        `https://t.me/share/url?url=${enc(payload.url || '')}&text=${enc(payload.text || '')}`,
      email: () =>
        `mailto:?subject=${enc(payload.title || 'Check this out')}&body=${enc(textAndUrl)}`,
      mastodon: () => {
        const instance = 'mastodon.social';
        return `https://${instance}/share?text=${enc(textAndUrl)}`;
      },
    };

    const builder = urlBuilders[target];
    if (!builder) {
      throw new Error(`Unknown share target: ${target}`);
    }

    return builder();
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
        target: label === 'Link' ? 'clipboard-link' : 'clipboard-text',
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
          target: label === 'Link' ? 'clipboard-link' : 'clipboard-text',
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
    if (IS_ELECTRON && typeof window.ea?.shareNative === 'function') {
      return true;
    }

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

  private async _detectShareSupport(): Promise<ShareSupport> {
    if (IS_ELECTRON && typeof window.ea?.shareNative === 'function') {
      return 'native';
    }

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
    if (!Capacitor.isNativePlatform() || typeof window === 'undefined') {
      return null;
    }

    const win = window as any;
    const sharePlugin = win.Capacitor?.Plugins?.Share;

    if (sharePlugin && typeof sharePlugin.share === 'function') {
      return sharePlugin;
    }

    return null;
  }
}
