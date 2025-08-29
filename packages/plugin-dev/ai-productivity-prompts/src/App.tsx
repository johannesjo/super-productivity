import { Component, createSignal, Show, For } from 'solid-js';
import { PROMPT_CATEGORIES, PromptCategory, renderPrompt } from './types';
import './App.css';

type ViewState = 'home' | 'category' | 'prompt';

interface SelectedPrompt {
  category: PromptCategory;
  prompt: { title: string; template: string };
}

const App: Component = () => {
  const [currentView, setCurrentView] = createSignal<ViewState>('home');
  const [selectedCategory, setSelectedCategory] = createSignal<PromptCategory | null>(
    null,
  );
  const [selectedPrompt, setSelectedPrompt] = createSignal<SelectedPrompt | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = createSignal<string>('');
  const [includeAllTasks, setIncludeAllTasks] = createSignal<boolean>(false);

  const handleSelectCategory = (category: PromptCategory) => {
    setSelectedCategory(category);
    setCurrentView('category');
  };

  const handleSelectPrompt = async (prompt: { title: string; template: string }) => {
    const category = selectedCategory();
    if (!category) return;

    setSelectedPrompt({ category, prompt });
    setCurrentView('prompt');

    // Generate initial prompt without tasks
    await regeneratePrompt();
  };

  const regeneratePrompt = async () => {
    const prompt = selectedPrompt()?.prompt;
    if (!prompt) return;

    // Get tasks from Super Productivity if checkbox is checked
    const pluginAPI = (window as any).PluginAPI;
    let tasksMd = '';

    if (includeAllTasks() && pluginAPI) {
      try {
        const tasks = await pluginAPI.getCurrentTasks?.();
        if (tasks && tasks.length > 0) {
          tasksMd = tasks.map((task: any) => `- [ ] ${task.title}`).join('\n');
        }
      } catch (error) {
        console.log('Could not fetch tasks:', error);
      }
    }

    const rendered = renderPrompt(prompt.template, tasksMd);
    setGeneratedPrompt(rendered);
  };

  const handleBack = () => {
    if (currentView() === 'prompt') {
      setCurrentView('category');
      setSelectedPrompt(null);
      setGeneratedPrompt('');
    } else if (currentView() === 'category') {
      setCurrentView('home');
      setSelectedCategory(null);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt());
      // Show a brief success message
      const button = document.querySelector('.copy-button') as HTMLButtonElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.disabled = true;
        setTimeout(() => {
          button.textContent = originalText;
          button.disabled = false;
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getChatGPTUrl = () => {
    const prompt = generatedPrompt().replace(/\./g, ' ').replace(/-/g, ' ');
    const encodedPrompt = encodeURI(prompt);
    const url = `https://chat.openai.com/?q=${encodedPrompt}`;
    console.log('Generated ChatGPT URL:', url);
    console.log('Prompt length:', prompt.length);
    return url;
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
            <h2>AI Productivity Prompts</h2>
            <p class="text-muted">Choose what you need help with:</p>
          </div>

          <div class="category-grid page-fade">
            <For each={PROMPT_CATEGORIES}>
              {(category) => (
                <button
                  class="category-card card card-clickable"
                  onClick={() => handleSelectCategory(category)}
                >
                  <h3 class="text-primary">{category.title}</h3>
                  <p class="text-muted">{category.prompts.length} prompts</p>
                </button>
              )}
            </For>
          </div>
        </Show>

        {/* Category View */}
        <Show when={currentView() === 'category' && selectedCategory()}>
          <div class="category-container page-fade">
            <div class="selected-category">
              <h2 class="text-primary">{selectedCategory()!.title}</h2>
            </div>

            <h3>Available Prompts:</h3>

            <div class="prompt-list">
              <For each={selectedCategory()!.prompts}>
                {(prompt) => (
                  <button
                    class="prompt-item card card-clickable"
                    onClick={() => handleSelectPrompt(prompt)}
                  >
                    <h4 class="prompt-title">{prompt.title}</h4>
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Prompt View */}
        <Show when={currentView() === 'prompt' && selectedPrompt()}>
          <div class="page-fade">
            <div class="selected-prompt-header">
              <h2 class="text-primary">{selectedPrompt()!.prompt.title}</h2>
              <p class="text-muted">From: {selectedPrompt()!.category.title}</p>
            </div>

            <div class="prompt-options">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeAllTasks()}
                  onChange={(e) => {
                    setIncludeAllTasks(e.target.checked);
                    regeneratePrompt();
                  }}
                />
                Include all current tasks in prompt
              </label>
            </div>

            <textarea
              class="prompt-text"
              value={generatedPrompt()}
              readonly
              rows="15"
            />
            <div class="prompt-actions">
              <button
                class="action-button copy-button"
                onClick={copyToClipboard}
              >
                📋 Copy to clipboard
              </button>
              <a
                class="action-button chatgpt-button"
                href={getChatGPTUrl()}
                target="_blank"
                rel="noopener noreferrer"
              >
                🤖 Open in ChatGPT
              </a>
            </div>
          </div>
        </Show>
      </main>
    </div>
  );
};

export default App;
