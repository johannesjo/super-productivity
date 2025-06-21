import { createSignal, Show, Component } from 'solid-js';
import { procrastinationTypes, ProcrastinationType } from './types';
import { BlockerSelector } from './BlockerSelector';
import { StrategyList } from './StrategyList';
import './App.css';

const App: Component = () => {
  const [selectedType, setSelectedType] = createSignal<ProcrastinationType | null>(null);
  const [showIntro, setShowIntro] = createSignal(true);

  const handleSelectType = (type: ProcrastinationType) => {
    setSelectedType(type);
    setShowIntro(false);
  };

  const handleBack = () => {
    setSelectedType(null);
    setShowIntro(true);
  };

  const handleStrategyAction = async (strategy: string, action: 'task' | 'pomodoro') => {
    const selectedBlocker = selectedType();
    if (!selectedBlocker) return;

    try {
      // Send message to plugin
      const message =
        action === 'task'
          ? {
              type: 'ADD_STRATEGY_TASK',
              strategy,
              blockerType: selectedBlocker.title,
            }
          : {
              type: 'START_POMODORO',
            };

      // Post message to parent (Super Productivity)
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'PLUGIN_MESSAGE',
            pluginId: 'procrastination-buster',
            data: message,
          },
          '*',
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div class="app">
      <header class="header">
        <h1>Procrastination Buster</h1>
        <Show when={!showIntro()}>
          <button
            class="back-button"
            onClick={handleBack}
          >
            ← Back
          </button>
        </Show>
      </header>

      <main class="main">
        <Show when={showIntro()}>
          <div class="intro">
            <h2>What's holding you back?</h2>
            <p>Choose what best matches your current feeling:</p>
          </div>
        </Show>

        <Show when={!selectedType()}>
          <BlockerSelector
            types={procrastinationTypes}
            onSelect={handleSelectType}
          />
        </Show>

        <Show when={selectedType()}>
          <StrategyList
            type={selectedType()!}
            onStrategyAction={handleStrategyAction}
          />
        </Show>
      </main>

      <footer class="footer">
        <p>
          💡 Tip: Use <kbd>Ctrl+Shift+P</kbd> for quick access
        </p>
      </footer>
    </div>
  );
};

export default App;
