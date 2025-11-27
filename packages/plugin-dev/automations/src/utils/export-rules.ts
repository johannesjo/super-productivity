import { AutomationRule } from '../types';
import { sendMessage } from './messaging';

export const exportRules = async (rules: AutomationRule[]) => {
  console.log('Exporting rules:', rules);
  const dataStr = JSON.stringify(rules, null, 2);
  await sendMessage('downloadFile', { filename: 'automation-rules.json', data: dataStr });
};
