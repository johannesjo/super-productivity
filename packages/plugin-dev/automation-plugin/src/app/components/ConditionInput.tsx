import { Condition, ConditionType } from '../../types';

interface ConditionInputProps {
  condition: Condition;
  onChange: (condition: Condition) => void;
  onRemove: () => void;
}

export function ConditionInput(props: ConditionInputProps) {
  const types: ConditionType[] = ['titleContains', 'projectIs', 'hasTag'];

  return (
    <div class="condition-input">
      <select
        value={props.condition.type}
        onChange={(e) =>
          props.onChange({ ...props.condition, type: e.currentTarget.value as ConditionType })
        }
      >
        {types.map((t) => (
          <option value={t}>{t}</option>
        ))}
      </select>
      <input
        type="text"
        value={props.condition.value}
        onInput={(e) => props.onChange({ ...props.condition, value: e.currentTarget.value })}
        placeholder="Value"
      />
      <button class="remove-btn" onClick={props.onRemove}>
        🗑️
      </button>
    </div>
  );
}
