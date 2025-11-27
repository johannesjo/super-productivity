import { createSignal, onMount } from 'solid-js';
import './App.css';
import { RuleList } from './components/RuleList';
import { RuleEditor } from './components/RuleEditor';
import { AutomationRule } from '../types';

// Communication with plugin.js
const sendMessage = async (type: string, payload?: any) => {
  return new Promise((resolve, reject) => {
    const messageId = Math.random().toString(36).substr(2, 9);

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === 'PLUGIN_MESSAGE_RESPONSE' && data.messageId === messageId) {
        window.removeEventListener('message', handler);
        resolve(data.result);
      } else if (data.type === 'PLUGIN_MESSAGE_ERROR' && data.messageId === messageId) {
        window.removeEventListener('message', handler);
        reject(new Error(data.error));
      }
    };

    window.addEventListener('message', handler);
    window.parent.postMessage(
      {
        type: 'PLUGIN_MESSAGE',
        messageId,
        message: {
          type,
          payload,
        },
      },
      '*',
    );
  });
};

function App() {
  const [isLoading, setIsLoading] = createSignal(true);
  const [rules, setRules] = createSignal<AutomationRule[]>([]);
  const [editingRule, setEditingRule] = createSignal<AutomationRule | null>(null);
  const [isEditorOpen, setIsEditorOpen] = createSignal(false);

  const fetchRules = async () => {
    const fetchedRules = (await sendMessage('getRules')) as AutomationRule[];
    setRules(fetchedRules);
  };

  onMount(async () => {
    await fetchRules();
    setIsLoading(false);

    // Theme detection
    const isDark =
      getComputedStyle(document.documentElement).getPropertyValue('--is-dark-theme').trim() === '1';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Optional: Listen for changes if the host app updates the style tag dynamically
    // This might require a MutationObserver on the style tag or body if variables change
    const observer = new MutationObserver(() => {
      const isDarkNow =
        getComputedStyle(document.documentElement).getPropertyValue('--is-dark-theme').trim() ===
        '1';
      document.documentElement.setAttribute('data-theme', isDarkNow ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    // Also observe the injected style tag if possible, but documentElement style check is a good start
  });

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule(JSON.parse(JSON.stringify(rule))); // Deep clone
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingRule({
      id: '',
      name: '',
      isEnabled: true,
      trigger: { type: 'taskCreated' },
      conditions: [],
      actions: [],
    });
    setIsEditorOpen(true);
  };

  const handleSave = async (rule: AutomationRule) => {
    // If it's a new rule, generate ID here or let backend do it.
    // Backend (RuleRegistry) expects ID for updates, but for new rules it pushes.
    // However, RuleRegistry logic is: if index != -1 update, else push.
    // So we should probably generate ID here if it's missing, to ensure uniqueness.
    const ruleToSave = rule.id ? rule : { ...rule, id: Math.random().toString(36).substr(2, 9) };

    await sendMessage('saveRule', ruleToSave);
    await fetchRules();
    setIsEditorOpen(false);
    setEditingRule(null);
  };

  const handleDelete = async (rule: AutomationRule) => {
    if (confirm(`Are you sure you want to delete "${rule.name}"?`)) {
      await sendMessage('deleteRule', { id: rule.id });
      await fetchRules();
      setIsEditorOpen(false);
      setEditingRule(null);
    }
  };

  const handleToggleStatus = async (rule: AutomationRule) => {
    await sendMessage('toggleRuleStatus', { id: rule.id, isEnabled: !rule.isEnabled });
    await fetchRules();
  };

  return (
    <div class="app">
      <main class="container">
        {isLoading() ? (
          <article aria-busy="true"></article>
        ) : (
          <>
            <RuleList
              rules={rules()}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onCreate={handleCreate}
            />
            {editingRule() && (
              <RuleEditor
                isOpen={isEditorOpen()}
                rule={editingRule()!}
                onSave={handleSave}
                onDelete={handleDelete}
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
