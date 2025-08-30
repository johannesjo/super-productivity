import { createSignal } from 'solid-js';

export const usePluginApi = () => {
  const pluginAPI = (window as any).PluginAPI;

  return {
    getTasks: () => pluginAPI?.getTasks?.(),
    getCurrentContextTasks: () => pluginAPI?.getCurrentContextTasks?.(),
    getAllProjects: () => pluginAPI?.getAllProjects?.(),
  };
};

export const useTaskData = () => {
  const [isLoading, setIsLoading] = createSignal(false);
  const api = usePluginApi();

  const loadTaskCounts = async () => {
    setIsLoading(true);
    const counts: Record<string, number> = {};
    const previews: Record<string, string[]> = {};
    const projects: Array<{ id: string; title: string }> = [];

    try {
      const [allTasks, contextTasks, allProjects] = await Promise.all([
        api.getTasks(),
        api.getCurrentContextTasks(),
        api.getAllProjects(),
      ]);

      if (allTasks) {
        const undoneTasks = allTasks.filter((task: any) => !task.isDone);
        counts.all = undoneTasks.length;
        previews.all = undoneTasks.map((task: any) => task.title);

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const todayTasks = undoneTasks.filter((task: any) => {
          return (
            task.timeSpentOnDay?.[todayStr] > 0 ||
            new Date(task.created).toDateString() === today.toDateString()
          );
        });

        counts.today = todayTasks.length;
        previews.today = todayTasks.map((task: any) => task.title);

        if (allProjects) {
          const activeProjects = allProjects.filter(
            (project: any) => !project.isArchived,
          );
          projects.push(
            ...activeProjects.map((project: any) => ({
              id: project.id,
              title: project.title,
            })),
          );

          activeProjects.forEach((project: any) => {
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
      console.error('Error loading task data:', error);
    } finally {
      setIsLoading(false);
    }

    return { counts, previews, projects };
  };

  const getTasksForSelection = async (selection: string) => {
    const api = usePluginApi();
    let tasksToInclude: any[] = [];

    try {
      if (selection === 'today') {
        const allTasks = await api.getTasks();
        if (allTasks) {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

          tasksToInclude = allTasks.filter((task: any) => {
            if (task.isDone) return false;
            return (
              task.timeSpentOnDay?.[todayStr] > 0 ||
              new Date(task.created).toDateString() === today.toDateString()
            );
          });
        }
      } else if (selection === 'context') {
        const contextTasks = await api.getCurrentContextTasks();
        if (contextTasks) {
          tasksToInclude = contextTasks.filter((task: any) => !task.isDone);
        }
      } else if (selection === 'all') {
        const allTasks = await api.getTasks();
        if (allTasks) {
          tasksToInclude = allTasks.filter((task: any) => !task.isDone);
        }
      } else if (selection.startsWith('project-')) {
        const projectId = selection.replace('project-', '');
        const allTasks = await api.getTasks();
        if (allTasks) {
          tasksToInclude = allTasks.filter(
            (task: any) => !task.isDone && task.projectId === projectId,
          );
        }
      }
    } catch (error) {
      console.error('Error fetching tasks for selection:', error);
    }

    return tasksToInclude;
  };

  return {
    isLoading,
    loadTaskCounts,
    getTasksForSelection,
  };
};
