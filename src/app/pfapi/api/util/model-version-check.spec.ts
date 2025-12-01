import { modelVersionCheck, ModelVersionCheckResult } from './model-version-check';

describe('modelVersionCheck()', () => {
  const cases: [number, number, string][] = [
    [2, 2.1, ModelVersionCheckResult.RemoteModelEqualOrMinorUpdateOnly],
    [2.234, 2.234, ModelVersionCheckResult.RemoteModelEqualOrMinorUpdateOnly],
    [3, 2.1, ModelVersionCheckResult.MajorUpdate],
    [4, 2, ModelVersionCheckResult.MajorUpdate],
    [4.1, 3.5, ModelVersionCheckResult.MajorUpdate],
    [4.333, 4.3, ModelVersionCheckResult.MinorUpdate],
    [1.3, 3, ModelVersionCheckResult.RemoteMajorAhead],
  ];
  cases.forEach(([clientVersion, toImport, result]) => {
    it(`should return '${result}' for ${clientVersion} => ${toImport}`, () => {
      expect(modelVersionCheck({ clientVersion, toImport })).toBe(result);
    });
  });
});
