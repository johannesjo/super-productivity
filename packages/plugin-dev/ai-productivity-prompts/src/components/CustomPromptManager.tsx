import { Component, createSignal, For, onMount } from 'solid-js';
import { CustomPrompt } from '../types';
import { CustomPromptStore } from '../customPromptStore';

interface CustomPromptManagerProps {
  onSelectPrompt: (prompt: CustomPrompt, index: number) => void;
  onEditPrompt: (prompt: CustomPrompt | null, index?: number) => void;
}

const CustomPromptManager: Component<CustomPromptManagerProps> = (props) => {
  const [prompts, setPrompts] = createSignal<CustomPrompt[]>([]);
  const [isLoading, setIsLoading] = createSignal<boolean>(false);

  const store = CustomPromptStore.getInstance();

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      const loadedPrompts = await store.loadPrompts();
      setPrompts(loadedPrompts);
    } catch (error) {
      console.error('Error loading custom prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePrompt = async (index: number) => {
    const prompt = prompts()[index];

    if (!confirm(`Delete prompt "${prompt.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await store.deletePrompt(index);
      await loadPrompts(); // Reload prompts
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('Error deleting prompt. Please try again.');
    }
  };

  const getPromptPreview = (prompt: CustomPrompt) => {
    if (!prompt || !prompt.template) {
      return 'No preview available';
    }
    const lines = prompt.template.split('\n');
    const firstLine = lines[0]?.trim() || '';
    return firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;
  };

  onMount(() => {
    loadPrompts();
  });

  return (
    <div class="page-fade">
      <div class="custom-prompts-header">
        <h2 class="text-primary">My Custom Prompts</h2>
        <button
          class="action-button primary"
          onClick={() => props.onEditPrompt(null)}
        >
          ➕ Add Custom Prompt
        </button>
      </div>

      {isLoading() ? (
        <div class="loading-container">
          <p class="text-muted">Loading custom prompts...</p>
        </div>
      ) : prompts().length === 0 ? (
        <div class="empty-state">
          <p class="text-muted">No custom prompts yet.</p>
          <p class="text-muted">Create your first custom prompt to get started!</p>
          <button
            class="action-button primary"
            onClick={() => props.onEditPrompt(null)}
          >
            Create First Prompt
          </button>
        </div>
      ) : (
        <div class="custom-prompts-list">
          <For each={prompts()}>
            {(prompt, index) => (
              <div class="custom-prompt-card card">
                <div class="custom-prompt-header">
                  <h3 class="prompt-title">{prompt.title}</h3>
                  <div class="prompt-actions">
                    <button
                      class="action-button secondary"
                      onClick={() => props.onEditPrompt(prompt, index())}
                      title="Edit prompt"
                    >
                      ✏️
                    </button>
                    <button
                      class="action-button secondary"
                      onClick={() => handleDeletePrompt(index())}
                      title="Delete prompt"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div class="prompt-preview">
                  <p class="text-muted">{getPromptPreview(prompt)}</p>
                </div>

                <div class="prompt-card-actions">
                  <button
                    class="action-button primary"
                    onClick={() => props.onSelectPrompt(prompt, index())}
                  >
                    Use This Prompt
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      )}
    </div>
  );
};

export default CustomPromptManager;
