import { BaseIssueProviderCfg, IssueProviderPollingMode } from '../../issue.model';

/**
 * What to do on Plainspace when a linked task is deleted locally in Super
 * Productivity. Default `unassign` returns the item to the claim pool so
 * collaborators can pick it up; `delete` soft-deletes remotely; `localOnly`
 * leaves the remote item unchanged.
 */
export type PlainspaceOnLocalDelete = 'unassign' | 'delete' | 'localOnly';

/**
 * Per-instance config for the Plainspace (plainspace.org / `Johannesjo/spaces`)
 * issue provider. One instance is bound to one SP project (via the provider's
 * `defaultProjectId`) and one remote Plainspace space (`spaceId`).
 *
 * `token` is a Plainspace personal API token (PAT, `pat_…`) created in the
 * Plainspace web UI (Space settings → API tokens). It authorizes every call to
 * `{host}/api/integration/*`. Stored per provider like other issue providers'
 * secrets; a single PAT is valid across all of the user's spaces.
 */
export interface PlainspaceCfg extends BaseIssueProviderCfg {
  host: string | null;
  spaceId: string | null;
  token?: string | null;
  isAutoPoll?: boolean;
  isAutoAddToBacklog?: boolean;
  pollingMode?: IssueProviderPollingMode;
  /**
   * Remote action when a linked task is deleted in SP. Default: unassign.
   */
  onLocalDelete?: PlainspaceOnLocalDelete;
}
