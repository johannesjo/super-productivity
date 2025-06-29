import { Component, createSignal, Show, For } from 'solid-js';
import {
  ProcrastinationType,
  procrastinationTypes,
  PluginMessageType,
  WindowMessageType,
} from './types';
import { ProcrastinationInfo } from './ProcrastinationInfo';
import './App.css';

type ViewState = 'home' | 'info' | 'strategies';

const App: Component = () => {
  const [currentView, setCurrentView] = createSignal<ViewState>('home');
  const [selectedType, setSelectedType] = createSignal<ProcrastinationType | null>(null);

  const handleSelectType = (type: ProcrastinationType) => {
    setSelectedType(type);
    setCurrentView('strategies');
  };

  const handleBack = () => {
    setCurrentView('home');
    setSelectedType(null);
  };

  const sendPluginMessage = async (type: string, payload?: any) => {
    const pluginAPI = (window as any).PluginAPI;
    if (pluginAPI) {
      switch (type) {
        case PluginMessageType.START_FOCUS_MODE:
          return pluginAPI.dispatchAction({
            type: '[FocusMode] Show Focus Overlay',
          });
        case 'START_POMODORO':
          return pluginAPI.dispatchAction({
            type: '[Pomodoro] Start Pomodoro',
          });
      }
    }
  };

  return (
    <div class="app">
      <Show when={currentView() !== 'home'}>
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
        {/* Home View */}
        <Show when={currentView() === 'home'}>
          <div class="intro page-fade">
            <h2>What's holding you back?</h2>
            <p class="text-muted">Choose what best matches your current feeling:</p>
            <button
              class="info-button"
              onClick={() => setCurrentView('info')}
            >
              Learn about procrastination →
            </button>
          </div>

          <div class="blocker-grid page-fade">
            <For each={procrastinationTypes}>
              {(type) => (
                <button
                  class="blocker-card card card-clickable"
                  onClick={() => handleSelectType(type)}
                >
                  <h3 class="text-primary">{type.title}</h3>
                  <p class="text-muted">{type.emotion}</p>
                </button>
              )}
            </For>
          </div>
        </Show>

        {/* Info View */}
        <Show when={currentView() === 'info'}>
          <ProcrastinationInfo
            onBackToWork={() => sendPluginMessage(PluginMessageType.START_FOCUS_MODE)}
          />
        </Show>

        {/* Strategies View */}
        <Show when={currentView() === 'strategies' && selectedType()}>
          <div class="strategy-container page-fade">
            <div class="selected-type">
              <h2 class="text-primary">{selectedType()!.title}</h2>
              <p class="emotion text-muted">{selectedType()!.emotion}</p>
            </div>

            <h3>Recommended Strategies:</h3>

            <div class="strategy-list">
              <For each={selectedType()!.strategies}>
                {(strategy) => {
                  const text = typeof strategy === 'string' ? strategy : strategy.text;
                  const hasAction = typeof strategy !== 'string' && strategy.action;

                  return (
                    <div class="strategy-item card">
                      <div class="strategy-content">
                        <p class="strategy-text">{text}</p>
                        <Show when={hasAction}>
                          <button
                            class="strategy-action-btn"
                            onClick={() => sendPluginMessage('START_POMODORO')}
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
        </Show>
      </main>
    </div>
  );
};

export default App;
