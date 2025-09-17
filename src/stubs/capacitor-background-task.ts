// Minimal stub for desktop/Electron builds to avoid bundling errors.
export const BackgroundTask = {
  beforeExit: async (cb: () => Promise<void> | void): Promise<string> => {
    // No-op on desktop; return a dummy id
    await Promise.resolve();
    return 'noop';
  },
  finish: ({ taskId }: { taskId: string }): void => {
    // No-op on desktop
  },
};

export default BackgroundTask;
