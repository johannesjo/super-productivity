import { For } from 'solid-js';
import { AutomationRule } from '../../types';

interface RuleListProps {
  rules: AutomationRule[];
  onEdit: (rule: AutomationRule) => void;
  onDelete: (rule: AutomationRule) => void;
  onToggleStatus: (rule: AutomationRule) => void;
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
          <button class="outline" onClick={props.onCreate}>
            + New Rule
          </button>
        </div>
      </div>

      <div
        style={{
          'background-color': 'var(--pico-color-amber-100)',
          color: 'var(--pico-color-amber-900)',
          padding: '1rem',
          'margin-bottom': '1rem',
          'border-radius': 'var(--pico-border-radius)',
          border: '1px solid var(--pico-color-amber-200)',
        }}
      >
        <strong>Warning:</strong> The plugin is very powerful and using it can destroy ones data
      </div>

      <figure>
        <table role="grid">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Trigger</th>
              <th scope="col">Status</th>
              <th scope="col" style={{ 'text-align': 'right' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <For
              each={props.rules}
              fallback={
                <tr>
                  <td colspan={4}>No rules found. Create one to get started!</td>
                </tr>
              }
            >
              {(rule) => (
                <tr>
                  <td>{rule.name}</td>
                  <td>{rule.trigger.type}</td>
                  <td>
                    <label>
                      <input
                        type="checkbox"
                        checked={rule.isEnabled}
                        onChange={() => props.onToggleStatus(rule)}
                      />
                      {rule.isEnabled ? ' Enabled' : ' Disabled'}
                    </label>
                  </td>
                  <td style={{ 'text-align': 'right' }}>
                    <button
                      class="outline"
                      onClick={() => props.onEdit(rule)}
                      style={{ 'margin-right': '0.5rem' }}
                    >
                      Edit
                    </button>
                    <button class="outline contrast" onClick={() => props.onDelete(rule)}>
                      Delete
                    </button>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </figure>
    </div>
  );
}
