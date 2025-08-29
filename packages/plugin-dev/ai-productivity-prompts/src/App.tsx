import { Component, createSignal, Show } from 'solid-js';
import { PromptCategory, CustomPrompt } from './types';
import HomeView from './components/HomeView';
import CategoryView from './components/CategoryView';
import PromptView from './components/PromptView';
import CustomPromptManager from './components/CustomPromptManager';
import CustomPromptEditor from './components/CustomPromptEditor';
import './App.css';

type ViewState = 'home' | 'category' | 'prompt' | 'custom' | 'custom-editor';

interface SelectedPrompt {
  category: PromptCategory;
  prompt: { title: string; template: string };
}

interface CustomPromptSelection {
  prompt: CustomPrompt;
  index: number;
}

const App: Component = () => {
  const [currentView, setCurrentView] = createSignal<ViewState>('home');
  const [selectedCategory, setSelectedCategory] = createSignal<PromptCategory | null>(
    null,
  );
  const [selectedPrompt, setSelectedPrompt] = createSignal<SelectedPrompt | null>(null);
  const [selectedCustomPrompt, setSelectedCustomPrompt] =
    createSignal<CustomPromptSelection | null>(null);
  const [editingPrompt, setEditingPrompt] = createSignal<{
    prompt: CustomPrompt | null;
    index?: number;
  } | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = createSignal<string>('');

  const handleSelectCategory = (category: PromptCategory) => {
    setSelectedCategory(category);
    setCurrentView('category');
  };

  const handleSelectPrompt = (prompt: { title: string; template: string }) => {
    const category = selectedCategory();
    if (!category) return;

    setSelectedPrompt({ category, prompt });
    setCurrentView('prompt');
  };

  const handleBack = () => {
    if (currentView() === 'prompt') {
      if (selectedCustomPrompt()) {
        setCurrentView('custom');
        setSelectedPrompt(null);
        setSelectedCustomPrompt(null);
      } else {
        setCurrentView('category');
        setSelectedPrompt(null);
      }
      setGeneratedPrompt('');
    } else if (currentView() === 'category') {
      setCurrentView('home');
      setSelectedCategory(null);
    } else if (currentView() === 'custom') {
      setCurrentView('home');
    } else if (currentView() === 'custom-editor') {
      setCurrentView('custom');
      setEditingPrompt(null);
    }
  };

  const handlePromptUpdate = (prompt: string) => {
    setGeneratedPrompt(prompt);
  };

  const handleCustomPromptsClick = () => {
    setCurrentView('custom');
  };

  const handleCustomPromptSelect = (prompt: CustomPrompt, index: number) => {
    setSelectedCustomPrompt({ prompt, index });
    setSelectedPrompt({
      category: { title: 'Custom Prompts', prompts: [] },
      prompt: { title: prompt.title, template: prompt.template },
    });
    setCurrentView('prompt');
  };

  const handleCustomPromptEdit = (prompt: CustomPrompt | null, index?: number) => {
    setEditingPrompt({ prompt, index });
    setCurrentView('custom-editor');
  };

  const handleCustomPromptSave = () => {
    setCurrentView('custom');
    setEditingPrompt(null);
  };

  const handleCustomPromptCancel = () => {
    setCurrentView('custom');
    setEditingPrompt(null);
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
        <Show when={currentView() === 'home'}>
          <HomeView
            onSelectCategory={handleSelectCategory}
            onCustomPromptsClick={handleCustomPromptsClick}
          />
        </Show>

        <Show when={currentView() === 'category' && selectedCategory()}>
          <CategoryView
            category={selectedCategory()!}
            onSelectPrompt={handleSelectPrompt}
          />
        </Show>

        <Show when={currentView() === 'prompt' && selectedPrompt()}>
          <PromptView
            selectedPrompt={selectedPrompt()!}
            onUpdatePrompt={handlePromptUpdate}
          />
        </Show>

        <Show when={currentView() === 'custom'}>
          <CustomPromptManager
            onSelectPrompt={handleCustomPromptSelect}
            onEditPrompt={handleCustomPromptEdit}
          />
        </Show>

        <Show when={currentView() === 'custom-editor'}>
          <CustomPromptEditor
            prompt={editingPrompt()?.prompt || null}
            index={editingPrompt()?.index}
            onSave={handleCustomPromptSave}
            onCancel={handleCustomPromptCancel}
          />
        </Show>
      </main>
    </div>
  );
};

export default App;
