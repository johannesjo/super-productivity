import { createSignal, onMount } from 'solid-js';
import './App.css';
import { RuleList } from './components/RuleList';
import { RuleEditor } from './components/RuleEditor';
import { AutomationRule } from '../types';

// Communication with plugin.js
const sendMessage = async (type: string, payload?: any) => {
  return new Promise((resolve) => {
    const messageId = Math.random().toString(36).substr(2, 9);

    const handler = (event: MessageEvent) => {
      if (event.data.messageId === messageId) {
        window.removeEventListener('message', handler);
        resolve(event.data.response);
      }
    };

    window.addEventListener('message', handler);
    window.parent.postMessage({ type, payload, messageId }, '*');
  });
};

function App() {
  const [isLoading, setIsLoading] = createSignal(true);
  const [rules, setRules] = createSignal<AutomationRule[]>([]);
  const [editingRule, setEditingRule] = createSignal<AutomationRule | null>(null);
  const [isEditorOpen, setIsEditorOpen] = createSignal(false);

  onMount(async () => {
    // Mock data for now, later fetch from plugin
    setRules([
      {
        id: '1',
        name: 'Automatic Onboarding Tasks',
        isEnabled: true,
        trigger: { type: 'taskCreated' },
        conditions: [{ type: 'titleContains', value: 'feature' }],
        actions: [{ type: 'createTask', value: 'Write acceptance criteria' }],
      },
    ]);
    setIsLoading(false);
  });

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule(JSON.parse(JSON.stringify(rule))); // Deep clone
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingRule({
      id: '',
      name: 'New Rule',
      isEnabled: true,
      trigger: { type: 'taskCreated' },
      conditions: [],
      actions: [],
    });
    setIsEditorOpen(true);
  };

  const handleSave = (rule: AutomationRule) => {
    if (rule.id) {
      setRules(rules().map((r) => (r.id === rule.id ? rule : r)));
    } else {
      const newRule = { ...rule, id: Math.random().toString(36).substr(2, 9) };
      setRules([...rules(), newRule]);
    }
    setIsEditorOpen(false);
    setEditingRule(null);
  };

  return (
    <div class="app">
      <main class="container">
        {isLoading() ? (
          <article aria-busy="true"></article>
        ) : (
          <>
            <RuleList rules={rules()} onEdit={handleEdit} onCreate={handleCreate} />
            {editingRule() && (
              <RuleEditor
                isOpen={isEditorOpen()}
                rule={editingRule()!}
                onSave={handleSave}
                onCancel={() => {
                  setIsEditorOpen(false);
                  setEditingRule(null);
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
