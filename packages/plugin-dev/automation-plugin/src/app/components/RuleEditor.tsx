import { For } from 'solid-js';
import { AutomationRule, AutomationTriggerType } from '../../types';
import { ConditionInput } from './ConditionInput';
import { ActionInput } from './ActionInput';

interface RuleEditorProps {
  rule: AutomationRule;
  onSave: (rule: AutomationRule) => void;
  onCancel: () => void;
}

export function RuleEditor(props: RuleEditorProps) {
  // Local state management would be better here, but for MVP we rely on parent or direct mutation for simplicity in this draft
  // In a real app, we'd clone the rule and only emit onSave.
  // Here we assume the parent handles the "draft" state or we just edit in place for now.
  // Let's implement a simple local clone to avoid direct mutation issues if props are reactive.

  // Actually, for this draft, let's assume the parent passes a mutable clone or handles updates.
  // We will emit updated objects.

  const updateRule = (updates: Partial<AutomationRule>) => {
    props.onSave({ ...props.rule, ...updates });
  };

  const triggerTypes: AutomationTriggerType[] = ['taskCreated', 'taskUpdated', 'taskCompleted'];

  return (
    <div class="rule-editor">
      <div class="editor-header">
        <h2>{props.rule.id ? 'Edit Rule' : 'New Rule'}</h2>
        <div class="actions">
          <button onClick={props.onCancel}>Cancel</button>
          <button class="save-btn" onClick={() => props.onSave(props.rule)}>
            Save
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>Rule Name</label>
        <input
          type="text"
          value={props.rule.name}
          onInput={(e) => updateRule({ name: e.currentTarget.value })}
        />
      </div>

      <div class="form-group">
        <label>Trigger</label>
        <select
          value={props.rule.trigger.type}
          onChange={(e) =>
            updateRule({ trigger: { type: e.currentTarget.value as AutomationTriggerType } })
          }
        >
          {triggerTypes.map((t) => (
            <option value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div class="section">
        <h3>Conditions</h3>
        <For each={props.rule.conditions}>
          {(condition, i) => (
            <ConditionInput
              condition={condition}
              onChange={(newCond) => {
                const newConditions = [...props.rule.conditions];
                newConditions[i()] = newCond;
                updateRule({ conditions: newConditions });
              }}
              onRemove={() => {
                const newConditions = props.rule.conditions.filter((_, idx) => idx !== i());
                updateRule({ conditions: newConditions });
              }}
            />
          )}
        </For>
        <button
          class="add-btn"
          onClick={() =>
            updateRule({
              conditions: [...props.rule.conditions, { type: 'titleContains', value: '' }],
            })
          }
        >
          + Add Condition
        </button>
      </div>

      <div class="section">
        <h3>Actions</h3>
        <For each={props.rule.actions}>
          {(action, i) => (
            <ActionInput
              action={action}
              onChange={(newAction) => {
                const newActions = [...props.rule.actions];
                newActions[i()] = newAction;
                updateRule({ actions: newActions });
              }}
              onRemove={() => {
                const newActions = props.rule.actions.filter((_, idx) => idx !== i());
                updateRule({ actions: newActions });
              }}
            />
          )}
        </For>
        <button
          class="add-btn"
          onClick={() =>
            updateRule({
              actions: [...props.rule.actions, { type: 'addTag', value: '' }],
            })
          }
        >
          + Add Action
        </button>
      </div>
    </div>
  );
}
