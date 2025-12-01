import { createSignal } from 'solid-js';
import { PromptCategory, CustomPrompt } from '../types';

export type ViewState = 'home' | 'category' | 'prompt' | 'custom' | 'custom-editor';

export interface SelectedPrompt {
  category: PromptCategory;
  prompt: { title: string; template: string };
}

export interface CustomPromptSelection {
  prompt: CustomPrompt;
  index: number;
}

export const useNavigation = () => {
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

  const navigateToCategory = (category: PromptCategory) => {
    setSelectedCategory(category);
    setCurrentView('category');
  };

  const navigateToPrompt = (prompt: { title: string; template: string }) => {
    const category = selectedCategory();
    if (!category) return;

    setSelectedPrompt({ category, prompt });
    setCurrentView('prompt');
  };

  const navigateToCustomPrompts = () => {
    setCurrentView('custom');
  };

  const navigateToCustomPrompt = (prompt: CustomPrompt, index: number) => {
    setSelectedCustomPrompt({ prompt, index });
    setSelectedPrompt({
      category: { title: 'Custom Prompts', prompts: [] },
      prompt: { title: prompt.title, template: prompt.template },
    });
    setCurrentView('prompt');
  };

  const navigateToCustomPromptEditor = (prompt: CustomPrompt | null, index?: number) => {
    setEditingPrompt({ prompt, index });
    setCurrentView('custom-editor');
  };

  const navigateBack = () => {
    const current = currentView();

    if (current === 'prompt') {
      if (selectedCustomPrompt()) {
        setCurrentView('custom');
        setSelectedPrompt(null);
        setSelectedCustomPrompt(null);
      } else {
        setCurrentView('category');
        setSelectedPrompt(null);
      }
    } else if (current === 'category') {
      setCurrentView('home');
      setSelectedCategory(null);
    } else if (current === 'custom') {
      setCurrentView('home');
    } else if (current === 'custom-editor') {
      setCurrentView('custom');
      setEditingPrompt(null);
    }
  };

  const saveCustomPrompt = () => {
    setCurrentView('custom');
    setEditingPrompt(null);
  };

  const cancelCustomPromptEdit = () => {
    setCurrentView('custom');
    setEditingPrompt(null);
  };

  return {
    // State
    currentView,
    selectedCategory,
    selectedPrompt,
    selectedCustomPrompt,
    editingPrompt,

    // Navigation actions
    navigateToCategory,
    navigateToPrompt,
    navigateToCustomPrompts,
    navigateToCustomPrompt,
    navigateToCustomPromptEditor,
    navigateBack,
    saveCustomPrompt,
    cancelCustomPromptEdit,
  };
};
