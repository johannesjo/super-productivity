import type { DomainState } from '@noura/domain';
export interface ImportCounts {
    tasks: number;
    doneTasks: number;
    projects: number;
    tags: number;
    notes: number;
    smartLists: number;
}
export declare const countState: (state: DomainState) => ImportCounts;
export declare const importSummary: (counts: ImportCounts) => string;
