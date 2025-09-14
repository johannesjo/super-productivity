import { animate, style, transition, trigger } from '@angular/animations';

export const magicSideNavAnimations = [
  trigger('mobileNav', [
    transition(':enter', [
      style({ transform: 'translateX(-100%)' }),
      animate(
        '225ms cubic-bezier(0.4, 0, 0.2, 1)',
        style({ transform: 'translateX(0)' }),
      ),
    ]),
    transition(':leave', [
      style({ transform: 'translateX(0)' }),
      animate(
        '225ms cubic-bezier(0.4, 0, 0.2, 1)',
        style({ transform: 'translateX(-100%)' }),
      ),
    ]),
  ]),
  trigger('mobileBackdrop', [
    transition(':enter', [
      style({ opacity: 0 }),
      animate('225ms ease-in-out', style({ opacity: 1 })),
    ]),
    transition(':leave', [animate('225ms ease-in-out', style({ opacity: 0 }))]),
  ]),
];
