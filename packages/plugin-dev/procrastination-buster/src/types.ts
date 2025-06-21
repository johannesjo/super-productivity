export interface ProcrastinationType {
  id: string;
  title: string;
  emotion: string;
  strategies: string[];
}

export const procrastinationTypes: ProcrastinationType[] = [
  {
    id: 'overwhelm',
    title: 'Überwältigung',
    emotion: 'Zu viel auf einmal',
    strategies: [
      'Mikroaufgaben erstellen (5 Min-Steps)',
      'Pomodoro-Timer starten (25 Min)',
      'Implementation Intentions (Wenn X, dann Y)',
      'Eine einzige Sache auswählen',
    ],
  },
  {
    id: 'perfectionism',
    title: 'Perfektionismus',
    emotion: 'Es ist nicht perfekt genug',
    strategies: [
      'Zeitlimit setzen für v0.1',
      'Journaling: Was ist "gut genug"?',
      'Selbstmitgefühl üben',
      'Progress over perfection',
    ],
  },
  {
    id: 'unclear',
    title: 'Unklarheit',
    emotion: 'Ich weiß nicht, was zu tun ist',
    strategies: [
      'Nächsten konkreten Schritt definieren',
      'Mit jemandem darüber sprechen',
      'Mind-Map erstellen',
      'Fragen aufschreiben',
    ],
  },
  {
    id: 'boring',
    title: 'Langeweile',
    emotion: 'Es ist langweilig',
    strategies: [
      'Gamification einbauen',
      'Mit Musik/Podcast kombinieren',
      'Belohnung planen',
      'In kleinere Teile aufteilen',
    ],
  },
  {
    id: 'fear',
    title: 'Angst',
    emotion: 'Ich könnte scheitern',
    strategies: [
      'Worst-Case durchdenken',
      'Kleine Experimente machen',
      'Support-System aktivieren',
      'Erfolge dokumentieren',
    ],
  },
  {
    id: 'energy',
    title: 'Energiemangel',
    emotion: 'Ich bin zu müde',
    strategies: [
      '5-Minuten-Bewegungspause',
      'Wasser trinken',
      'Leichteste Aufgabe zuerst',
      'Power-Nap (20 Min)',
    ],
  },
  {
    id: 'distraction',
    title: 'Ablenkung',
    emotion: 'Andere Dinge sind interessanter',
    strategies: [
      'Ablenkungen blockieren',
      'Deep Work Block planen',
      'Klare Arbeitsumgebung',
      'Fokus-Ritual starten',
    ],
  },
  {
    id: 'resistance',
    title: 'Widerstand',
    emotion: 'Ich will das nicht machen',
    strategies: [
      'Warum ist es wichtig?',
      'Mit etwas Angenehmem koppeln',
      'Delegieren prüfen',
      'Reframing: Was lerne ich dabei?',
    ],
  },
];
