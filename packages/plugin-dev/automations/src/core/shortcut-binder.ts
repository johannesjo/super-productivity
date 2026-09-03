import { PluginAPI } from '@super-productivity/plugin-api';
import { AutomationRule } from '../types';

const FALLBACK_LABEL = 'Unnamed automation rule';

const labelFor = (rule: AutomationRule): string => rule.name.trim() || FALLBACK_LABEL;

/**
 * Keeps the host's plugin shortcut list in sync with the rules that use the
 * "shortcut" trigger.
 *
 * The host stores the key the user picked under `plugin_<pluginId>:<shortcutId>`,
 * so the shortcut id has to stay stable for the lifetime of a rule — we use the
 * rule id, which means renaming a rule keeps its key binding.
 *
 * Only enabled rules are registered: a registered shortcut swallows its key
 * combo in the host, so a disabled rule must not keep the key occupied.
 */
export class ShortcutBinder {
  // ruleId -> last registered label, so we only re-register on actual changes.
  private registeredLabels = new Map<string, string>();

  constructor(
    private plugin: PluginAPI,
    private onExec: (ruleId: string) => void,
  ) {}

  sync(rules: AutomationRule[]): void {
    const shortcutRules = rules.filter((r) => r.trigger.type === 'shortcut' && r.isEnabled);
    const activeIds = new Set(shortcutRules.map((r) => r.id));

    for (const ruleId of [...this.registeredLabels.keys()]) {
      if (!activeIds.has(ruleId)) {
        this.unregister(ruleId);
      }
    }

    for (const rule of shortcutRules) {
      const label = labelFor(rule);
      if (this.registeredLabels.get(rule.id) === label) continue;

      this.plugin.registerShortcut({
        id: rule.id,
        label,
        onExec: () => this.onExec(rule.id),
      });
      this.registeredLabels.set(rule.id, label);
    }
  }

  private unregister(ruleId: string): void {
    this.registeredLabels.delete(ruleId);
    // Older hosts have no way to drop a single shortcut; there the entry just
    // stays around (inert, since the rule is gone) until the next app start.
    if (typeof this.plugin.unregisterShortcut !== 'function') {
      this.plugin.log.warn(
        '[Automation] Host cannot unregister shortcuts; stale entry remains until restart.',
      );
      return;
    }
    this.plugin.unregisterShortcut(ruleId);
  }
}
