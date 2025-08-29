import { Component, createSignal, Show } from 'solid-js';
import { PromptCategory } from './types';
import HomeView from './components/HomeView';
import CategoryView from './components/CategoryView';
import PromptView from './components/PromptView';
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
      setCurrentView('category');
      setSelectedPrompt(null);
      setGeneratedPrompt('');
    } else if (currentView() === 'category') {
      setCurrentView('home');
      setSelectedCategory(null);
    }
  };

  const handlePromptUpdate = (prompt: string) => {
    setGeneratedPrompt(prompt);
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
          <HomeView onSelectCategory={handleSelectCategory} />
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
      </main>
    </div>
  );
};

export default App;
