import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import confetti from 'canvas-confetti';

@Component({
  selector: 'pyro',
  standalone: true,
  imports: [],
  templateUrl: './pyro.component.html',
  styleUrl: './pyro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PyroComponent implements OnInit, OnDestroy {
  intervalId?: number;

  public ngOnInit(): void {
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 20, spread: 720, ticks: 600, zIndex: 0 };

    const randomInRange = (min: number, max: number): number =>
      // eslint-disable-next-line no-mixed-operators
      Math.random() * (max - min) + min;

    this.intervalId = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return window.clearInterval(this.intervalId);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }

  public ngOnDestroy(): void {
    window.clearInterval(this.intervalId);
  }
}
