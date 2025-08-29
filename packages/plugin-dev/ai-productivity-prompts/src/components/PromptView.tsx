import { Component, createSignal, Show, For } from 'solid-js';
import { PromptCategory, renderPrompt } from '../types';

interface SelectedPrompt {
  category: PromptCategory;
  prompt: { title: string; template: string };
}

interface PromptViewProps {
  selectedPrompt: SelectedPrompt;
  onUpdatePrompt: (prompt: string) => void;
}

const PromptView: Component<PromptViewProps> = (props) => {
  const [taskSelection, setTaskSelection] = createSignal<'none' | 'today' | 'all'>(
    'none',
  );
  const [taskCounts, setTaskCounts] = createSignal<{ today: number; all: number }>({
    today: 0,
    all: 0,
  });
  const [taskPreviews, setTaskPreviews] = createSignal<{
    today: string[];
    all: string[];
  }>({ today: [], all: [] });
  const [isLoadingTasks, setIsLoadingTasks] = createSignal<boolean>(false);
  const [generatedPrompt, setGeneratedPrompt] = createSignal<string>('');

  const loadTaskCounts = async () => {
    setIsLoadingTasks(true);
    const pluginAPI = (window as any).PluginAPI;
    let todayCount = 0;
    let allCount = 0;

    if (pluginAPI) {
      try {
        const currentTasks = await pluginAPI.getCurrentContextTasks?.();
        if (currentTasks) {
          allCount = currentTasks.length;

          const today = new Date();
          const startOfDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
          ).getTime();
          const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

          const todayTasks = currentTasks.filter((task: any) => {
            return (
              !task.isDone &&
              (task.created >= startOfDay ||
                (task.timeSpentOnDay &&
                  Object.keys(task.timeSpentOnDay).some((date) => {
                    const dateTime = new Date(date).getTime();
                    return dateTime >= startOfDay && dateTime < endOfDay;
                  })))
            );
          });

          todayCount = todayTasks.length;

          setTaskPreviews({
            today: todayTasks.map((task: any) => task.title),
            all: currentTasks.map((task: any) => task.title),
          });
        }
      } catch (error) {
        console.log('Could not fetch task counts:', error);
      }
    }

    setTaskCounts({ today: todayCount, all: allCount });
    setIsLoadingTasks(false);
  };

  const regeneratePrompt = async () => {
    const prompt = props.selectedPrompt?.prompt;
    if (!prompt) return;

    const pluginAPI = (window as any).PluginAPI;
    let tasksMd = '';

    if (taskSelection() !== 'none' && pluginAPI) {
      try {
        const currentTasks = await pluginAPI.getCurrentContextTasks?.();
        if (currentTasks && currentTasks.length > 0) {
          let tasksToInclude = currentTasks;

          if (taskSelection() === 'today') {
            const today = new Date();
            const startOfDay = new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate(),
            ).getTime();

            tasksToInclude = currentTasks.filter((task: any) => {
              return (
                !task.isDone &&
                (task.created >= startOfDay ||
                  (task.timeSpentOnDay &&
                    Object.keys(task.timeSpentOnDay).some((date) => {
                      const dateTime = new Date(date).getTime();
                      return (
                        dateTime >= startOfDay &&
                        dateTime < startOfDay + 24 * 60 * 60 * 1000
                      );
                    })))
              );
            });
          }

          if (tasksToInclude.length > 0) {
            tasksMd = tasksToInclude.map((task: any) => `- [ ] ${task.title}`).join('\n');
          }
        }
      } catch (error) {
        console.log('Could not fetch tasks:', error);
      }
    }

    const rendered = renderPrompt(prompt.template, tasksMd);
    setGeneratedPrompt(rendered);
    props.onUpdatePrompt(rendered);
  };

  // Initialize on mount
  loadTaskCounts();
  regeneratePrompt();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt());
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
    <div class="page-fade">
      <div class="selected-prompt-header">
        <h2 class="text-primary">{props.selectedPrompt.prompt.title}</h2>
        <p class="text-muted">From: {props.selectedPrompt.category.title}</p>
      </div>

      <div class="prompt-options">
        <label class="dropdown-label">
          Include tasks in prompt:
          <select
            class="task-dropdown"
            value={taskSelection()}
            onChange={async (e) => {
              setTaskSelection(e.target.value as 'none' | 'today' | 'all');
              await loadTaskCounts();
              await regeneratePrompt();
            }}
          >
            <option value="none">No tasks</option>
            <option value="today">Today's tasks only ({taskCounts().today} tasks)</option>
            <option value="all">All current tasks ({taskCounts().all} tasks)</option>
          </select>
        </label>
        <div class="task-preview">
          <Show when={isLoadingTasks()}>
            <div class="task-loading">
              <span class="task-count-info text-muted">Loading tasks...</span>
            </div>
          </Show>
          <Show when={!isLoadingTasks()}>
            <Show when={taskSelection() === 'today'}>
              <div class="task-preview-content">
                <Show when={taskPreviews().today.length === 0}>
                  <span class="task-count-info text-muted">No tasks for today</span>
                </Show>
                <Show when={taskPreviews().today.length > 0}>
                  <div class="task-count-header">
                    Today's tasks ({taskCounts().today}):
                  </div>
                  <div class="task-preview-list">
                    <For each={taskPreviews().today.slice(0, 3)}>
                      {(taskTitle) => <div class="task-preview-item">• {taskTitle}</div>}
                    </For>
                    <Show when={taskPreviews().today.length > 3}>
                      <div class="task-preview-more">
                        ...and {taskPreviews().today.length - 3} more
                      </div>
                    </Show>
                  </div>
                </Show>
              </div>
            </Show>
            <Show when={taskSelection() === 'all'}>
              <div class="task-preview-content">
                <Show when={taskPreviews().all.length === 0}>
                  <span class="task-count-info text-muted">No tasks available</span>
                </Show>
                <Show when={taskPreviews().all.length > 0}>
                  <div class="task-count-header">All tasks ({taskCounts().all}):</div>
                  <div class="task-preview-list">
                    <For each={taskPreviews().all.slice(0, 3)}>
                      {(taskTitle) => <div class="task-preview-item">• {taskTitle}</div>}
                    </For>
                    <Show when={taskPreviews().all.length > 3}>
                      <div class="task-preview-more">
                        ...and {taskPreviews().all.length - 3} more
                      </div>
                    </Show>
                  </div>
                </Show>
              </div>
            </Show>
            <Show when={taskSelection() === 'none'}>
              <span class="task-count-info text-muted">No tasks will be included</span>
            </Show>
          </Show>
        </div>
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
  );
};

export default PromptView;
