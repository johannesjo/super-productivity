/* eslint-disable max-len */
import { ConfigFormSection, DominaModeConfig } from '../global-config.model';
import { T } from '../../../t.const';
import { speak } from '../../../util/speak';
import { getAvailableVoices } from '../../domina-mode/getAvailableVoices';

export const DOMINA_MODE_FORM: ConfigFormSection<DominaModeConfig> = {
  title: T.F.DOMINA_MODE.FORM.TITLE,
  key: 'dominaMode',
  help: T.F.DOMINA_MODE.FORM.HELP,
  items: [
    {
      key: 'isEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.G.ENABLED,
      },
    },
    {
      key: 'text',
      type: 'input',
      hideExpression: '!model.isEnabled',
      templateOptions: {
        label: T.F.DOMINA_MODE.FORM.L_TEXT,
        description: T.F.DOMINA_MODE.FORM.L_TEXT_DESCRIPTION,
        required: true,
      },
    },
    {
      key: 'interval',
      type: 'duration',
      hideExpression: '!model.isEnabled',
      templateOptions: {
        required: true,
        isAllowSeconds: true,
        label: T.F.DOMINA_MODE.FORM.L_INTERVAL,
        description: T.G.DURATION_DESCRIPTION,
      },
    },
    {
      key: 'volume',
      type: 'slider',
      hideExpression: '!model.isEnabled',
      props: {
        type: 'number',
        min: 0,
        max: 100,
        required: true,
        label: T.GCF.SOUND.VOLUME,
        change: ({ model }) => {
          let txt = model.text.replace('${currentTaskTitle}', 'current task title');
          if (txt.length <= 1) {
            txt = 'No text configured for domina mode';
          }
          speak(txt, model.volume, model.voice);
        },
      },
    },
    {
      key: 'voice',
      type: 'select',
      templateOptions: {
        label: 'Select a Voice',
        description: 'Choose a voice',
        required: false,
      },
      hooks: {
        onInit: (field) => {
          let voices: SpeechSynthesisVoice[] = getAvailableVoices() || [];
          voices = getAvailableVoices();
          //console.log(voices);

          if (field.templateOptions) {
            field.templateOptions.options = voices.map((voiceName) => ({
              label: voiceName.name,
              value: voiceName.voiceURI,
            }));
          }
        },
      },
    },
  ],
};
