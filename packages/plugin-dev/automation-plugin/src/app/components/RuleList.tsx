import { For } from 'solid-js';
import { AutomationRule } from '../../types';

interface RuleListProps {
  rules: AutomationRule[];
  onEdit: (rule: AutomationRule) => void;
  onCreate: () => void;
}

export function RuleList(props: RuleListProps) {
  return (
    <div class="rule-list-container">
      <div class="header-actions">
        <h2>Automation Rules</h2>
        <button class="create-btn" onClick={props.onCreate}>
          + New Rule
        </button>
      </div>

      <div class="rule-list">
        <For each={props.rules} fallback={<p>No rules found.</p>}>
          {(rule) => (
            <div class="rule-item" onClick={() => props.onEdit(rule)}>
              <div class="rule-info">
                <span class="rule-name">{rule.name}</span>
                <span class="rule-trigger">Trigger: {rule.trigger.type}</span>
              </div>
              <div class="rule-status">{rule.isEnabled ? '✅' : '❌'}</div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
