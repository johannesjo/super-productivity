import { FieldMapping, FieldSyncConfig } from './issue-sync.model';

export interface IssueSyncAdapter<TCfg> {
  getFieldMappings(): FieldMapping[];
  getSyncConfig(cfg: TCfg): FieldSyncConfig;
  fetchIssue(issueId: string, cfg: TCfg): Promise<Record<string, unknown>>;
  pushChanges(
    issueId: string,
    changes: Record<string, unknown>,
    cfg: TCfg,
  ): Promise<void>;
  extractSyncValues(issue: Record<string, unknown>): Record<string, unknown>;
  /** Extract the provider-specific last-updated marker (e.g. timestamp or etag hash) */
  getIssueLastUpdated?(issue: Record<string, unknown>): number;
  /**
   * `ctx.taskId` is the SP task the issue is created for; a provider can derive
   * a deterministic remote id from it so a repeated create can't duplicate.
   */
  createIssue?(
    title: string,
    cfg: TCfg,
    ctx?: { taskId: string },
  ): Promise<{
    issueId: string;
    issueNumber?: number;
    issueData: Record<string, unknown>;
  }>;
  deleteIssue?(issueId: string, cfg: TCfg): Promise<void>;
}
