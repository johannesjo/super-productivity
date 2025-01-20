import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import confetti from 'canvas-confetti';

@Component({
  selector: 'celebrate',
  standalone: true,
  imports: [],
  templateUrl: './celebrate.component.html',
  styleUrl: './celebrate.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CelebrateComponent implements OnInit, OnDestroy {
  intervalId?: number;

  public ngOnInit(): void {
    const count = 200;
    const defaults = {
      origin: { y: 0, x: 0.9 },
    };

    const fire = (particleRatio: number, opts: any): void => {
      confetti({
        ...defaults,
        ...opts,
        angle: -135,
        particleCount: Math.floor(count * particleRatio),
      });
    };

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }

  public ngOnDestroy(): void {
    window.clearInterval(this.intervalId);
  }
}
