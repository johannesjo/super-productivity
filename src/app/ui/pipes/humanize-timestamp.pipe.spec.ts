import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HumanizeTimestampPipe } from './humanize-timestamp.pipe';

describe('HumanizeTimestampPipe', () => {
  let pipe: HumanizeTimestampPipe;
  let translateService: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [HumanizeTimestampPipe],
    });

    pipe = TestBed.inject(HumanizeTimestampPipe);
    translateService = TestBed.inject(TranslateService);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should transform a timestamp', () => {
    spyOn(translateService, 'instant').and.returnValue('a few seconds ago');
    const result = pipe.transform(new Date());
    expect(result).toBe('a few seconds ago');
  });
});
