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
      <div class="grid">
        <div>
          <h2>Automation Rules</h2>
        </div>
        <div style={{ 'text-align': 'right' }}>
          <button onClick={props.onCreate}>+ New Rule</button>
        </div>
      </div>

      <div class="rule-list">
        <For
          each={props.rules}
          fallback={<article>No rules found. Create one to get started!</article>}
        >
          {(rule) => (
            <article class="rule-item" style={{ 'margin-bottom': '1rem' }}>
              <header>
                <div class="grid">
                  <div>
                    <strong>{rule.name}</strong>
                  </div>
                  <div style={{ 'text-align': 'right' }}>
                    {rule.isEnabled ? (
                      <span data-tooltip="Enabled">✅</span>
                    ) : (
                      <span data-tooltip="Disabled">❌</span>
                    )}
                  </div>
                </div>
              </header>
              <div class="grid">
                <div>
                  <small>Trigger: {rule.trigger.type}</small>
                </div>
                <div style={{ 'text-align': 'right' }}>
                  <button class="outline secondary" onClick={() => props.onEdit(rule)}>
                    Edit
                  </button>
                </div>
              </div>
            </article>
          )}
        </For>
      </div>
    </div>
  );
}
