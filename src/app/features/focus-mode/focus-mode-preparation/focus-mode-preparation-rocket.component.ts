import { ChangeDetectionStrategy, Component, input } from '@angular/core';

type RocketState = 'jiggle-even' | 'jiggle-odd' | 'launch';

@Component({
  selector: 'focus-mode-preparation-rocket',
  standalone: true,
  templateUrl: './focus-mode-preparation-rocket.component.html',
  styles: [
    `
      .rocket-wrapper {
        position: relative;
        width: 96px;
        height: 150px;
        margin: var(--s2) auto 0;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        transform-origin: 50% 100%;
        transition: transform 0.18s ease;
      }

      .rocket-wrapper.jiggle-even {
        transform: rotate(-4deg);
      }

      .rocket-wrapper.jiggle-odd {
        transform: rotate(4deg);
      }

      .rocket-wrapper.launch {
        animation: rocket-launch 0.9s forwards ease-in;
      }

      .rocket {
        position: relative;
        width: 52px;
        height: 120px;
        background: linear-gradient(180deg, #ffffff 0%, #eaf0ff 85%);
        border-radius: 26px 26px 18px 18px;
        box-shadow: 0 8px 20px rgba(20, 53, 140, 0.18);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
      }

      .nose {
        position: absolute;
        top: -26px;
        width: 0;
        height: 0;
        border-left: 26px solid transparent;
        border-right: 26px solid transparent;
        border-bottom: 26px solid #143474;
      }

      .body {
        position: absolute;
        inset: 12px 8px 22px;
        border-radius: 22px;
        background: linear-gradient(180deg, #2c6fee 0%, #1a42b7 100%);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .window {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: radial-gradient(
          circle at 35% 35%,
          #ffffff 0%,
          #8cc9ff 45%,
          #2f72d6 100%
        );
        border: 3px solid rgba(255, 255, 255, 0.85);
      }

      .fin {
        position: absolute;
        bottom: 16px;
        width: 18px;
        height: 24px;
        background: linear-gradient(180deg, #ffa463 0%, #f15b25 100%);
        border-radius: 6px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.18);
      }

      .fin.fin-left {
        transform: translateX(-26px) rotate(-18deg);
      }

      .fin.fin-right {
        transform: translateX(26px) rotate(18deg);
      }

      .flame {
        position: absolute;
        bottom: -24px;
        width: 16px;
        height: 32px;
        border-radius: 50%;
        background: radial-gradient(
          circle at 50% 10%,
          #ffffff 0%,
          #ffd873 45%,
          #ff8a3f 80%,
          transparent 100%
        );
        opacity: 0;
        animation: flame-flicker 0.3s infinite alternate;
        filter: drop-shadow(0 0 4px rgba(255, 143, 0, 0.45));
        transition: opacity 0.2s ease;
      }

      .rocket-wrapper.jiggle-even .flame,
      .rocket-wrapper.jiggle-odd .flame {
        opacity: 1;
      }

      .rocket-wrapper.launch .flame {
        opacity: 1;
        animation: flame-launch 0.2s infinite alternate;
      }

      @keyframes flame-flicker {
        from {
          transform: scaleY(1);
        }
        to {
          transform: scaleY(0.75);
        }
      }

      @keyframes flame-launch {
        from {
          transform: scaleY(1.1);
        }
        to {
          transform: scaleY(1.35);
        }
      }

      @keyframes rocket-launch {
        0% {
          transform: translateY(0);
        }
        25% {
          transform: translateY(-14px);
        }
        100% {
          transform: translateY(-260px);
          opacity: 0;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModePreparationRocketComponent {
  readonly state = input<RocketState>('jiggle-even');
}
