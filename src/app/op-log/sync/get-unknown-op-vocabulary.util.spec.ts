import { SUPER_SYNC_IMPORT_REASONS, SUPER_SYNC_OP_TYPES } from '@sp/shared-schema';
import { OpType } from '../core/operation.types';
import {
  getUnknownOpVocabulary,
  takeInterpretableOpPrefix,
} from './get-unknown-op-vocabulary.util';

describe('getUnknownOpVocabulary', () => {
  it('accepts every op type and import reason of the wire vocabulary', () => {
    for (const opType of SUPER_SYNC_OP_TYPES) {
      expect(getUnknownOpVocabulary({ opType: opType as OpType })).toBeNull();
    }
    for (const reason of SUPER_SYNC_IMPORT_REASONS) {
      expect(
        getUnknownOpVocabulary({
          opType: OpType.SyncImport,
          syncImportReason: reason,
        }),
      ).toBeNull();
    }
  });

  it('names an opType this client does not know', () => {
    expect(getUnknownOpVocabulary({ opType: 'FUTURE_OP' as unknown as OpType })).toBe(
      'opType',
    );
  });

  it('names a syncImportReason this client does not know', () => {
    expect(
      getUnknownOpVocabulary({
        opType: OpType.SyncImport,
        syncImportReason: 'FUTURE_REASON' as never,
      }),
    ).toBe('syncImportReason');
  });

  it('cuts a batch at the first op with unknown vocabulary', () => {
    const ops = [
      { id: 'a', opType: OpType.Update },
      { id: 'b', opType: 'FUTURE_OP' as unknown as OpType },
      { id: 'c', opType: OpType.SyncImport },
    ];

    expect(takeInterpretableOpPrefix(ops).map((op) => op.id)).toEqual(['a']);
    expect(takeInterpretableOpPrefix(ops.slice(0, 1)).map((op) => op.id)).toEqual(['a']);
    expect(takeInterpretableOpPrefix([])).toEqual([]);
  });

  it('does not treat an absent value as unknown', () => {
    expect(getUnknownOpVocabulary({ opType: undefined as unknown as OpType })).toBeNull();
    expect(
      getUnknownOpVocabulary({ opType: OpType.Update, syncImportReason: undefined }),
    ).toBeNull();
  });
});
