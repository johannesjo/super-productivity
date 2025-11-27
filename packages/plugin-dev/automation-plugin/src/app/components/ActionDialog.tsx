import { createSignal, createEffect } from 'solid-js';
import { Action, ActionType } from '../../types';
import { Dialog } from './Dialog';

interface ActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (action: Action) => void;
  initialAction?: Action;
}

export function ActionDialog(props: ActionDialogProps) {
  const [action, setAction] = createSignal<Action>({ type: 'createTask', value: '' });

  createEffect(() => {
    if (props.isOpen) {
      if (props.initialAction) {
        setAction({ ...props.initialAction });
      } else {
        setAction({ type: 'createTask', value: '' });
      }
    }
  });

  const types: ActionType[] = ['createTask', 'addTag'];

  return (
    <Dialog
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.initialAction ? 'Edit Action' : 'Add Action'}
      footer={
        <div class="grid">
          <button class="outline secondary" onClick={props.onClose}>
            Cancel
          </button>
          <button onClick={() => props.onSave(action())}>Save</button>
        </div>
      }
    >
      <label>
        Type
        <select
          value={action().type}
          onChange={(e) => setAction({ ...action(), type: e.currentTarget.value as ActionType })}
        >
          {types.map((t) => (
            <option value={t}>{t}</option>
          ))}
        </select>
      </label>
      <label>
        Value
        <input
          type="text"
          value={action().value}
          onInput={(e) => setAction({ ...action(), value: e.currentTarget.value })}
          placeholder={
            action().type === 'createTask' ? 'e.g. "Follow up task"' : 'e.g. "review-needed"'
          }
        />
      </label>
    </Dialog>
  );
}
