import { validateRevMap } from './validate-rev-map';
import { InvalidRevMapError } from '../errors/errors';

describe('validateRevMap', () => {
  it('should return valid revMap unchanged', () => {
    const validRevMap = {
      model1: 'rev1',
      model2: 'rev2',
    };
    expect(validateRevMap(validRevMap)).toEqual(validRevMap);
  });

  it('should throw InvalidRevMapError when revMap is not an object', () => {
    expect(() => validateRevMap('not an object' as any)).toThrowError(InvalidRevMapError);
    expect(() => validateRevMap(123 as any)).toThrowError(InvalidRevMapError);
    expect(() => validateRevMap(null as any)).toThrowError();
  });

  it('should throw InvalidRevMapError when revMap value is not a string', () => {
    const invalidRevMap = {
      model1: 123 as any,
    };
    expect(() => validateRevMap(invalidRevMap)).toThrowError(InvalidRevMapError);
  });

  it('should throw InvalidRevMapError when revMap value is empty string', () => {
    const invalidRevMap = {
      model1: '',
    };
    expect(() => validateRevMap(invalidRevMap)).toThrowError(InvalidRevMapError);
  });

  it('should throw InvalidRevMapError with descriptive message when revMap contains quote character', () => {
    const invalidRevMap = {
      model1: 'contains"quote',
    };
    try {
      validateRevMap(invalidRevMap);
      fail('Should have thrown an error');
    } catch (e: any) {
      expect(e).toBeInstanceOf(InvalidRevMapError);
      expect(e.additionalLog[1]).toBe(
        'RevMap entry for modelId "model1" contains invalid quote character',
      );
    }
  });

  it('should validate multiple entries and throw on first invalid quote', () => {
    const invalidRevMap = {
      model1: 'valid',
      model2: 'has"quote',
      model3: 'also"invalid',
    };
    try {
      validateRevMap(invalidRevMap);
      fail('Should have thrown an error');
    } catch (e: any) {
      expect(e).toBeInstanceOf(InvalidRevMapError);
      expect(e.additionalLog[1]).toBe(
        'RevMap entry for modelId "model2" contains invalid quote character',
      );
    }
  });
});
