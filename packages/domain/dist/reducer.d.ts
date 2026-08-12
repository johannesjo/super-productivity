import type { DomainCommand } from './commands';
import { createInitialState, INBOX_PROJECT_ID, type DomainState } from './entities';
export declare const reduceDomain: (input: DomainState, command: DomainCommand) => DomainState;
export { createInitialState, INBOX_PROJECT_ID };
