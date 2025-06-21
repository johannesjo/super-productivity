# Procrastination Buster Plugin

Ein Super Productivity Plugin, das dir hilft, Prokrastinationsblocker zu identifizieren und maßgeschneiderte Strategien anzubieten.

## Features

- 🎯 Identifiziere 8 verschiedene Prokrastinations-Typen
- 💡 Erhalte maßgeschneiderte Strategien für jeden Typ
- ⏱️ Starte Pomodoro-Timer direkt aus den Strategien
- ➕ Füge Strategien als Tasks hinzu
- 🌓 Dark Mode Support

## Installation

### Entwicklung

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# Für Produktion bauen
npm run build

# Plugin-ZIP erstellen
npm run package
```

### In Super Productivity verwenden

1. `npm run build` ausführen
2. Die generierte `dist/plugin.zip` in Super Productivity hochladen
3. Oder kopiere den `dist` Ordner nach `src/assets/procrastination-buster/`

## Verwendung

1. **Shortcut**: Nutze die Tastenkombination für schnellen Zugriff
2. **Side Panel**: Öffne das Plugin über das Side Panel
3. **Automatisch**: Nach 15 Minuten Inaktivität bei einer Aufgabe

## Prokrastinations-Typen

1. **Überwältigung** - "Zu viel auf einmal"
2. **Perfektionismus** - "Es ist nicht perfekt genug"
3. **Unklarheit** - "Ich weiß nicht, was zu tun ist"
4. **Langeweile** - "Es ist langweilig"
5. **Angst** - "Ich könnte scheitern"
6. **Energiemangel** - "Ich bin zu müde"
7. **Ablenkung** - "Andere Dinge sind interessanter"
8. **Widerstand** - "Ich will das nicht machen"

## Technologie

- **SolidJS** für reaktive UI
- **Vite** für schnelles Development und Builds
- **TypeScript** für Type Safety
- **Super Productivity Plugin API**

## Entwicklung

Das Plugin besteht aus zwei Teilen:

1. **plugin.ts** - Backend-Logik, die mit Super Productivity kommuniziert
2. **SolidJS App** - Frontend UI im iframe

### Projekt-Struktur

```
procrastination-buster/
├── src/
│   ├── plugin.ts         # Plugin Backend
│   ├── App.tsx          # Haupt-Komponente
│   ├── types.ts         # TypeScript Definitionen
│   ├── BlockerSelector.tsx
│   └── StrategyList.tsx
├── manifest.json        # Plugin Metadata
├── index.html          # HTML Entry
└── vite.config.ts      # Build Konfiguration
```

## Anpassungen

### Neue Strategien hinzufügen

Bearbeite `src/types.ts` und füge neue Strategien zu den entsprechenden Typen hinzu.

### Styling anpassen

Bearbeite `src/App.css` für visuelle Anpassungen. Das Plugin respektiert automatisch den Dark Mode.

## License

MIT
