import {
	DomainStore,
	EncryptedOperationTransport,
	NouraSyncHttpEndpoint,
	type StateRepository,
	type SyncCursorRepository
} from '@noura/application';
import {
	INBOX_PROJECT_ID,
	createInitialState,
	migrateLegacyBackupToNoura,
	selectOrderedTasks,
	type DomainOperation,
	type DomainState,
	type ISODate,
	type Project,
	type Task,
	type TaskPriority,
	type TaskStatus,
	type TimeSession
} from '@noura/domain';
import { SvelteURL } from 'svelte/reactivity';

export type AppView =
	| 'today'
	| 'upcoming'
	| 'project'
	| 'priority'
	| 'completed'
	| 'planner'
	| 'boards'
	| 'focus'
	| 'insights';

const today = (): `${number}-${number}-${number}` =>
	new Date().toISOString().slice(0, 10) as `${number}-${number}-${number}`;

const CLIENT_ID_KEY = 'noura-client-id';
const clientId = (): string => {
	if (typeof window === 'undefined') return crypto.randomUUID();
	const existing = window.localStorage.getItem(CLIENT_ID_KEY);
	if (existing) return existing;
	const created = crypto.randomUUID();
	window.localStorage.setItem(CLIENT_ID_KEY, created);
	return created;
};

const seedState = (): DomainState => {
	const now = Date.now();
	const initial = createInitialState(now);
	const study: Project = {
		id: 'study',
		title: 'Study',
		color: 'blue',
		icon: 'book-open',
		archived: false,
		createdAt: now
	};
	const seedTasks: Task[] = [
		{
			id: 'welcome',
			title: 'Welcome to Noura',
			notes: 'A quiet workspace for tasks, time and focus. Everything here works offline.',
			status: 'open',
			priority: 0,
			projectId: INBOX_PROJECT_ID,
			tagIds: ['start'],
			checklist: [],
			attachments: [],
			estimateMs: 25 * 60_000,
			trackedMs: 0,
			createdAt: now - 4000,
			updatedAt: now - 4000,
			order: 0
		},
		{
			id: 'plan-week',
			title: 'Plan the week',
			notes: 'Review projects, choose three outcomes, and protect focus time.',
			status: 'open',
			priority: 2,
			projectId: INBOX_PROJECT_ID,
			dueDay: today(),
			tagIds: ['planning'],
			checklist: [
				{ id: 'c1', title: 'Review open projects', done: true },
				{ id: 'c2', title: 'Block focus sessions', done: false }
			],
			attachments: [],
			estimateMs: 30 * 60_000,
			trackedMs: 8 * 60_000,
			createdAt: now - 3000,
			updatedAt: now - 3000,
			order: 1
		},
		{
			id: 'read-paper',
			title: 'Read distributed systems paper',
			notes: 'Capture three ideas in the project notes.',
			status: 'open',
			priority: 1,
			projectId: 'study',
			dueDay: today(),
			tagIds: ['reading'],
			checklist: [],
			attachments: [],
			estimateMs: 60 * 60_000,
			trackedMs: 0,
			createdAt: now - 2000,
			updatedAt: now - 2000,
			order: 2
		},
		{
			id: 'archive-notes',
			title: 'Archive completed course notes',
			notes: '',
			status: 'done',
			priority: 0,
			projectId: 'study',
			tagIds: [],
			checklist: [],
			attachments: [],
			estimateMs: 15 * 60_000,
			trackedMs: 12 * 60_000,
			createdAt: now - 1000,
			updatedAt: now - 1000,
			completedAt: now - 500,
			order: 3
		}
	];
	return {
		...initial,
		projects: { ...initial.projects, [study.id]: study },
		tasks: Object.fromEntries(seedTasks.map((task) => [task.id, task])),
		taskOrder: seedTasks.map((task) => task.id)
	};
};

class IndexedDbRepository implements StateRepository {
	#fallback: DomainState;
	#sqlitePromise?: Promise<SqlDatabase>;
	constructor(fallback: DomainState) {
		this.#fallback = fallback;
	}

