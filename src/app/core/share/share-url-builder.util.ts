import { SharePayload, ShareTarget } from './share.model';
import * as ShareTextUtil from './share-text.util';

const FALLBACK_SHARE_URL = 'https://super-productivity.com';

/**
 * Build platform-specific share URL.
 */
export const buildShareUrl = (payload: SharePayload, target: ShareTarget): string => {
  const enc = encodeURIComponent;
  const shareUrl = payload.url?.trim() || FALLBACK_SHARE_URL;
  const baseTitle = ShareTextUtil.getShareTitle(payload);

  const providerText = ShareTextUtil.buildProviderText(payload, target);
  const providerTitle = ShareTextUtil.buildProviderTitle(baseTitle, target);
  const inlineText = ShareTextUtil.inlineShareText(providerText || providerTitle);

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
      return `https://wa.me/?text=${ShareTextUtil.encodeForWhatsApp(providerText || providerTitle || shareUrl)}`;
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
};
