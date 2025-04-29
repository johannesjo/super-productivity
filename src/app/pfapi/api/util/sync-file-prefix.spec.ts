import {
  extractSyncFileStateFromPrefix,
  getSyncFilePrefix,
  SyncFilePrefixParams,
  SyncFilePrefixParamsOutput,
} from './sync-file-prefix';
import { InvalidFilePrefixError } from '../errors/errors';

describe('pfGetSyncFilePrefix()', () => {
  const cases: [SyncFilePrefixParams, string][] = [
    [{ isCompress: false, isEncrypt: false, modelVersion: 1 }, 'pf_1__'],
    [{ isCompress: true, isEncrypt: false, modelVersion: 1 }, 'pf_C1__'],
    [{ isCompress: false, isEncrypt: true, modelVersion: 1 }, 'pf_E1__'],
    [{ isCompress: true, isEncrypt: true, modelVersion: 1 }, 'pf_CE1__'],
    [{ isCompress: true, isEncrypt: true, modelVersion: 33 }, 'pf_CE33__'],
    [
      { isCompress: true, isEncrypt: true, modelVersion: 33.1232343 },
      'pf_CE33.1232343__',
    ],
  ];
  cases.forEach(([input, expected]) => {
    it(`should return '${expected}' for ${JSON.stringify(input)}`, () => {
      expect(getSyncFilePrefix(input)).toBe(expected);
    });
  });
});

describe('pfExtractSyncFileStateFromPrefix()', () => {
  const B_ALL = {
    isCompressed: true,
    isEncrypted: true,
    modelVersion: 2,
  };
  const cases: [string, SyncFilePrefixParamsOutput][] = [
    [
      'pf_1__testdata',
      {
        isCompressed: false,
        isEncrypted: false,
        modelVersion: 1,
        cleanDataStr: 'testdata',
      },
    ],
    [
      'pf_1.12345__testdata',
      {
        isCompressed: false,
        isEncrypted: false,
        modelVersion: 1.12345,
        cleanDataStr: 'testdata',
      },
    ],
    [
      'pf_C1__testdata',
      {
        isCompressed: true,
        isEncrypted: false,
        modelVersion: 1,
        cleanDataStr: 'testdata',
      },
    ],
    [
      'pf_E1__testdata',
      {
        isCompressed: false,
        isEncrypted: true,
        modelVersion: 1,
        cleanDataStr: 'testdata',
      },
    ],
    [
      'pf_CE33.123__testdata',
      {
        ...B_ALL,
        modelVersion: 33.123,
        cleanDataStr: 'testdata',
      },
    ],
    [
      'pf_CE2____testdata',
      {
        ...B_ALL,
        cleanDataStr: '__testdata',
      },
    ],
    [
      'pf_CE2__C__testdata',
      {
        ...B_ALL,
        cleanDataStr: 'C__testdata',
      },
    ],
    [
      'pf_CE2__{}',
      {
        ...B_ALL,
        cleanDataStr: '{}',
      },
    ],
    [
      'pf_CE2__pf_CE2__pf_CE2__',
      {
        ...B_ALL,
        cleanDataStr: 'pf_CE2__pf_CE2__',
      },
    ],
  ];

  cases.forEach(([input, expected]) => {
    it(`should extract correct params from '${input}'`, () => {
      expect(extractSyncFileStateFromPrefix(input)).toEqual(expected);
    });
  });

  it('should throw error for invalid prefix', () => {
    expect(() => extractSyncFileStateFromPrefix('invalid_prefix')).toThrowError(
      InvalidFilePrefixError,
    );
  });
});
