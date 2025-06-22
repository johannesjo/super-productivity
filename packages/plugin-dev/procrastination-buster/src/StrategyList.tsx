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
              <div class="strategy-actions">
                <button
                  class="strategy-action-btn"
                  onClick={() => props.onStrategyAction(strategy, 'task')}
                  title="Create a task for this strategy"
                >
                  📝 Add as Task
                </button>
                <button
                  class="strategy-action-btn pomodoro-btn"
                  onClick={() => props.onStrategyAction(strategy, 'pomodoro')}
                  title="Start a Pomodoro session"
                >
                  🍅 Start Pomodoro
                </button>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
