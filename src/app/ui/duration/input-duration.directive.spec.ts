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

  beforeEach(() => {
    mockElementRef = {
      nativeElement: document.createElement('input'),
    };

    mockTranslateService = jasmine.createSpyObj('TranslateService', ['instant']);
    mockTranslateService.instant.and.returnValue('Duration is required');

    mockRenderer = jasmine.createSpyObj('Renderer2', [
      'setProperty',
      'setAttribute',
      'removeAttribute',
      'addClass',
      'removeClass',
      'setStyle',
      'removeStyle',
    ]);

    TestBed.configureTestingModule({
      providers: [
        InputDurationDirective,
        StringToMsPipe,
        MsToStringPipe,
        { provide: ElementRef, useValue: mockElementRef },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: Renderer2, useValue: mockRenderer },
      ],
    });

    directive = TestBed.inject(InputDurationDirective);
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
});
