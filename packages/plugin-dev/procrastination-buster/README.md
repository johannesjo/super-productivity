# Procrastination Buster Plugin

A Super Productivity plugin that helps identify procrastination blockers and provides tailored strategies to overcome them.

## Features

- 🎯 Identify 8 different procrastination types
- 💡 Get tailored strategies for each type
- ⏱️ Start Pomodoro timer directly from strategies
- ➕ Add strategies as tasks
- 🌓 Dark mode support using CSS variables

## Installation

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Create plugin ZIP
npm run package
```

### Use in Super Productivity

1. Run `npm run build`
2. Upload the generated `dist/plugin.zip` in Super Productivity
3. Or copy the `dist` folder to `src/assets/procrastination-buster/`

## Usage

1. **Shortcut**: Use keyboard shortcut for quick access
2. **Side Panel**: Open the plugin via the side panel
3. **Automatic**: After 15 minutes of inactivity on a task

## Procrastination Types

1. **Overwhelm** - "Too much at once"
2. **Perfectionism** - "It's not perfect enough"
3. **Unclear** - "I don't know what to do"
4. **Boredom** - "It's boring"
5. **Fear** - "I might fail"
6. **Low Energy** - "I'm too tired"
7. **Distraction** - "Other things are more interesting"
8. **Resistance** - "I don't want to do this"

## Technology

- **SolidJS** for reactive UI
- **Vite** for fast development and builds
- **TypeScript** for type safety
- **Super Productivity Plugin API**
- **CSS Variables** for theme integration

## Development

The plugin consists of two parts:

1. **plugin.ts** - Backend logic that communicates with Super Productivity
2. **SolidJS App** - Frontend UI in iframe

### Project Structure

```
procrastination-buster/
├── src/
│   ├── plugin.ts         # Plugin backend
│   ├── App.tsx          # Main component
│   ├── types.ts         # TypeScript definitions
│   ├── BlockerSelector.tsx
│   └── StrategyList.tsx
├── manifest.json        # Plugin metadata
├── index.html          # HTML entry
└── vite.config.ts      # Build configuration
```

## Customization

### Add New Strategies

Edit `src/types.ts` and add new strategies to the appropriate types.

### Styling Customization

Edit `src/App.css` for visual adjustments. The plugin uses CSS variables for seamless theme integration:

- `--primary-color` - Main theme color
- `--text-color` - Primary text
- `--background-color` - Background
- `--card-background` - Card backgrounds
- `--border-radius` - Standard radius
- And many more...

## License

MIT
