import { Component, For, Show } from 'solid-js';
import { ProcrastinationType, StrategyActionType } from './types';

interface StrategyListProps {
  type: ProcrastinationType;
  onStrategyAction: (strategy: string, action: StrategyActionType) => void;
}

export const StrategyList: Component<StrategyListProps> = (props) => {
  const getStrategyText = (
    strategy: string | { text: string; action?: StrategyActionType },
  ) => {
    return typeof strategy === 'string' ? strategy : strategy.text;
  };

  const getStrategyAction = (
    strategy: string | { text: string; action?: StrategyActionType },
  ) => {
    return typeof strategy === 'string' ? undefined : strategy.action;
  };

  return (
    <div class="strategy-container">
      <div class="selected-type">
        <h2 class="text-primary">{props.type.title}</h2>
        <p class="emotion text-muted">{props.type.emotion}</p>
      </div>

      <h3>Recommended Strategies:</h3>

      <div class="strategy-list">
        <For each={props.type.strategies}>
          {(strategy, index) => {
            const text = getStrategyText(strategy);
            const action = getStrategyAction(strategy);

            return (
              <div class="strategy-item card">
                <div class="strategy-content">
                  <p class="strategy-text">{text}</p>
                  <Show when={action}>
                    <button
                      class="strategy-action-btn"
                      onClick={() => props.onStrategyAction(text, action!)}
                      title="Start a focus session"
                    >
                      🎯 Start focus session
                    </button>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};
