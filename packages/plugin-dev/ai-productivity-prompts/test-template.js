// Simple test for the renderPrompt function

function renderPrompt(template, tasksMd) {
  return template.replace(
    /{{#if tasks_md}}([\s\S]*?){{\/if}}/g,
    tasksMd ? `$1`.replace(/{{tasks_md}}/g, tasksMd) : '',
  );
}

// Test cases
console.log('Test 1 - Without tasks:');
const template1 = 'Hello {{#if tasks_md}}here are tasks: {{tasks_md}}{{/if}} end.';
console.log(renderPrompt(template1));

console.log('\nTest 2 - With tasks:');
console.log(renderPrompt(template1, '- Task 1\n- Task 2'));

console.log('\nTest 3 - Real prompt template:');
const realTemplate = `You are an executive function coach. Given my tasks, help me pick a realistic Top 3 for today.

{{#if tasks_md}}
Here are my tasks:
{{tasks_md}}
{{/if}}`;

console.log('Without tasks:');
console.log(renderPrompt(realTemplate));

console.log('\nWith tasks:');
console.log(
  renderPrompt(
    realTemplate,
    '- [ ] Complete project report\n- [ ] Review PR #123\n- [ ] Meeting with team',
  ),
);
