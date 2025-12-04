import { Operation } from '../operation.types';
import {
  SyncProviderServiceInterface,
  OperationSyncCapable,
  SyncOperation,
} from '../../../pfapi/api/sync/sync-provider.interface';
import { SyncProviderId } from '../../../../pfapi/api/pfapi.const';

/**
 * Type guard to check if a provider supports operation-based sync (API sync).
 */
export const isOperationSyncCapable = (
  provider: SyncProviderServiceInterface<SyncProviderId>,
): provider is SyncProviderServiceInterface<SyncProviderId> & OperationSyncCapable => {
  return (
    'supportsOperationSync' in provider &&
    (provider as unknown as OperationSyncCapable).supportsOperationSync === true
  );
};

/**
 * Convert a SyncOperation (from API response) to an Operation (local format).
 */
export const syncOpToOperation = (syncOp: SyncOperation): Operation => {
  return {
    id: syncOp.id,
    clientId: syncOp.clientId,
    actionType: syncOp.actionType,
    opType: syncOp.opType as Operation['opType'],
    entityType: syncOp.entityType as Operation['entityType'],
    entityId: syncOp.entityId,
    entityIds: syncOp.entityIds,
    payload: syncOp.payload,
    vectorClock: syncOp.vectorClock,
    timestamp: syncOp.timestamp,
    schemaVersion: syncOp.schemaVersion,
  };
};
