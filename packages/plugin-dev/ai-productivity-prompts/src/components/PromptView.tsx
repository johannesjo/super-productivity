import { Component, createSignal, Show, For, onMount } from 'solid-js';
import { PromptCategory } from '../types';
import { renderPrompt } from '../utils';

interface SelectedPrompt {
  category: PromptCategory;
  prompt: { title: string; template: string };
}

interface PromptViewProps {
  selectedPrompt: SelectedPrompt;
  onUpdatePrompt: (prompt: string) => void;
}

const PromptView: Component<PromptViewProps> = (props) => {
  const TASK_SELECTION_KEY = 'ai-productivity-task-selection';

  // Load saved selection from localStorage or default to 'none'
  const getSavedSelection = () => {
    try {
      return localStorage.getItem(TASK_SELECTION_KEY) || 'none';
    } catch {
      return 'none';
    }
  };

  const [taskSelection, setTaskSelection] = createSignal<string>(getSavedSelection());
  const [taskCounts, setTaskCounts] = createSignal<Record<string, number>>({});
  const [taskPreviews, setTaskPreviews] = createSignal<Record<string, string[]>>({});
  const [projects, setProjects] = createSignal<Array<{ id: string; title: string }>>([]);
  const [isLoadingTasks, setIsLoadingTasks] = createSignal<boolean>(false);
  const [generatedPrompt, setGeneratedPrompt] = createSignal<string>('');

  // Save selection whenever it changes
  const updateTaskSelection = (newSelection: string) => {
    setTaskSelection(newSelection);
    try {
      localStorage.setItem(TASK_SELECTION_KEY, newSelection);
    } catch (error) {
      console.error('Failed to save task selection:', error);
    }
  };

  const loadTaskCounts = async () => {
    setIsLoadingTasks(true);
    const pluginAPI = (window as any).PluginAPI;
    const counts: Record<string, number> = {};
    const previews: Record<string, string[]> = {};

    if (pluginAPI) {
      try {
        // Get all tasks, current context tasks, and projects
        const [allTasks, contextTasks, allProjects] = await Promise.all([
          pluginAPI.getTasks?.(),
          pluginAPI.getCurrentContextTasks?.(),
          pluginAPI.getAllProjects?.(),
        ]);

        if (allTasks) {
          const undoneTasks = allTasks.filter((task: any) => !task.isDone);
          counts.all = undoneTasks.length;
          previews.all = undoneTasks.map((task: any) => task.title);

          // Today's tasks: undone tasks with time spent today or created today
          const today = new Date();
          const todayStr =
            today.getFullYear() +
            '-' +
            String(today.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(today.getDate()).padStart(2, '0');

          const todayTasks = undoneTasks.filter((task: any) => {
            // Check if task has time spent today
            if (task.timeSpentOnDay && task.timeSpentOnDay[todayStr] > 0) {
              return true;
            }

            // Check if task was created today
            const createdToday = new Date(task.created);
            return createdToday.toDateString() === today.toDateString();
          });

          counts.today = todayTasks.length;
          previews.today = todayTasks.map((task: any) => task.title);

          // Group tasks by project
          if (allProjects) {
            const projectList = allProjects.filter((project: any) => !project.isArchived);
            setProjects(
              projectList.map((project: any) => ({
                id: project.id,
                title: project.title,
              })),
            );

            projectList.forEach((project: any) => {
              const projectTasks = undoneTasks.filter(
                (task: any) => task.projectId === project.id,
              );
              counts[`project-${project.id}`] = projectTasks.length;
              previews[`project-${project.id}`] = projectTasks.map(
                (task: any) => task.title,
              );
            });
          }
        }

        if (contextTasks) {
          const undoneContextTasks = contextTasks.filter((task: any) => !task.isDone);
          counts.context = undoneContextTasks.length;
          previews.context = undoneContextTasks.map((task: any) => task.title);
        }
      } catch (error) {
        console.log('Could not fetch task counts:', error);
      }
    }

    setTaskCounts(counts);
    setTaskPreviews(previews);
    setIsLoadingTasks(false);
  };

  const regeneratePrompt = async () => {
    const prompt = props.selectedPrompt?.prompt;
    if (!prompt) return;

    const pluginAPI = (window as any).PluginAPI;
    let tasksMd = '';

    if (taskSelection() !== 'none' && pluginAPI) {
      try {
        let tasksToInclude: any[] = [];
        const selection = taskSelection();

        if (selection === 'today') {
          // Get all tasks and filter for today
          const allTasks = await pluginAPI.getTasks?.();
          if (allTasks) {
            const today = new Date();
            const todayStr =
              today.getFullYear() +
              '-' +
              String(today.getMonth() + 1).padStart(2, '0') +
              '-' +
              String(today.getDate()).padStart(2, '0');

            tasksToInclude = allTasks.filter((task: any) => {
              if (task.isDone) return false;

              // Tasks with time spent today or created today
              return (
                (task.timeSpentOnDay && task.timeSpentOnDay[todayStr] > 0) ||
                new Date(task.created).toDateString() === today.toDateString()
              );
            });
          }
        } else if (selection === 'context') {
          // Get current context tasks
          const contextTasks = await pluginAPI.getCurrentContextTasks?.();
          if (contextTasks) {
            tasksToInclude = contextTasks.filter((task: any) => !task.isDone);
          }
        } else if (selection === 'all') {
          // Get all tasks
          const allTasks = await pluginAPI.getTasks?.();
          if (allTasks) {
            tasksToInclude = allTasks.filter((task: any) => !task.isDone);
          }
        } else if (selection.startsWith('project-')) {
          // Get tasks for specific project
          const projectId = selection.replace('project-', '');
          const allTasks = await pluginAPI.getTasks?.();
          if (allTasks) {
            tasksToInclude = allTasks.filter(
              (task: any) => !task.isDone && task.projectId === projectId,
            );
          }
        }

        if (tasksToInclude.length > 0) {
          tasksMd = tasksToInclude.map((task: any) => `- [ ] ${task.title}`).join('\n');
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
  onMount(async () => {
    await loadTaskCounts();

    // Validate saved selection - check if it's still valid
    const currentSelection = taskSelection();
    if (currentSelection.startsWith('project-')) {
      const projectId = currentSelection.replace('project-', '');
      const projectExists = projects().some((p) => p.id === projectId);
      if (!projectExists) {
        // Project no longer exists, reset to 'none'
        updateTaskSelection('none');
      }
    }

    await regeneratePrompt();
  });

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

  const getSelectionDisplayName = () => {
    const selection = taskSelection();
    if (selection === 'today') return "Today's tasks";
    if (selection === 'context') return 'Context tasks';
    if (selection === 'all') return 'All tasks';
    if (selection.startsWith('project-')) {
      const project = projects().find((p) => `project-${p.id}` === selection);
      return project?.title || 'Project';
    }
    return '';
  };

  return (
    <div class="page-fade">
      <div class="selected-prompt-header">
        <h2 class="text-primary">{props.selectedPrompt.prompt.title}</h2>
      </div>

      <div class="prompt-options">
        <label class="dropdown-label">
          Include tasks in prompt:
          <select
            class="task-dropdown"
            value={taskSelection()}
            onChange={async (e) => {
              const newSelection = e.target.value;
              updateTaskSelection(newSelection);
              await regeneratePrompt();
            }}
          >
            <option value="none">No tasks</option>
            <option value="today">Today's tasks ({taskCounts().today || 0} tasks)</option>
            <option value="context">
              Current project/context ({taskCounts().context || 0} tasks)
            </option>
            <optgroup label="Individual Projects">
              <For each={projects()}>
                {(project) => (
                  <option value={`project-${project.id}`}>
                    {project.title} ({taskCounts()[`project-${project.id}`] || 0} tasks)
                  </option>
                )}
              </For>
            </optgroup>
            <option value="all">All tasks ({taskCounts().all || 0} tasks)</option>
          </select>
        </label>
        <div class="task-preview">
          <Show when={isLoadingTasks()}>
            <div class="task-loading">
              <span class="task-count-info text-muted">Loading tasks...</span>
            </div>
          </Show>
          <Show when={!isLoadingTasks()}>
            <Show when={taskSelection() === 'none'}>
              <span class="task-count-info text-muted">No tasks will be included</span>
            </Show>
            <Show when={taskSelection() !== 'none'}>
              <div class="task-preview-content">
                <Show
                  when={
                    !taskPreviews()[taskSelection()] ||
                    taskPreviews()[taskSelection()].length === 0
                  }
                >
                  <span class="task-count-info text-muted">
                    No tasks available for this selection
                  </span>
                </Show>
                <Show
                  when={
                    taskPreviews()[taskSelection()] &&
                    taskPreviews()[taskSelection()].length > 0
                  }
                >
                  <div class="task-count-header">
                    {getSelectionDisplayName()} ({taskCounts()[taskSelection()] || 0}):
                  </div>
                  <div class="task-preview-list">
                    <For each={taskPreviews()[taskSelection()].slice(0, 3)}>
                      {(taskTitle) => <div class="task-preview-item">• {taskTitle}</div>}
                    </For>
                    <Show when={taskPreviews()[taskSelection()].length > 3}>
                      <div class="task-preview-more">
                        ...and {taskPreviews()[taskSelection()].length - 3} more
                      </div>
                    </Show>
                  </div>
                </Show>
              </div>
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
