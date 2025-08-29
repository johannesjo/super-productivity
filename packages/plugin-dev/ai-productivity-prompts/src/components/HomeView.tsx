import { Component, For } from 'solid-js';
import { PromptCategory } from '../types';
import { PROMPT_CATEGORIES } from '../prompts';

interface HomeViewProps {
  onSelectCategory: (category: PromptCategory) => void;
  onCustomPromptsClick: () => void;
}

const HomeView: Component<HomeViewProps> = (props) => {
  return (
    <>
      <div class="intro page-fade">
        <h2>AI Productivity Prompts</h2>
        <p class="text-muted">Choose what you need help with:</p>
      </div>

      <div class="category-grid page-fade">
        <For each={PROMPT_CATEGORIES}>
          {(category) => (
            <button
              class="category-card card card-clickable"
              onClick={() => props.onSelectCategory(category)}
            >
              <h3 class="text-primary">{category.title}</h3>
              <p class="text-muted">{category.prompts.length} prompts</p>
            </button>
          )}
        </For>

        <button
          class="category-card card card-clickable custom-prompts-card"
          onClick={props.onCustomPromptsClick}
        >
          <h3 class="text-primary">My Custom Prompts</h3>
          <p class="text-muted">Create & manage your own prompts</p>
        </button>
      </div>
    </>
  );
};

export default HomeView;
