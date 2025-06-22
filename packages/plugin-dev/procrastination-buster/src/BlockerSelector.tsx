import { Component, For } from 'solid-js';
import { ProcrastinationType } from './types';

interface BlockerSelectorProps {
  types: ProcrastinationType[];
  onSelect: (type: ProcrastinationType) => void;
}

export const BlockerSelector: Component<BlockerSelectorProps> = (props) => {
  return (
    <div class="blocker-grid">
      <For each={props.types}>
        {(type) => (
          <button
            class="blocker-card card card-hover"
            onClick={() => props.onSelect(type)}
          >
            <h3 class="text-primary">{type.title}</h3>
            <p class="text-muted">{type.emotion}</p>
          </button>
        )}
      </For>
    </div>
  );
};
