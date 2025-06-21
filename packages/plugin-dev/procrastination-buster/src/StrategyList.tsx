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
        <h2>{props.type.title}</h2>
        <p class="emotion">{props.type.emotion}</p>
      </div>

      <h3>Recommended Strategies:</h3>

      <div class="strategy-list">
        <For each={props.type.strategies}>
          {(strategy) => (
            <div class="strategy-item">
              <p class="strategy-text">{strategy}</p>
              <div class="strategy-actions">
                <button
                  class="action-button task"
                  onClick={() => props.onStrategyAction(strategy, 'task')}
                  title="Add as task"
                >
                  + Task
                </button>
                {strategy.toLowerCase().includes('pomodoro') && (
                  <button
                    class="action-button pomodoro"
                    onClick={() => props.onStrategyAction(strategy, 'pomodoro')}
                    title="Start Pomodoro"
                  >
                    ⏱️ Start
                  </button>
                )}
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
