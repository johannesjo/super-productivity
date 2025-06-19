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

    it('should call _strToMs with "2h 3" and parse as 2 hours 3 minutes', () => {
      // "2h 3" is parsed as 2 hours and 3 minutes = 7380000 ms
      mockStringToMsPipe.transform.and.returnValue(7380000);
      mockMsToStringPipe.transform.and.returnValue('2h 3m');

      directive.onInput('2h 3');

      expect(strToMsSpy).toHaveBeenCalledWith('2h 3');
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

    it('should call _strToMs with "45s"', () => {
      mockStringToMsPipe.transform.and.returnValue(45000);
      mockMsToStringPipe.transform.and.returnValue('45s');

      directive.onInput('45s');

      expect(strToMsSpy).toHaveBeenCalledWith('45s');
      expect(onChangeSpy).toHaveBeenCalledWith(45000);
    });

    it('should call _strToMs with "1d"', () => {
      mockStringToMsPipe.transform.and.returnValue(86400000);
      mockMsToStringPipe.transform.and.returnValue('1d');

      directive.onInput('1d');

      expect(strToMsSpy).toHaveBeenCalledWith('1d');
      expect(onChangeSpy).toHaveBeenCalledWith(86400000);
    });

    it('should handle empty input and call onChange with 0', () => {
      mockStringToMsPipe.transform.and.returnValue(0);
      mockMsToStringPipe.transform.and.returnValue('');

      directive.onInput('');

      expect(onChangeSpy).toHaveBeenCalledWith(0);
    });

    it('should handle invalid input and show error', () => {
      // Mock the pipes to simulate invalid input that throws an error
      mockStringToMsPipe.transform.and.throwError('Invalid duration format');

      directive.onInput('invalid');

      expect(strToMsSpy).toHaveBeenCalledWith('invalid');
      expect(errorSpy).toHaveBeenCalledWith(
        'Error parsing duration:',
        jasmine.any(Error),
      );
      expect(onChangeSpy).toHaveBeenCalledWith(null);
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
      // Real implementation test without mocking conversions
      strToMsSpy.and.callThrough();
      msToStrSpy.and.callThrough();

      // Only test formats that match the regex: /(^\d+h(?: \d+m)?$)|(^\d+m$)/i
      const validTestCases = [
        { input: '30m', shouldProcess: true },
        { input: '1h', shouldProcess: true },
        { input: '1h 30m', shouldProcess: true },
        { input: '2h', shouldProcess: true },
      ];

      // These don't match the regex pattern
      const invalidTestCases = [
        { input: '45s', shouldProcess: false },
        { input: '1d', shouldProcess: false },
      ];

      validTestCases.forEach(({ input, shouldProcess }) => {
        onChangeSpy.calls.reset();
        strToMsSpy.calls.reset();
        directive['_processInput'](input);

        if (shouldProcess) {
          expect(strToMsSpy).toHaveBeenCalledWith(input);
          expect(onChangeSpy).toHaveBeenCalled();
        }
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
