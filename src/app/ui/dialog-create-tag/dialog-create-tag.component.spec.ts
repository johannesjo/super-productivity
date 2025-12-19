import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { ColorPickerDirective } from 'ngx-color-picker';
import { DialogCreateTagComponent } from './dialog-create-tag.component';
import { GlobalThemeService } from '../../core/theme/global-theme.service';

describe('DialogCreateTagComponent', () => {
  let component: DialogCreateTagComponent;
  let fixture: ComponentFixture<DialogCreateTagComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DialogCreateTagComponent>>;

  const globalThemeServiceMock = {
    isDarkTheme: jasmine.createSpy('isDarkTheme').and.returnValue(true),
  };

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        DialogCreateTagComponent,
        NoopAnimationsModule,
        TranslateModule.forRoot(),
        ColorPickerDirective,
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: GlobalThemeService, useValue: globalThemeServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogCreateTagComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close with tag data when save is called with valid title', () => {
    component.title = 'Test Tag';
    component.color = '#ff0000';

    component.close(true);

    expect(mockDialogRef.close).toHaveBeenCalledWith({
      title: 'Test Tag',
      color: '#ff0000',
    });
  });

  it('should close with undefined when cancel is called', () => {
    component.close(false);

    expect(mockDialogRef.close).toHaveBeenCalledWith(undefined);
  });

  it('should close with undefined when save is called with empty title', () => {
    component.title = '   ';
    component.close(true);

    expect(mockDialogRef.close).toHaveBeenCalledWith(undefined);
  });
});
