export interface PromptCategory {
  title: string;
  prompts: {
    title: string;
    template: string;
  }[];
}

export interface CustomPrompt {
  title: string;
  template: string;
}

export interface CustomPromptsData {
  prompts: CustomPrompt[];
  version: number;
}
