import { Component, createSignal, Show } from 'solid-js';
import {
  ProcrastinationType,
  procrastinationTypes,
  PluginMessageType,
  WindowMessageType,
  StrategyActionType,
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

  const handleStrategyAction = async (strategy: string, action: StrategyActionType) => {
    const selectedBlocker = selectedType();
    if (!selectedBlocker) return;

    try {
      let message;

      switch (action) {
        case StrategyActionType.FOCUS_SESSION:
          message = {
            type: PluginMessageType.START_POMODORO,
          };
          break;
        default:
          console.warn('Unknown action type:', action);
          return;
      }

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
        <header class="header page-fade">
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
          <div class="intro page-fade">
            <h2>What's holding you back?</h2>
            <p class="text-muted">Choose what best matches your current feeling:</p>
          </div>
        </Show>

        <Show when={!selectedType()}>
          <div class="page-fade">
            <BlockerSelector
              types={procrastinationTypes}
              onSelect={handleSelectType}
            />
          </div>
        </Show>

        <Show when={selectedType()}>
          <div class="page-fade">
            <StrategyList
              type={selectedType()!}
              onStrategyAction={handleStrategyAction}
            />
          </div>
        </Show>
      </main>
    </div>
  );
};

export default App;
