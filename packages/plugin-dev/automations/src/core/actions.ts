import { IAutomationAction } from './definitions';

export const ActionCreateTask: IAutomationAction = {
  id: 'createTask',
  name: 'Create Task',
  execute: async (ctx, event, value) => {
    if (!value) return;
    await ctx.plugin.addTask({
      title: value,
      projectId: event.task?.projectId,
    });
    ctx.plugin.log.info(`[Automation] Action: Created task "${value}"`);
  },
};

export const ActionAddTag: IAutomationAction = {
  id: 'addTag',
  name: 'Add Tag',
  execute: async (ctx, event, value) => {
    if (!event.task || !value) {
      ctx.plugin.log.warn(`[Automation] Cannot add tag "${value}" without task context.`);
      return;
    }
    const tags = await ctx.plugin.getAllTags();
    let tagId = tags.find((t) => t.title === value)?.id;

    if (!tagId) {
      ctx.plugin.log.warn(`[Automation] Tag "${value}" not found.`);
      return;
    }
    if (event.task.tagIds.includes(tagId)) return;

    await ctx.plugin.updateTask(event.task.id, {
      tagIds: [...event.task.tagIds, tagId],
    });
    ctx.plugin.log.info(`[Automation] Action: Added tag "${value}"`);
  },
};

export const ActionDisplaySnack: IAutomationAction = {
  id: 'displaySnack',
  name: 'Display Snack',
  execute: async (ctx, event, value) => {
    if (!value) return;
    ctx.plugin.showSnack({ msg: value, type: 'SUCCESS' });
    ctx.plugin.log.info(`[Automation] Action: Displayed snack "${value}"`);
  },
};

export const ActionDisplayDialog: IAutomationAction = {
  id: 'displayDialog',
  name: 'Display Dialog',
  execute: async (ctx, event, value) => {
    if (!value) return;
    await ctx.plugin.openDialog({
      htmlContent: `<p>${value}</p>`,
      buttons: [{ label: 'OK', onClick: () => {} }],
    });
    ctx.plugin.log.info(`[Automation] Action: Displayed dialog "${value}"`);
  },
};

export const ActionWebhook: IAutomationAction = {
  id: 'webhook',
  name: 'Webhook',
  execute: async (ctx, event, value) => {
    if (!value) return;
    try {
      await fetch(value, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      ctx.plugin.log.info(`[Automation] Action: Webhook sent to "${value}"`);
    } catch (e) {
      ctx.plugin.log.error(`[Automation] Webhook failed: ${e}`);
    }
  },
};
