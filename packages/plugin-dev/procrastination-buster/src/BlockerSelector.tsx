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
            class="blocker-card"
            onClick={() => props.onSelect(type)}
          >
            <h3>{type.title}</h3>
            <p>{type.emotion}</p>
          </button>
        )}
      </For>
    </div>
  );
};
