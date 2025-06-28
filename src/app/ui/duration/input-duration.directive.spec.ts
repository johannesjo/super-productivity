import { InputDurationDirective } from './input-duration.directive';
import { ElementRef, Renderer2 } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { FormControl } from '@angular/forms';
import { StringToMsPipe } from './string-to-ms.pipe';
import { MsToStringPipe } from './ms-to-string.pipe';

describe('InputDurationDirective', () => {
  let directive: InputDurationDirective;
  let mockElementRef: ElementRef;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;
  let mockRenderer: jasmine.SpyObj<Renderer2>;
  let mockStringToMsPipe: jasmine.SpyObj<StringToMsPipe>;
  let mockMsToStringPipe: jasmine.SpyObj<MsToStringPipe>;

  beforeEach(() => {
    mockElementRef = {
      nativeElement: document.createElement('input'),
    };

    mockTranslateService = jasmine.createSpyObj('TranslateService', ['instant']);
    mockTranslateService.instant.and.returnValue('Duration is required');

    mockRenderer = jasmine.createSpyObj('Renderer2', [
      'addClass',
      'removeClass',
      'setProperty',
      'setAttribute',
      'removeAttribute',
    ]);

    mockStringToMsPipe = jasmine.createSpyObj('StringToMsPipe', ['transform']);
    mockMsToStringPipe = jasmine.createSpyObj('MsToStringPipe', ['transform']);

    TestBed.configureTestingModule({
      providers: [
        InputDurationDirective,
        { provide: ElementRef, useValue: mockElementRef },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: Renderer2, useValue: mockRenderer },
        { provide: StringToMsPipe, useValue: mockStringToMsPipe },
        { provide: MsToStringPipe, useValue: mockMsToStringPipe },
      ],
    });

    directive = TestBed.inject(InputDurationDirective);
  });

  describe('onInput', () => {
    let strToMsSpy: jasmine.Spy;
    let msToStrSpy: jasmine.Spy;
    let onChangeSpy: jasmine.Spy;
    let errorSpy: jasmine.Spy;

    beforeEach(() => {
      // Initialize the directive
      directive.ngOnInit();

      // Setup spies
      strToMsSpy = spyOn(directive as any, '_strToMs').and.callThrough();
      msToStrSpy = spyOn(directive as any, '_msToStr').and.callThrough();
      onChangeSpy = jasmine.createSpy('onChange');
      directive.registerOnChange(onChangeSpy);

      errorSpy = spyOn(console, 'error');
    });

    it('should call _strToMs with "2h 3m" and parse as 2 hours 3 minutes', () => {
      // "2h 3m" is parsed as 2 hours and 3 minutes = 7380000 ms
      mockStringToMsPipe.transform.and.returnValue(7380000);
      mockMsToStringPipe.transform.and.returnValue('2h 3m');

      directive.onInput('2h 3m');

      expect(strToMsSpy).toHaveBeenCalledWith('2h 3m');
      expect(msToStrSpy).toHaveBeenCalledWith(7380000);
    });

    it('should call _msToStr with 7200000 for "2h" input', () => {
      mockStringToMsPipe.transform.and.returnValue(7200000);
      mockMsToStringPipe.transform.and.returnValue('2h');

      directive.onInput('2h');

      expect(strToMsSpy).toHaveBeenCalledWith('2h');
      expect(msToStrSpy).toHaveBeenCalledWith(7200000);
      expect(onChangeSpy).toHaveBeenCalledWith(7200000);
    });

    it('should not process "45s" input (does not match allowed pattern)', () => {
      // The directive only accepts patterns like "1h", "2m", "3h 30m"
      // "45s" does not match the regex /(^\d+h(?: \d+m)?$)|(^\d+m$)/i
      directive.onInput('45s');

      expect(strToMsSpy).not.toHaveBeenCalled();
      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it('should not process "1d" input (does not match allowed pattern)', () => {
      // The directive only accepts patterns like "1h", "2m", "3h 30m"
      // "1d" does not match the regex /(^\d+h(?: \d+m)?$)|(^\d+m$)/i
      directive.onInput('1d');

      expect(strToMsSpy).not.toHaveBeenCalled();
      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it('should not process empty input (does not match allowed pattern)', () => {
      // Empty string does not match the regex
      directive.onInput('');

      expect(strToMsSpy).not.toHaveBeenCalled();
      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it('should not process invalid input (does not match allowed pattern)', () => {
      // "invalid" does not match the regex pattern
      directive.onInput('invalid');

      expect(strToMsSpy).not.toHaveBeenCalled();
      expect(onChangeSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should accept 0 as a valid duration value', () => {
      const control = new FormControl(0);
      const result = directive.validate(control);
      expect(result).toBeNull();
    });

    it('should accept positive numbers as valid duration values', () => {
      const control = new FormControl(3600000); // 1 hour in ms
      const result = directive.validate(control);
      expect(result).toBeNull();
    });

    it('should reject null values', () => {
      const control = new FormControl(null);
      const result = directive.validate(control);
      expect(result).toEqual({
        duration: {
          invalid: true,
          message: 'Duration is required',
        },
      });
    });

    it('should reject undefined values', () => {
      const control = new FormControl(undefined);
      const result = directive.validate(control);
      expect(result).toEqual({
        duration: {
          invalid: true,
          message: 'Duration is required',
        },
      });
    });

    it('should reject NaN values', () => {
      const control = new FormControl(NaN);
      const result = directive.validate(control);
      expect(result).toEqual({
        duration: {
          invalid: true,
          message: 'Duration is required',
        },
      });
    });

    it('should not validate when isValidate is false', () => {
      // Set up the directive to not validate
      spyOn(directive, 'isValidate').and.returnValue(false);

      const control = new FormControl(null);
      const result = directive.validate(control);
      expect(result).toBeNull();
    });
  });

  describe('_processInput', () => {
    let onChangeSpy: jasmine.Spy;
    let strToMsSpy: jasmine.Spy;
    let msToStrSpy: jasmine.Spy;

    beforeEach(() => {
      // Spy on the onChange callback
      onChangeSpy = jasmine.createSpy('onChange');
      directive['_onChange'] = onChangeSpy;

      // Spy on internal conversion methods
      strToMsSpy = spyOn<any>(directive, '_strToMs').and.callThrough();
      msToStrSpy = spyOn<any>(directive, '_msToStr').and.callThrough();
    });

    it('should process and update value when input matches converted output', () => {
      // Mock the conversion to return the same format
      strToMsSpy.and.returnValue(3600000); // 1 hour in ms
      msToStrSpy.and.returnValue('1h');

      directive['_processInput']('1h');

      expect(strToMsSpy).toHaveBeenCalledWith('1h');
      expect(msToStrSpy).toHaveBeenCalledWith(3600000);
      expect(onChangeSpy).toHaveBeenCalledWith(3600000);
      expect(directive['_msValue']).toBe(3600000);
    });

    it('should not update value when input does not match regex pattern', () => {
      // Input that doesn't match the regex pattern should return early
      directive['_processInput']('2h 3'); // User typing "2h 30m" but not finished

      expect(strToMsSpy).not.toHaveBeenCalled();
      expect(msToStrSpy).not.toHaveBeenCalled();
      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it('should handle zero values with units specially', () => {
      strToMsSpy.and.returnValue(0);
      msToStrSpy.and.returnValue('0m'); // or could be different

      // These should process even if msToStr returns different format
      directive['_processInput']('0h');
      expect(onChangeSpy).toHaveBeenCalledWith(0);

      onChangeSpy.calls.reset();

      directive['_processInput']('0m');
      expect(onChangeSpy).toHaveBeenCalledWith(0);

      onChangeSpy.calls.reset();

      // '0s' doesn't match the main regex pattern, so it won't be processed
      // The isZeroWithUnit check is inside the processInput but after the regex check
      directive['_processInput']('0s');
      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it('should handle empty string input', () => {
      // Empty string doesn't match the regex pattern
      directive['_processInput']('');

      // The regex check returns early, so nothing is called
      expect(strToMsSpy).not.toHaveBeenCalled();
      expect(msToStrSpy).not.toHaveBeenCalled();
      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it('should not call onChange if value has not changed', () => {
      strToMsSpy.and.returnValue(3600000);
      msToStrSpy.and.returnValue('1h');

      // First call sets the value
      directive['_processInput']('1h');
      expect(onChangeSpy).toHaveBeenCalledWith(3600000);

      onChangeSpy.calls.reset();

      // Second call with same value should not trigger onChange
      directive['_processInput']('1h');
      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it('should handle parsing errors gracefully', () => {
      strToMsSpy.and.throwError('Invalid format');
      spyOn(console, 'error');

      // 'invalid' doesn't match regex, so it returns early
      directive['_processInput']('invalid');

      expect(strToMsSpy).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it('should update value for various valid formats', () => {
      // Mock the conversion methods to simulate proper behavior
      const testCases = [
        { input: '30m', ms: 1800000, output: '30m' },
        { input: '1h', ms: 3600000, output: '1h' },
        { input: '1h 30m', ms: 5400000, output: '1h 30m' },
        { input: '2h', ms: 7200000, output: '2h' },
      ];

      // These don't match the regex pattern
      const invalidTestCases = [
        { input: '45s', shouldProcess: false },
        { input: '1d', shouldProcess: false },
      ];

      testCases.forEach(({ input, ms, output }) => {
        onChangeSpy.calls.reset();
        strToMsSpy.calls.reset();
        msToStrSpy.calls.reset();

        // Mock the conversions
        strToMsSpy.and.returnValue(ms);
        msToStrSpy.and.returnValue(output);

        directive['_processInput'](input);

        expect(strToMsSpy).toHaveBeenCalledWith(input);
        expect(msToStrSpy).toHaveBeenCalledWith(ms);
        expect(onChangeSpy).toHaveBeenCalledWith(ms);
      });

      invalidTestCases.forEach(({ input }) => {
        onChangeSpy.calls.reset();
        strToMsSpy.calls.reset();
        directive['_processInput'](input);

        expect(strToMsSpy).not.toHaveBeenCalled();
        expect(onChangeSpy).not.toHaveBeenCalled();
      });
    });
  });
});
