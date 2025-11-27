import { createSignal, onMount, createEffect } from 'solid-js';
import { Condition, ConditionType } from '../../types';
import { Dialog } from './Dialog';

interface ConditionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (condition: Condition) => void;
  initialCondition?: Condition;
  projects?: any[];
  tags?: any[];
}

export function ConditionDialog(props: ConditionDialogProps) {
  const [condition, setCondition] = createSignal<Condition>({ type: 'titleContains', value: '' });

  createEffect(() => {
    if (props.isOpen) {
      if (props.initialCondition) {
        setCondition({ ...props.initialCondition });
      } else {
        setCondition({ type: 'titleContains', value: '' });
      }
    }
  });

  const types: ConditionType[] = ['titleContains', 'projectIs', 'hasTag'];

  return (
    <Dialog
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.initialCondition ? 'Edit Condition' : 'Add Condition'}
      footer={
        <div class="grid">
          <button class="outline secondary" onClick={props.onClose}>
            Cancel
          </button>
          <button onClick={() => props.onSave(condition())}>Save</button>
        </div>
      }
    >
      <label>
        Type
        <select
          value={condition().type}
          onChange={(e) =>
            setCondition({ ...condition(), type: e.currentTarget.value as ConditionType })
          }
        >
          {types.map((t) => (
            <option value={t}>{t}</option>
          ))}
        </select>
      </label>
      <label>
        Value
        {condition().type === 'projectIs' && props.projects ? (
          <select
            value={condition().value}
            onChange={(e) => setCondition({ ...condition(), value: e.currentTarget.value })}
          >
            <option value="">Select Project</option>
            {props.projects.map((p) => (
              <option value={p.title}>{p.title}</option>
            ))}
          </select>
        ) : condition().type === 'hasTag' && props.tags ? (
          <select
            value={condition().value}
            onChange={(e) => setCondition({ ...condition(), value: e.currentTarget.value })}
          >
            <option value="">Select Tag</option>
            {props.tags.map((t) => (
              <option value={t.title}>{t.title}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={condition().value}
            onInput={(e) => setCondition({ ...condition(), value: e.currentTarget.value })}
            placeholder={
              condition().type === 'titleContains'
                ? 'e.g. "bug"'
                : condition().type === 'projectIs'
                  ? 'e.g. "Project A"'
                  : 'e.g. "urgent"'
            }
          />
        )}
      </label>
    </Dialog>
  );
}
