import { Action, ActionType } from '../../types';

interface ActionInputProps {
  action: Action;
  onChange: (action: Action) => void;
  onRemove: () => void;
}

export function ActionInput(props: ActionInputProps) {
  const types: ActionType[] = ['createTask', 'addTag'];

  return (
    <div class="action-input">
      <select
        value={props.action.type}
        onChange={(e) =>
          props.onChange({ ...props.action, type: e.currentTarget.value as ActionType })
        }
      >
        {types.map((t) => (
          <option value={t}>{t}</option>
        ))}
      </select>
      <input
        type="text"
        value={props.action.value}
        onInput={(e) => props.onChange({ ...props.action, value: e.currentTarget.value })}
        placeholder="Value"
      />
      <button class="remove-btn" onClick={props.onRemove}>
        🗑️
      </button>
    </div>
  );
}
