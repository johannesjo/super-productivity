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
  const updateRule = (updates: Partial<AutomationRule>) => {
    props.onSave({ ...props.rule, ...updates });
  };

  const triggerTypes: AutomationTriggerType[] = ['taskCreated', 'taskUpdated', 'taskCompleted'];

  return (
    <article class="rule-editor">
      <header>
        <div class="grid">
          <div>
            <h3>{props.rule.id ? 'Edit Rule' : 'New Rule'}</h3>
          </div>
          <div style={{ 'text-align': 'right' }}>
            <button
              class="secondary outline"
              onClick={props.onCancel}
              style={{ 'margin-right': '0.5rem' }}
            >
              Cancel
            </button>
            <button onClick={() => props.onSave(props.rule)}>Save</button>
          </div>
        </div>
      </header>

      <form onSubmit={(e) => e.preventDefault()}>
        <label>
          Rule Name
          <input
            type="text"
            value={props.rule.name}
            onInput={(e) => updateRule({ name: e.currentTarget.value })}
            placeholder="e.g. Auto-tag urgent tasks"
          />
        </label>

        <label>
          Trigger
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
        </label>

        <hr />

        <div class="section">
          <h4>Conditions</h4>
          <p>
            <small>All conditions must be met for the rule to run.</small>
          </p>
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
            class="outline"
            onClick={() =>
              updateRule({
                conditions: [...props.rule.conditions, { type: 'titleContains', value: '' }],
              })
            }
          >
            + Add Condition
          </button>
        </div>

        <hr />

        <div class="section">
          <h4>Actions</h4>
          <p>
            <small>These actions will be executed when the rule matches.</small>
          </p>
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
            class="outline"
            onClick={() =>
              updateRule({
                actions: [...props.rule.actions, { type: 'addTag', value: '' }],
              })
            }
          >
            + Add Action
          </button>
        </div>
      </form>
    </article>
  );
}
