import { Component, For } from 'solid-js';
import { PromptCategory } from '../types';

interface CategoryViewProps {
  category: PromptCategory;
  onSelectPrompt: (prompt: { title: string; template: string }) => void;
}

const CategoryView: Component<CategoryViewProps> = (props) => {
  return (
    <div class="category-container page-fade">
      <div class="selected-category">
        <h2 class="text-primary">{props.category.title}</h2>
      </div>

      <h3>Available Prompts:</h3>

      <div class="prompt-list">
        <For each={props.category.prompts}>
          {(prompt) => (
            <button
              class="prompt-item card card-clickable"
              onClick={() => props.onSelectPrompt(prompt)}
            >
              <h4 class="prompt-title">{prompt.title}</h4>
            </button>
          )}
        </For>
      </div>
    </div>
  );
};

export default CategoryView;
