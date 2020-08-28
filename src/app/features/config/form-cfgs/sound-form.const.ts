// tslint:disable:max-line-length
import { ConfigFormSection, SoundConfig } from '../global-config.model';
import { T } from '../../../t.const';

export const SOUND_FORM_CFG: ConfigFormSection<SoundConfig> = {
  title: T.GCF.SOUND.TITLE,
  key: 'misc',
  items: [
    {
      key: 'volume',
      type: 'slider',
      templateOptions: {
        type: 'number',
        min: 0,
        max: 100,
        label: T.GCF.SOUND.VOLUME,
        required: true,
      },
    },
    {
      key: 'isPlayDoneSound',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.SOUND.IS_PLAY_DONE_SOUND,
      },
    },
    {
      key: 'doneSound',
      type: 'select',
      templateOptions: {
        label: T.GCF.SOUND.DONE_SOUND,
        options: [
          {label: 'Sound 1', value: '/assets/snd/done1.mp3'},
          {label: 'Sound 2', value: '/assets/snd/done2.mp3'},
          {label: 'Sound 3', value: '/assets/snd/done3.mp3'},
          {label: 'Sound 4', value: '/assets/snd/done4.mp3'},
        ],
        hideExpression: ((model: any) => {
          return !model.isPlayDoneSound;
        }),
      },
    },
    {
      key: 'isIncreaseDoneSoundPitch',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.SOUND.IS_INCREASE_DONE_PITCH,
      },
      hideExpression: ((model: any) => {
        return !model.isPlayDoneSound;
      }),
    },
  ]
};
