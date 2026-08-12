export const countState = (state) => {
    const tasks = Object.values(state.tasks);
    return {
        tasks: tasks.length,
        doneTasks: tasks.filter((task) => task.status === 'done').length,
        projects: Object.keys(state.projects).length,
        tags: Object.keys(state.tags).length,
        notes: Object.keys(state.notes).length,
        smartLists: Object.keys(state.smartLists).length,
    };
};
export const importSummary = (counts) => `Imported ${counts.tasks} tasks (${counts.doneTasks} done), ${counts.projects} projects, ` +
    `${counts.tags} tags, ${counts.notes} notes, ${counts.smartLists} smart lists.`;
