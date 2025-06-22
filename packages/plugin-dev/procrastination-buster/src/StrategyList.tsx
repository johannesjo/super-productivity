import { Component, For } from 'solid-js';
import { ProcrastinationType } from './types';

interface StrategyListProps {
  type: ProcrastinationType;
  onStrategyAction: (strategy: string, action: 'task' | 'pomodoro') => void;
}

export const StrategyList: Component<StrategyListProps> = (props) => {
  return (
    <div class="strategy-container">
      <div class="selected-type">
        <h2 class="text-primary">{props.type.title}</h2>
        <p class="emotion text-muted">{props.type.emotion}</p>
      </div>

      <h3>Recommended Strategies:</h3>

      <div class="strategy-list">
        <For each={props.type.strategies}>
          {(strategy) => (
            <div class="strategy-item card">
              <p class="strategy-text">{strategy}</p>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
