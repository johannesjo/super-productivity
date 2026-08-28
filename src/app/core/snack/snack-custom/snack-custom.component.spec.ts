import { TestBed } from '@angular/core/testing';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { SnackParams } from '../snack.model';
import { SnackCustomComponent } from './snack-custom.component';

describe('SnackCustomComponent', () => {
  const createComponent = (
    data: SnackParams,
  ): {
    component: SnackCustomComponent;
    ref: jasmine.SpyObj<MatSnackBarRef<SnackCustomComponent>>;
  } => {
    const ref = jasmine.createSpyObj<MatSnackBarRef<SnackCustomComponent>>(
      'MatSnackBarRef',
      ['dismiss', 'dismissWithAction'],
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_SNACK_BAR_DATA, useValue: data },
        { provide: MatSnackBarRef, useValue: ref },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new SnackCustomComponent());
    return { component, ref };
  };

  afterEach(() => TestBed.resetTestingModule());

  it('should invoke the non-action dismissal callback from the close control', async () => {
    const dismissFn = jasmine.createSpy('dismissFn');
    const { component, ref } = createComponent({ msg: 'Undo', dismissFn });

    await component.close();

    expect(dismissFn).toHaveBeenCalled();
    expect(ref.dismiss).toHaveBeenCalled();
  });

  it('should not invoke the dismissal callback when the action is used', () => {
    const actionFn = jasmine.createSpy('actionFn');
    const dismissFn = jasmine.createSpy('dismissFn');
    const { component, ref } = createComponent({
      msg: 'Undo',
      actionFn,
      dismissFn,
    });

    component.actionClick();

    expect(actionFn).toHaveBeenCalled();
    expect(dismissFn).not.toHaveBeenCalled();
    expect(ref.dismissWithAction).toHaveBeenCalled();
  });
});
