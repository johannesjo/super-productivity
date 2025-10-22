import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export type ShareOutcome = 'shared' | 'cancelled' | 'unavailable' | 'failed';
export type ShareSupport = 'native' | 'web' | 'none';

interface ShareParams {
  title?: string | null;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class ShareService {
  private _shareSupportPromise?: Promise<ShareSupport>;

  async shareText({ title, text }: ShareParams): Promise<ShareOutcome> {
    if (!text) {
      return 'failed';
    }

    if (typeof window === 'undefined') {
      return 'unavailable';
    }

    const support = await this.getShareSupport();

    if (support === 'native') {
      try {
        await Share.share({
          title: title ?? undefined,
          text,
        });
        return 'shared';
      } catch (err) {
        if (this._isCancelled(err)) {
          return 'cancelled';
        }
        console.error('Native share failed:', err);
        return 'failed';
      }
    }

    if (support === 'web' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: title ?? undefined,
          text,
        });
        return 'shared';
      } catch (err) {
        if (this._isCancelled(err)) {
          return 'cancelled';
        }
        console.error('Web share failed:', err);
        return 'failed';
      }
    }

    return 'unavailable';
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

  private _isCancelled(err: unknown): boolean {
    if (!err) {
      return false;
    }
    const message = (err as Error)?.message ?? '';
    const name = (err as Error)?.name ?? '';

    return (
      name === 'AbortError' ||
      name === 'NotAllowedError' ||
      message.toLowerCase().includes('cancel') ||
      message.toLowerCase().includes('abort')
    );
  }

  private async _detectShareSupport(): Promise<ShareSupport> {
    if (Capacitor.isNativePlatform()) {
      try {
        const canShare = await Share.canShare();
        if (canShare.value) {
          return 'native';
        }
      } catch (err) {
        console.warn('Share.canShare failed:', err);
      }
      return 'none';
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      return 'web';
    }

    return 'none';
  }
}
