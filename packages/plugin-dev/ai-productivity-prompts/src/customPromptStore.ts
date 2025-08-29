import { CustomPrompt, CustomPromptsData } from './types';

const STORAGE_KEY = 'ai-productivity-custom-prompts';
const VERSION = 1;

export class CustomPromptStore {
  private static instance: CustomPromptStore;
  private pluginAPI: any;

  private constructor() {
    this.pluginAPI = (window as any).PluginAPI;
  }

  static getInstance(): CustomPromptStore {
    if (!CustomPromptStore.instance) {
      CustomPromptStore.instance = new CustomPromptStore();
    }
    return CustomPromptStore.instance;
  }

  async loadPrompts(): Promise<CustomPrompt[]> {
    try {
      if (!this.pluginAPI?.loadSyncedData) {
        console.warn('loadSyncedData not available, using localStorage fallback');
        return this.loadFromLocalStorage();
      }

      const dataStr = await this.pluginAPI.loadSyncedData();
      if (!dataStr) return [];

      const data: CustomPromptsData = JSON.parse(dataStr);
      const prompts = data.prompts || [];

      // Filter out any invalid prompts
      return prompts.filter(
        (prompt) =>
          prompt &&
          typeof prompt === 'object' &&
          typeof prompt.title === 'string' &&
          typeof prompt.template === 'string',
      );
    } catch (error) {
      console.error('Error loading custom prompts:', error);
      return this.loadFromLocalStorage();
    }
  }

  async savePrompts(prompts: CustomPrompt[]): Promise<void> {
    const data: CustomPromptsData = {
      prompts,
      version: VERSION,
    };

    try {
      if (!this.pluginAPI?.persistDataSynced) {
        console.warn('persistDataSynced not available, using localStorage fallback');
        this.saveToLocalStorage(prompts);
        return;
      }

      await this.pluginAPI.persistDataSynced(JSON.stringify(data));
    } catch (error) {
      console.error('Error saving custom prompts:', error);
      this.saveToLocalStorage(prompts);
    }
  }

  async addPrompt(title: string, template: string): Promise<void> {
    const prompts = await this.loadPrompts();
    prompts.push({ title, template });
    await this.savePrompts(prompts);
  }

  async updatePrompt(index: number, title: string, template: string): Promise<void> {
    const prompts = await this.loadPrompts();

    if (index < 0 || index >= prompts.length) {
      throw new Error('Prompt index out of range');
    }

    prompts[index] = { title, template };
    await this.savePrompts(prompts);
  }

  async deletePrompt(index: number): Promise<void> {
    const prompts = await this.loadPrompts();

    if (index < 0 || index >= prompts.length) {
      throw new Error('Prompt index out of range');
    }

    prompts.splice(index, 1);
    await this.savePrompts(prompts);
  }

  private loadFromLocalStorage(): CustomPrompt[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const data: CustomPromptsData = JSON.parse(stored);
      const prompts = data.prompts || [];

      // Filter out any invalid prompts
      return prompts.filter(
        (prompt) =>
          prompt &&
          typeof prompt === 'object' &&
          typeof prompt.title === 'string' &&
          typeof prompt.template === 'string',
      );
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return [];
    }
  }

  private saveToLocalStorage(prompts: CustomPrompt[]): void {
    try {
      const data: CustomPromptsData = {
        prompts,
        version: VERSION,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
}
