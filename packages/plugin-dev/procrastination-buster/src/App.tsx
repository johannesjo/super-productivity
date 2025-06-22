import { Component, createSignal, Show } from 'solid-js';
import {
  ProcrastinationType,
  procrastinationTypes,
  PluginMessageType,
  WindowMessageType,
} from './types';
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
      const message =
        action === 'task'
          ? {
              type: PluginMessageType.ADD_STRATEGY_TASK,
              strategy,
              blockerType: selectedBlocker.title,
            }
          : {
              type: PluginMessageType.START_POMODORO,
            };

      // Send message to parent window (plugin context)
      window.parent.postMessage(
        {
          type: WindowMessageType.PLUGIN_MESSAGE,
          message: message,
          messageId: Date.now().toString(),
        },
        '*',
      );
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const sendPluginMessage = (type: PluginMessageType) => {
    try {
      window.parent.postMessage(
        {
          type: WindowMessageType.PLUGIN_MESSAGE,
          message: { type },
          messageId: Date.now().toString(),
        },
        '*',
      );
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div class="app">
      <Show when={!showIntro()}>
        <header class="header">
          <button
            class="back-button"
            onClick={handleBack}
          >
            ← Back
          </button>
        </header>
      </Show>

      <main class="main">
        <Show when={showIntro()}>
          <div class="intro">
            <h2>What's holding you back?</h2>
            <p class="text-muted">Choose what best matches your current feeling:</p>

            <div class="quick-actions">
              <button
                class="quick-action-btn"
                onClick={() => sendPluginMessage(PluginMessageType.QUICK_ADD_TASK)}
                title="Open add task bar to quickly create a task"
              >
                ✏️ Quick Add Task
              </button>
              <button
                class="quick-action-btn focus-btn"
                onClick={() => sendPluginMessage(PluginMessageType.START_FOCUS_MODE)}
                title="Activate focus mode to minimize distractions"
              >
                🎯 Focus Mode
              </button>
            </div>
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
    </div>
  );
};

export default App;
