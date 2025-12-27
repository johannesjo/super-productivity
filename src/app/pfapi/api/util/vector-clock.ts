/**
 * Re-export vector clock utilities from shared location.
 *
 * The vector clock implementation is shared between PFAPI and Operation Log systems.
 * This file re-exports everything for backwards compatibility with existing PFAPI imports.
 */
export * from '../../../core/util/vector-clock';