	#isTauri(): boolean {
		return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
	}

	async #sqlite(): Promise<SqlDatabase> {
		this.#sqlitePromise ??= (async () => {
			const { default: Database } = await import('@tauri-apps/plugin-sql');
			const database = (await Database.load('sqlite:noura.db')) as SqlDatabase;
			await database.execute(
				'CREATE TABLE IF NOT EXISTS domain_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL)'
			);
			await database.execute(
				'CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, sequence INTEGER NOT NULL, timestamp INTEGER NOT NULL, payload TEXT NOT NULL)'
			);
			return database;
		})();
		return await this.#sqlitePromise;
	}

	async #db(): Promise<IDBDatabase | undefined> {
		if (typeof indexedDB === 'undefined') return undefined;
		return await new Promise((resolve, reject) => {
			const request = indexedDB.open('noura', 2);
			request.onupgradeneeded = () => {
				if (!request.result.objectStoreNames.contains('domain'))
					request.result.createObjectStore('domain');
				if (!request.result.objectStoreNames.contains('operations'))
					request.result.createObjectStore('operations', { keyPath: 'id' });
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	async load(): Promise<DomainState> {
		if (this.#isTauri()) {
			const rows = await (
				await this.#sqlite()
			).select<{ payload: string }[]>('SELECT payload FROM domain_state WHERE id = 1');
			return rows[0]
				? (JSON.parse(rows[0].payload) as DomainState)
				: structuredClone(this.#fallback);
		}
		const db = await this.#db();
		if (!db) return structuredClone(this.#fallback);
		return await new Promise((resolve, reject) => {
			const request = db.transaction('domain').objectStore('domain').get('state');
			request.onsuccess = () =>
				resolve((request.result as DomainState | undefined) ?? structuredClone(this.#fallback));
			request.onerror = () => reject(request.error);
		});
	}

	async save(state: DomainState, operation: DomainOperation): Promise<void> {
		if (this.#isTauri()) {
			const db = await this.#sqlite();
			await db.execute('BEGIN IMMEDIATE');
			try {
				await db.execute(
					'INSERT INTO domain_state (id, payload) VALUES (1, $1) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',
					[JSON.stringify(state)]
				);
				await db.execute(
					'INSERT OR IGNORE INTO operations (id, sequence, timestamp, payload) VALUES ($1, $2, $3, $4)',
					[operation.id, operation.sequence, operation.timestamp, JSON.stringify(operation)]
				);
				await db.execute('COMMIT');
			} catch (error) {
				await db.execute('ROLLBACK');
				throw error;
			}
			return;
		}
		const db = await this.#db();
		if (!db) {
			this.#fallback = structuredClone(state);
			return;
		}
		await new Promise<void>((resolve, reject) => {
			const transaction = db.transaction(['domain', 'operations'], 'readwrite');
			transaction.objectStore('domain').put(structuredClone(state), 'state');
			transaction.objectStore('operations').put(structuredClone(operation));
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	}
	async import(state: DomainState): Promise<void> {
		await this.#put(state);
	}
	async export(): Promise<DomainState> {
		return await this.load();
	}

	async #put(state: DomainState): Promise<void> {
		if (this.#isTauri()) {
			await (
				await this.#sqlite()
			).execute(
				'INSERT INTO domain_state (id, payload) VALUES (1, $1) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',
				[JSON.stringify(state)]
			);
			return;
		}
		const db = await this.#db();
		if (!db) {
			this.#fallback = structuredClone(state);
			return;
		}
		await new Promise<void>((resolve, reject) => {
			const request = db
				.transaction('domain', 'readwrite')
				.objectStore('domain')
				.put(structuredClone(state), 'state');
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}
}

interface SqlDatabase {
	execute(query: string, bindValues?: unknown[]): Promise<unknown>;
	select<T>(query: string, bindValues?: unknown[]): Promise<T>;
}

class LocalSyncCursorRepository implements SyncCursorRepository {
	#cursor = { serverSeq: 0, vectorClock: {} as Record<string, number> };
	readonly #key: string;

	constructor(serverUrl: string) {
		this.#key = `noura-sync-cursor:${serverUrl}`;
	}

	async load(): Promise<{ serverSeq: number; vectorClock: Record<string, number> }> {
		if (typeof window === 'undefined') return structuredClone(this.#cursor);
		const value = window.localStorage.getItem(this.#key);
		return value
			? (JSON.parse(value) as { serverSeq: number; vectorClock: Record<string, number> })
			: structuredClone(this.#cursor);
	}

	async save(cursor: { serverSeq: number; vectorClock: Record<string, number> }): Promise<void> {
		this.#cursor = structuredClone(cursor);
		if (typeof window !== 'undefined')
			window.localStorage.setItem(this.#key, JSON.stringify(cursor));
	}
}

export class NouraModel {
	state = $state.raw<DomainState>(seedState());
	view = $state<AppView>('today');
	searchOpen = $state(false);
	settingsOpen = $state(false);
	activityOpen = $state(false);
	sidebarOpen = $state(false);
	taskCaptureOpen = $state(false);
	taskCaptureTitle = $state('');
	taskCaptureDueDay = $state<ISODate | undefined>();
	taskCaptureProjectId = $state(INBOX_PROJECT_ID);
	taskCaptureStatus = $state<TaskStatus>('open');
	taskDetailsOpen = $state(false);
	completedVisible = $state(false);
	syncServerUrl = $state('https://sync.super-productivity.com');
	syncAccessToken = $state('');
	syncPassphrase = $state('');
	syncStatus = $state<'offline' | 'connecting' | 'connected' | 'error'>('offline');
	syncError = $state('');
	#store: DomainStore;
	#syncTransport?: EncryptedOperationTransport;
	readonly #clientId: string;

	constructor() {
		this.#clientId = clientId();
		this.#store = new DomainStore(
			new IndexedDbRepository(this.state),
			this.#clientId,
			undefined,
			this.state
		);
		this.#store.subscribe((state) => {
			this.state = state;
		});
	}

	async hydrate(): Promise<void> {
		await this.#store.hydrate();
	}

	async connectNouraSync(): Promise<void> {
		this.syncError = '';
		this.syncStatus = 'connecting';
		try {
			const url = new SvelteURL(this.syncServerUrl.trim());
			if (!['http:', 'https:'].includes(url.protocol))
				throw new Error('Use an HTTP or HTTPS server URL');
			if (!this.syncAccessToken.trim()) throw new Error('Enter a NouraSync access token');
			if (this.syncPassphrase.length < 8)
				throw new Error('Use a sync password with at least 8 characters');
			this.#syncTransport?.stop();
			this.#syncTransport = new EncryptedOperationTransport(
				new NouraSyncHttpEndpoint({ baseUrl: url.toString(), accessToken: this.syncAccessToken }),
				new LocalSyncCursorRepository(url.origin),
				this.#clientId,
				this.syncPassphrase
			);
			this.#store.connectTransport(this.#syncTransport);
			await this.#syncTransport.start();
			this.syncStatus = 'connected';
		} catch (error) {
			this.#store.connectTransport(undefined);
			this.#syncTransport = undefined;
			this.syncStatus = 'error';
			this.syncError = error instanceof Error ? error.message : 'Unable to connect to NouraSync';
		}
	}

	disconnectNouraSync(): void {
		this.#syncTransport?.stop();
		this.#syncTransport = undefined;
		this.#store.connectTransport(undefined);
		this.syncAccessToken = '';
		this.syncPassphrase = '';
		this.syncError = '';
		this.syncStatus = 'offline';
	}

	get selectedTask(): Task | undefined {
		return this.state.selectedTaskId ? this.state.tasks[this.state.selectedTaskId] : undefined;
	}
	get activeProject(): Project | undefined {
		return this.state.projects[this.state.activeProjectId];
	}
	get projects(): Project[] {
		return Object.values(this.state.projects).filter(
			(project) => project.id !== INBOX_PROJECT_ID && !project.archived
		);
	}
	get allTasks(): Task[] {
		return selectOrderedTasks(this.state);
	}
	get visibleTasks(): Task[] {
		const open = this.allTasks.filter((task) => this.completedVisible || task.status !== 'done');
		if (this.view === 'today') return open.filter((task) => task.dueDay === today());
		if (this.view === 'upcoming') return open.filter((task) => Boolean(task.dueDay));
		if (this.view === 'project')
			return open.filter((task) => task.projectId === this.state.activeProjectId);
		if (this.view === 'priority') return open.filter((task) => task.priority >= 2);
		if (this.view === 'completed') return this.allTasks.filter((task) => task.status === 'done');
		return open;
	}

	async addProject(title: string): Promise<void> {
		const trimmed = title.trim();
		if (!trimmed) return;
		const project: Project = {
			id: crypto.randomUUID(),
			title: trimmed,
			color: 'blue',
			icon: 'folder',
			archived: false,
			createdAt: Date.now()
		};
		await this.#store.execute({ type: 'project/add', payload: { project } });
		await this.selectProject(project.id);
	}

	async addTask(
		title: string,
		options: { dueDay?: ISODate; projectId?: string; status?: TaskStatus } = {}
	): Promise<void> {
		const trimmed = title.trim();
		if (!trimmed) return;
		const now = Date.now();
		const projectId =
			options.projectId ??
			(this.view === 'project' ? this.state.activeProjectId : INBOX_PROJECT_ID);
		const status = options.status ?? 'open';
		const task: Task = {
			id: crypto.randomUUID(),
			title: trimmed,
			notes: '',
			status,
			priority: 0,
			projectId,
			dueDay: options.dueDay ?? (this.view === 'today' ? today() : undefined),
			tagIds: [],
			checklist: [],
			attachments: [],
			estimateMs: 0,
			trackedMs: 0,
			createdAt: now,
			updatedAt: now,
			completedAt: status === 'done' ? now : undefined,
			order: this.state.taskOrder.length
		};
		await this.#store.execute({ type: 'task/add', payload: { task } });
	}

	openTaskCapture(
		options: { dueDay?: ISODate; projectId?: string; status?: TaskStatus } = {}
	): void {
		this.taskCaptureTitle = '';
		this.taskCaptureDueDay = options.dueDay;
		this.taskCaptureProjectId = options.projectId ?? this.state.activeProjectId;
		this.taskCaptureStatus = options.status ?? 'open';
		this.taskCaptureOpen = true;
	}

	async commitTaskCapture(): Promise<void> {
		if (!this.taskCaptureTitle.trim()) return;
		await this.addTask(this.taskCaptureTitle, {
			dueDay: this.taskCaptureDueDay,
			projectId: this.taskCaptureProjectId,
			status: this.taskCaptureStatus
		});
		this.taskCaptureTitle = '';
		this.taskCaptureOpen = false;
	}

	async openTaskDetails(id: string): Promise<void> {
		await this.selectTask(id);
		this.taskDetailsOpen = true;
	}

	async updateTask(id: string, patch: Partial<Omit<Task, 'id'>>): Promise<void> {
		await this.#store.execute({
			type: 'task/update',
			payload: { id, patch: { ...patch, updatedAt: Date.now() } }
		});
	}
	async toggleTask(id: string): Promise<void> {
		await this.#store.execute({ type: 'task/toggle', payload: { id, completedAt: Date.now() } });
	}
	async selectTask(id?: string): Promise<void> {
		await this.#store.execute({ type: 'task/select', payload: { id } });
	}
	async selectProject(id: string): Promise<void> {
		this.view = 'project';
		await this.#store.execute({ type: 'project/select', payload: { id } });
	}
	async setPriority(id: string, priority: TaskPriority): Promise<void> {
		await this.updateTask(id, { priority });
	}

	async addChecklistItem(id: string, title: string): Promise<void> {
		const task = this.state.tasks[id];
		const trimmed = title.trim();
		if (!task || !trimmed) return;
		await this.updateTask(id, {
			checklist: [...task.checklist, { id: crypto.randomUUID(), title: trimmed, done: false }]
		});
	}

	async toggleChecklistItem(taskId: string, itemId: string): Promise<void> {
		const task = this.state.tasks[taskId];
		if (!task) return;
		await this.updateTask(taskId, {
			checklist: task.checklist.map((item) =>
				item.id === itemId ? { ...item, done: !item.done } : item
			)
		});
	}

	async removeTask(id: string): Promise<void> {
		await this.#store.execute({ type: 'task/remove', payload: { id } });
	}

	async postponeOverdue(): Promise<void> {
		const day = today();
		for (const task of this.allTasks.filter(
			(candidate) => candidate.status === 'open' && candidate.dueDay && candidate.dueDay < day
		)) {
			await this.updateTask(task.id, { dueDay: day });
		}
	}

	async startFocusSession(mode: TimeSession['mode']): Promise<void> {
		const session: TimeSession = {
			id: crypto.randomUUID(),
			taskId: this.state.selectedTaskId,
			mode,
			startedAt: Date.now(),
			durationMs: 0
		};
		await this.#store.execute({ type: 'session/start', payload: { session } });
	}

	async stopFocusSession(durationMs: number): Promise<void> {
		const id = this.state.activeSessionId;
		if (!id) return;
		await this.#store.execute({
			type: 'session/stop',
			payload: { id, endedAt: Date.now(), durationMs }
		});
	}

	async recordFocusSession(
		mode: TimeSession['mode'],
		durationMs: number,
		endedAt = Date.now()
	): Promise<void> {
		if (!Number.isFinite(durationMs) || durationMs <= 0) return;
		const session: TimeSession = {
			id: crypto.randomUUID(),
			taskId: this.state.selectedTaskId,
			mode,
			startedAt: endedAt - durationMs,
			durationMs: 0
		};
		await this.#store.execute({ type: 'session/start', payload: { session } });
		await this.#store.execute({
			type: 'session/stop',
			payload: { id: session.id, endedAt, durationMs }
		});
	}

	async exportBackup(): Promise<void> {
		const state = await this.#store.export();
		const payload = JSON.stringify(
			{ format: 'noura-backup', version: 1, exportedAt: Date.now(), state },
			null,
			2
		);
		if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
			const [{ save }, { writeTextFile }] = await Promise.all([
				import('@tauri-apps/plugin-dialog'),
				import('@tauri-apps/plugin-fs')
			]);
			const path = await save({
				defaultPath: `noura-backup-${today()}.json`,
				filters: [{ name: 'Noura backup', extensions: ['json'] }]
			});
			if (path) await writeTextFile(path, payload);
			return;
		}
		const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `noura-backup-${today()}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	async importBackup(): Promise<void> {
		let content: string | undefined;
		if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
			const [{ open }, { readTextFile }] = await Promise.all([
				import('@tauri-apps/plugin-dialog'),
				import('@tauri-apps/plugin-fs')
			]);
			const path = await open({
				multiple: false,
				filters: [{ name: 'Noura or Super Productivity backup', extensions: ['json'] }]
			});
			if (typeof path === 'string') content = await readTextFile(path);
		} else {
			content = await new Promise((resolve) => {
				const input = document.createElement('input');
				input.type = 'file';
				input.accept = 'application/json,.json';
				input.onchange = () => {
					const file = input.files?.[0];
					if (!file) {
						resolve(undefined);
						return;
					}
					void file.text().then(resolve);
				};
				input.click();
			});
		}
		if (!content) return;
		const parsed = JSON.parse(content) as unknown;
		const candidate =
			parsed && typeof parsed === 'object' && 'state' in parsed
				? (parsed as { state?: unknown }).state
				: parsed;
		const imported =
			candidate &&
			typeof candidate === 'object' &&
			'schemaVersion' in candidate &&
			(candidate as { schemaVersion?: unknown }).schemaVersion === 1
				? (candidate as DomainState)
				: migrateLegacyBackupToNoura(parsed);
		if (!imported.tasks || !imported.projects) throw new Error('Unsupported backup format');
		await this.#store.import(imported);
	}
}

export const model = new NouraModel();
