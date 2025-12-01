const fs = require('fs');

const mi = JSON.parse(fs.readFileSync('.tmp/perf-metrics-initial-load.json', 'utf8'));
const mct = JSON.parse(fs.readFileSync('.tmp/perf-metrics-create-tasks.json', 'utf8'));

const block = (m) => {
  return `
| Metric | Value |
|--------|-------|
| JSHeapUsedSize | ${m.JSHeapUsedSize}  |
| JSEventListeners | ${m.JSEventListeners}  |
| Nodes | ${m.Nodes}  |
| RecalcStyleCount | ${m.RecalcStyleCount}  |
| LayoutCount | ${m.LayoutCount}  |
| LayoutObjects | ${m.LayoutObjects}  |
| LayoutDuration | ${m.LayoutDuration}  |
| ScriptDuration | ${m.ScriptDuration}  |
| FirstMeaningfulPaint | ${m.FirstMeaningfulPaint}  |
  `;
};

const commentBody = `
### Initial Load

${block(mi)}

### Create tasks

${block(mct)}

`;

console.log(commentBody);
