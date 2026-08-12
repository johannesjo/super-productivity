import {
	DomainStore,
	EncryptedOperationTransport,
	FileProviderOperationEndpoint,
	NouraSyncHttpEndpoint,
	parseCapture,
	type StateRepository,
	type SyncCursorRepository
} from '@noura/application';
import {
	INBOX_PROJECT_ID,
	createInitialState,
	importAnyState,
	selectOrderedTasks,
	selectSmartListTasks,
	type DomainOperation,
	type DomainState,
	type GlobalConfig,
	type ISODate,
	type Note,
	type Project,
	type SmartList,
	type Tag,
	type Task,
	type TaskPriority,
	type TaskRepeatCfg,
	type TaskStatus,
	type TimeSession
} from '@noura/domain';
import { SvelteURL } from 'svelte/reactivity';
import {
	createDropboxConnection,
	createLocalFileConnection,
	createNextcloudConnection,
	createOneDriveConnection,
	createWebdavConnection,
	parseOAuthResult,
	type FileProviderKind,
	type OAuthProviderConnection,
	type ProviderConnection
} from './provider-runtime';

export type AppView =
	| 'today'
	| 'upcoming'
	| 'project'
	| 'priority'
	| 'completed'
	| 'planner'
	| 'schedule'
	| 'boards'
	| 'focus'
	| 'insights'
	| 'smartlist'
	| 'tag'
	| 'archives'
	| 'history'
	| 'eisenhower'
	| 'notes';

const today = (): `${number}-${number}-${number}` =>
	new Date().toISOString().slice(0, 10) as `${number}-${number}-${number}`;

const unitLabel = (unit: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'): string => {
	switch (unit) {
		case 'DAILY':
			return 'day';
		case 'WEEKLY':
			return 'week';
		case 'MONTHLY':
			return 'month';
		case 'YEARLY':
			return 'year';
	}
};

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
			subtaskIds: [],
			tagIds: ['start'],
			checklist: [],
			sections: [],
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
			subtaskIds: [],
			dueDay: today(),
			tagIds: ['planning'],
			checklist: [
				{ id: 'c1', title: 'Review open projects', done: true },
				{ id: 'c2', title: 'Block focus sessions', done: false }
			],
			sections: [],
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
			subtaskIds: [],
			dueDay: today(),
			tagIds: ['reading'],
			checklist: [],
			sections: [],
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
			subtaskIds: [],
			tagIds: [],
			checklist: [],
			sections: [],
			attachments: [],
			estimateMs: 15 * 60_000,
			trackedMs: 12 * 60_000,
			createdAt: now - 1000,
			updatedAt: now - 1000,
			doneOn: now - 500,
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

	constructor(connectionIdentity: string) {
		this.#key = `noura-sync-cursor:${connectionIdentity}`;
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
	activeSmartListId = $state<string | undefined>();
	activeTagId = $state<string | undefined>();
	selectedNoteId = $state<string | undefined>();
	orgOpen = $state(false);
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
	syncProvider = $state<'noura' | FileProviderKind>('noura');
	syncProviderLabel = $state('');
	webdavUrl = $state('');
	webdavUsername = $state('');
	webdavPassword = $state('');
	webdavFolder = $state('Noura');
	nextcloudUrl = $state('');
	nextcloudUsername = $state('');
	nextcloudLoginName = $state('');
	nextcloudPassword = $state('');
	nextcloudFolder = $state('Noura');
	dropboxAppKey = $state('');
	oneDriveClientId = $state('');
	oneDriveTenantId = $state('common');
	localSyncFolder = $state('');
	oauthUrl = $state('');
	oauthCode = $state('');
	oauthProvider = $state<'dropbox' | 'onedrive' | undefined>();
	#store: DomainStore;
	#syncTransport?: EncryptedOperationTransport;
	#pendingOAuth?: OAuthProviderConnection;
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
		try {
			const url = new SvelteURL(this.syncServerUrl.trim());
			if (!['http:', 'https:'].includes(url.protocol))
				throw new Error('Use an HTTP or HTTPS server URL');
			if (!this.syncAccessToken.trim()) throw new Error('Enter a NouraSync access token');
			if (this.syncPassphrase.length < 8)
				throw new Error('Use a sync password with at least 8 characters');
			await this.#connectSyncTransport(
				new NouraSyncHttpEndpoint({ baseUrl: url.toString(), accessToken: this.syncAccessToken }),
				`nourasync:${url.origin}`,
				'NouraSync'
			);
		} catch (error) {
			this.#setSyncError(error, 'Unable to connect to NouraSync');
		}
	}

	async connectWebdav(): Promise<void> {
		try {
			const url = new SvelteURL(this.webdavUrl.trim());
			const connection = await createWebdavConnection({
				baseUrl: url.toString(),
				userName: this.webdavUsername.trim(),
				password: this.webdavPassword,
				syncFolderPath: this.webdavFolder.trim() || 'Noura'
			});
			await this.#connectFileProvider(connection);
		} catch (error) {
			this.#setSyncError(error, 'Unable to connect to WebDAV');
		}
	}

	async connectNextcloud(): Promise<void> {
		try {
			const url = new SvelteURL(this.nextcloudUrl.trim());
			const connection = await createNextcloudConnection({
				serverUrl: url.toString(),
				userName: this.nextcloudUsername.trim(),
				loginName: this.nextcloudLoginName.trim() || undefined,
				password: this.nextcloudPassword,
				syncFolderPath: this.nextcloudFolder.trim() || 'Noura'
			});
			await this.#connectFileProvider(connection);
		} catch (error) {
			this.#setSyncError(error, 'Unable to connect to Nextcloud');
		}
	}

	async beginDropboxAuth(): Promise<void> {
		await this.#beginOAuth('dropbox', () => createDropboxConnection(this.dropboxAppKey));
	}

	async beginOneDriveAuth(): Promise<void> {
		await this.#beginOAuth('onedrive', () =>
			createOneDriveConnection(this.oneDriveClientId, this.oneDriveTenantId)
		);
	}

	async finishOAuth(): Promise<void> {
		try {
			if (!this.#pendingOAuth?.auth.verifyCodeChallenge)
				throw new Error('Start authorization again');
			const { code } = parseOAuthResult(this.oauthCode, this.#pendingOAuth.expectedState);
			const privateCfg = await this.#pendingOAuth.auth.verifyCodeChallenge(code);
			await this.#pendingOAuth.provider.setPrivateCfg(privateCfg);
			if (!(await this.#pendingOAuth.provider.isReady()))
				throw new Error(`${this.#pendingOAuth.label} did not return reusable credentials`);
			const connection = this.#pendingOAuth;
			this.oauthProvider = undefined;
			this.oauthCode = '';
			this.oauthUrl = '';
			this.#pendingOAuth = undefined;
			await this.#connectFileProvider(connection);
		} catch (error) {
			this.#setSyncError(error, 'Unable to finish authorization');
		}
	}

	async chooseLocalSyncFolder(): Promise<void> {
		try {
			const { open } = await import('@tauri-apps/plugin-dialog');
			const selected = await open({
				directory: true,
				multiple: false,
				title: 'Choose sync folder'
			});
			if (typeof selected === 'string') this.localSyncFolder = selected;
		} catch (error) {
			this.#setSyncError(error, 'Unable to choose a local sync folder');
		}
	}

	async connectLocalFolder(): Promise<void> {
		try {
			const connection = await createLocalFileConnection(this.localSyncFolder);
			await this.#connectFileProvider(connection);
		} catch (error) {
			this.#setSyncError(error, 'Unable to connect the local sync folder');
		}
	}

	disconnectSync(): void {
		this.#syncTransport?.stop();
		this.#syncTransport = undefined;
		this.#store.connectTransport(undefined);
		this.syncAccessToken = '';
		this.syncPassphrase = '';
		this.syncError = '';
		this.syncProviderLabel = '';
		this.syncStatus = 'offline';
	}

	disconnectNouraSync(): void {
		this.disconnectSync();
	}

	async #beginOAuth(
		kind: 'dropbox' | 'onedrive',
		create: () => Promise<OAuthProviderConnection>
	): Promise<void> {
		try {
			this.#assertSyncPassphrase();
			this.syncError = '';
			const connection = await create();
			if (!connection.auth.authUrl)
				throw new Error(`${connection.label} did not return an authorization URL`);
			this.#pendingOAuth = connection;
			this.oauthProvider = kind;
			this.oauthUrl = connection.auth.authUrl;
			this.oauthCode = '';
			const { openUrl } = await import('@tauri-apps/plugin-opener');
			await openUrl(connection.auth.authUrl);
		} catch (error) {
			this.#setSyncError(error, `Unable to start ${kind} authorization`);
		}
	}

	async #connectFileProvider(connection: ProviderConnection): Promise<void> {
		if (!(await connection.provider.isReady()))
			throw new Error(`${connection.label} is not fully configured`);
		await this.#connectSyncTransport(
			new FileProviderOperationEndpoint({ provider: connection.provider }),
			`${connection.kind}:${connection.identity}`,
			connection.label
		);
	}

	async #connectSyncTransport(
		endpoint: ConstructorParameters<typeof EncryptedOperationTransport>[0],
		identity: string,
		label: string
	): Promise<void> {
		this.#assertSyncPassphrase();
		this.syncError = '';
		this.syncStatus = 'connecting';
		this.#syncTransport?.stop();
		this.#syncTransport = new EncryptedOperationTransport(
			endpoint,
			new LocalSyncCursorRepository(identity),
			this.#clientId,
			this.syncPassphrase
		);
		this.#store.connectTransport(this.#syncTransport);
		try {
			await this.#syncTransport.start();
			this.syncProviderLabel = label;
			this.syncStatus = 'connected';
		} catch (error) {
			this.#syncTransport.stop();
			this.#syncTransport = undefined;
			this.#store.connectTransport(undefined);
			throw error;
		}
	}

	#assertSyncPassphrase(): void {
		if (this.syncPassphrase.length < 8)
			throw new Error('Use a sync password with at least 8 characters');
	}

	#setSyncError(error: unknown, fallback: string): void {
		this.#store.connectTransport(undefined);
		this.#syncTransport?.stop();
		this.#syncTransport = undefined;
		this.syncStatus = 'error';
		this.syncError = error instanceof Error ? error.message : fallback;
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
	get smartLists(): SmartList[] {
		return Object.values(this.state.smartLists).sort(
			(a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
		);
	}
	get tags(): Tag[] {
		return Object.values(this.state.tags).sort((a, b) => a.title.localeCompare(b.title));
	}
	get activeSmartList(): SmartList | undefined {
		return this.activeSmartListId ? this.state.smartLists[this.activeSmartListId] : undefined;
	}
	get activeTag(): Tag | undefined {
		return this.activeTagId ? this.state.tags[this.activeTagId] : undefined;
	}
	get allTasks(): Task[] {
		return selectOrderedTasks(this.state);
	}
	get visibleTasks(): Task[] {
		const open = this.allTasks.filter((task) => this.completedVisible || task.status !== 'done');
		let filtered: Task[];
		if (this.view === 'today') filtered = open.filter((task) => task.dueDay === today());
		else if (this.view === 'upcoming') filtered = open.filter((task) => Boolean(task.dueDay));
		else if (this.view === 'project')
			filtered = open.filter((task) => task.projectId === this.state.activeProjectId);
		else if (this.view === 'priority') filtered = open.filter((task) => task.priority >= 2);
		else if (this.view === 'completed')
			filtered = this.allTasks.filter((task) => task.status === 'done');
		else if (this.view === 'smartlist') {
			const list = this.activeSmartList;
			filtered = list ? selectSmartListTasks(this.state, list) : [];
		} else if (this.view === 'tag') {
			filtered = this.activeTagId
				? open.filter((task) => task.tagIds.includes(this.activeTagId as string))
				: [];
		} else if (this.view === 'archives') {
			filtered = this.allTasks.filter((task) => task.status === 'archived');
		} else filtered = open;

		// Keep nested trees coherent: a task is visible when it or any ancestor
		// matched the filter, so subtasks render under their parent regardless of
		// the parent's own due date/status.
		if (this.view === 'today' || this.view === 'upcoming') {
			const included: Record<string, true> = Object.fromEntries(
				filtered.map((task) => [task.id, true])
			);
			for (const child of filtered) {
				let parentId = child.parentId;
				while (parentId && this.state.tasks[parentId] && !included[parentId]) {
					included[parentId] = true;
					parentId = this.state.tasks[parentId]?.parentId;
				}
			}
			return open.filter((task) => included[task.id]);
		}
		return filtered;
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

	async renameProject(id: string, title: string): Promise<void> {
		const trimmed = title.trim();
		if (!trimmed) return;
		await this.#store.execute({
			type: 'project/update',
			payload: { id, patch: { title: trimmed } }
		});
	}

	async setProjectColor(id: string, color: string): Promise<void> {
		await this.#store.execute({ type: 'project/update', payload: { id, patch: { color } } });
	}

	async archiveProject(id: string, archived: boolean): Promise<void> {
		await this.#store.execute({ type: 'project/archive', payload: { id, archived } });
	}

	async removeProject(id: string): Promise<void> {
		if (id === INBOX_PROJECT_ID) return;
		await this.#store.execute({
			type: 'project/remove',
			payload: { id, fallbackProjectId: INBOX_PROJECT_ID }
		});
		if (this.view === 'project' && this.state.activeProjectId === undefined) {
			this.view = 'today';
		}
	}

	async renameTag(id: string, title: string): Promise<void> {
		const trimmed = title.trim();
		if (!trimmed) return;
		await this.#store.execute({ type: 'tag/update', payload: { id, patch: { title: trimmed } } });
	}

	async setTagColor(id: string, color: string): Promise<void> {
		await this.#store.execute({ type: 'tag/update', payload: { id, patch: { color } } });
	}

	async removeTag(id: string): Promise<void> {
		await this.#store.execute({ type: 'tag/remove', payload: { id } });
		if (this.activeTagId === id) {
			this.activeTagId = undefined;
			this.view = 'today';
		}
	}

	/** Drag-to-schedule: assigns a task to a day (or clears it). */
	async setTaskDay(id: string, dueDay: ISODate | undefined): Promise<void> {
		await this.updateTask(id, { dueDay });
	}

	get config(): GlobalConfig {
		return this.state.config;
	}

	async updateConfig(patch: Partial<GlobalConfig>): Promise<void> {
		await this.#store.execute({ type: 'config/update', payload: { patch } });
		this.applyTheme();
	}

	/** Applies the persisted theme mode (light/dark/system) to the document. */
	applyTheme(): void {
		if (typeof document === 'undefined') return;
		const mode = this.state.config.themeMode;
		const apply = (dark: boolean): void => {
			document.documentElement.classList.toggle('dark', dark);
		};
		if (mode === 'system') {
			const prefersDark =
				typeof window !== 'undefined' &&
				window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
			apply(Boolean(prefersDark));
		} else {
			apply(mode === 'dark');
		}
	}

	async addTask(
		title: string,
		options: { dueDay?: ISODate; projectId?: string; status?: TaskStatus } = {}
	): Promise<void> {
		const intent = parseCapture(title, { today: today(), now: Date.now() });
		const trimmed = (intent?.title ?? title).trim();
		if (!trimmed) return;
		const now = Date.now();
		const projectName = intent?.projectName;

		let defaultProject = INBOX_PROJECT_ID;
		const currentProject = this.state.projects[this.state.activeProjectId];
		if (this.view === 'project' && currentProject) defaultProject = currentProject.id;

		const projectId =
			options.projectId ??
			(projectName
				? (Object.values(this.state.projects).find(
						(project) =>
							project.title.toLowerCase() === projectName.toLowerCase() && !project.archived
					)?.id ?? defaultProject)
				: defaultProject);
		const status = options.status ?? 'open';

		const tagIds: string[] = [];
		for (const name of intent?.tagNames ?? []) {
			const existing = Object.values(this.state.tags).find(
				(tag) => tag.title.toLowerCase() === name.toLowerCase()
			);
			if (existing) {
				tagIds.push(existing.id);
			} else {
				const id = crypto.randomUUID();
				await this.#store.execute({
					type: 'tag/add',
					payload: { tag: { id, title: name, color: 'blue' } }
				});
				tagIds.push(id);
			}
		}

		let repeatCfgId: string | undefined;
		let repeatRule: string | undefined;
		if (intent?.repeat) {
			const cfg: TaskRepeatCfg = {
				id: crypto.randomUUID(),
				title: `Every ${intent.repeat.repeatEvery} ${unitLabel(intent.repeat.repeatEveryUnit)}`,
				repeatEvery: intent.repeat.repeatEvery,
				repeatEveryUnit: intent.repeat.repeatEveryUnit,
				daysOfWeek: intent.repeat.daysOfWeek,
				dayOfMonth: intent.repeat.dayOfMonth,
				weekOfMonth: intent.repeat.weekOfMonth,
				yearMonth: intent.repeat.yearMonth,
				repeatOffset: 0,
				createdAt: now,
				modifiedAt: now
			};
			await this.#store.execute({ type: 'repeatCfg/add', payload: { cfg } });
			repeatCfgId = cfg.id;
			repeatRule = cfg.title;
		}

		let parentId: string | undefined;
		for (const parentTitle of intent?.subtaskChain ?? []) {
			const id = crypto.randomUUID();
			await this.#store.execute({
				type: 'task/add',
				payload: {
					task: {
						id,
						title: parentTitle,
						notes: '',
						status: 'open',
						priority: 0,
						projectId,
						parentId,
						subtaskIds: [],
						tagIds: [],
						checklist: [],
						sections: [],
						attachments: [],
						estimateMs: 0,
						trackedMs: 0,
						createdAt: now,
						updatedAt: now,
						order: this.state.taskOrder.length
					}
				}
			});
			parentId = id;
		}

		const task: Task = {
			id: crypto.randomUUID(),
			title: trimmed,
			notes: '',
			status,
			priority: intent?.priority ?? 0,
			projectId,
			parentId,
			dueDay: options.dueDay ?? intent?.dueDay ?? (this.view === 'today' ? today() : undefined),
			dueAt: intent?.dueAt,
			start: intent?.start,
			startAt: intent?.startAt,
			reminderAt: intent?.reminderAt,
			repeatCfgId,
			repeatRule,
			subtaskIds: [],
			tagIds,
			checklist: [],
			sections: [],
			attachments: [],
			estimateMs: 0,
			trackedMs: 0,
			createdAt: now,
			updatedAt: now,
			doneOn: status === 'done' ? now : undefined,
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
		await this.#store.execute({ type: 'task/toggle', payload: { id, doneOn: Date.now() } });
	}
	async selectTask(id?: string): Promise<void> {
		await this.#store.execute({ type: 'task/select', payload: { id } });
	}
	async selectProject(id: string): Promise<void> {
		this.view = 'project';
		await this.#store.execute({ type: 'project/select', payload: { id } });
	}

	async selectSmartList(id: string): Promise<void> {
		if (!this.state.smartLists[id]) return;
		this.activeSmartListId = id;
		this.activeTagId = undefined;
		this.view = 'smartlist';
		await this.#store.execute({ type: 'task/select', payload: { id: undefined } });
	}

	async addSmartList(
		title: string,
		criteria?: SmartList['listConfig']['filterCriteria']
	): Promise<string | undefined> {
		const trimmed = title.trim();
		if (!trimmed) return undefined;
		const now = Date.now();
		const list: SmartList = {
			id: crypto.randomUUID(),
			title: trimmed,
			order: this.smartLists.length,
			listConfig: {
				isShowCompletedTasks: false,
				filterCriteria: criteria ?? []
			},
			createdAt: now,
			modifiedAt: now
		};
		await this.#store.execute({ type: 'smartList/add', payload: { list } });
		await this.selectSmartList(list.id);
		return list.id;
	}

	async removeSmartList(id: string): Promise<void> {
		await this.#store.execute({ type: 'smartList/remove', payload: { id } });
		if (this.activeSmartListId === id) {
			this.activeSmartListId = undefined;
			this.view = 'today';
		}
	}

	async selectTag(id: string): Promise<void> {
		if (!this.state.tags[id]) return;
		this.activeTagId = id;
		this.activeSmartListId = undefined;
		this.view = 'tag';
		await this.#store.execute({ type: 'task/select', payload: { id: undefined } });
	}

	async selectArchives(): Promise<void> {
		this.activeSmartListId = undefined;
		this.activeTagId = undefined;
		this.view = 'archives';
		await this.#store.execute({ type: 'task/select', payload: { id: undefined } });
	}

	async restoreTask(id: string): Promise<void> {
		await this.#store.execute({ type: 'task/restore', payload: { id } });
	}

	async archiveTask(id: string): Promise<void> {
		await this.#store.execute({ type: 'task/archive', payload: { id, at: Date.now() } });
	}

	/** Starts a stopwatch-style tracked entry against a specific task. */
	async startTrackingForTask(taskId: string): Promise<void> {
		if (this.state.activeSessionId) return;
		const now = Date.now();
		const entry: TimeSession = {
			id: crypto.randomUUID(),
			taskId,
			mode: 'stopwatch',
			startedAt: now,
			durationMs: 0,
			source: 'timer',
			updatedAt: now
		};
		await this.#store.execute({ type: 'session/start', payload: { session: entry } });
	}

	/** Stops the currently active tracked entry, attributing elapsed time. */
	async stopTracking(): Promise<void> {
		const id = this.state.activeSessionId;
		if (!id) return;
		const entry = this.state.trackedEntries[id];
		if (!entry) return;
		const now = Date.now();
		await this.#store.execute({
			type: 'session/stop',
			payload: { id, endedAt: now, durationMs: now - entry.startedAt }
		});
	}

	/** Returns the active entry when it is tracking the given task. */
	trackingTaskId(): string | undefined {
		const id = this.state.activeSessionId;
		return id ? this.state.trackedEntries[id]?.taskId : undefined;
	}

	/**
	 * Links (or creates) a recurrence config for a task from the engine-backed
	 * editor inputs, then points the task at it. One operation moves the task.
	 */
	async applyRepeat(
		taskId: string,
		next: Pick<TaskRepeatCfg, 'repeatEvery' | 'repeatEveryUnit' | 'daysOfWeek'> &
			Partial<Pick<TaskRepeatCfg, 'dayOfMonth' | 'weekOfMonth' | 'yearMonth'>>
	): Promise<void> {
		const task = this.state.tasks[taskId];
		if (!task) return;
		const now = Date.now();
		const cfgId = task.repeatCfgId ?? crypto.randomUUID();
		const cfg: TaskRepeatCfg = {
			id: cfgId,
			title: `Every ${next.repeatEvery} ${unitLabel(next.repeatEveryUnit)}`,
			repeatEvery: next.repeatEvery,
			repeatEveryUnit: next.repeatEveryUnit,
			daysOfWeek: [...next.daysOfWeek],
			dayOfMonth: next.dayOfMonth,
			weekOfMonth: next.weekOfMonth,
			yearMonth: next.yearMonth,
			repeatOffset: 0,
			createdAt: this.state.taskRepeatCfgs[cfgId]?.createdAt ?? now,
			modifiedAt: now
		};
		if (this.state.taskRepeatCfgs[cfgId]) {
			await this.#store.execute({
				type: 'repeatCfg/update',
				payload: {
					id: cfgId,
					patch: {
						title: cfg.title,
						repeatEvery: cfg.repeatEvery,
						repeatEveryUnit: cfg.repeatEveryUnit,
						daysOfWeek: cfg.daysOfWeek,
						dayOfMonth: cfg.dayOfMonth,
						weekOfMonth: cfg.weekOfMonth,
						yearMonth: cfg.yearMonth,
						modifiedAt: now
					}
				}
			});
		} else {
			await this.#store.execute({ type: 'repeatCfg/add', payload: { cfg } });
		}
		await this.updateTask(task.id, { repeatCfgId: cfgId, repeatRule: cfg.title });
	}

	/** Removes the recurrence link from a task (keeps the shared config). */
	async clearRepeat(taskId: string): Promise<void> {
		await this.updateTask(taskId, { repeatCfgId: undefined, repeatRule: undefined });
	}

	async addTag(title: string): Promise<string | undefined> {
		const trimmed = title.trim();
		if (!trimmed) return undefined;
		const existing = Object.values(this.state.tags).find(
			(tag) => tag.title.toLowerCase() === trimmed.toLowerCase()
		);
		if (existing) return existing.id;
		const id = crypto.randomUUID();
		await this.#store.execute({
			type: 'tag/add',
			payload: { tag: { id, title: trimmed, color: 'blue' } }
		});
		return id;
	}

	get notes() {
		return Object.values(this.state.notes).sort((a, b) => b.modifiedAt - a.modifiedAt);
	}
	get selectedNote() {
		return this.selectedNoteId ? this.state.notes[this.selectedNoteId] : undefined;
	}

	async selectNote(id: string): Promise<void> {
		if (!this.state.notes[id]) return;
		this.selectedNoteId = id;
		await this.#store.execute({ type: 'task/select', payload: { id: undefined } });
	}

	async addNote(title: string, projectId?: string): Promise<string | undefined> {
		const trimmed = title.trim();
		if (!trimmed) return undefined;
		const now = Date.now();
		const note: Note = {
			id: crypto.randomUUID(),
			projectId: projectId ?? this.state.activeProjectId,
			content: `# ${trimmed}\n`,
			bookmarks: [],
			attachments: [],
			createdAt: now,
			modifiedAt: now
		};
		await this.#store.execute({ type: 'note/add', payload: { note } });
		this.selectedNoteId = note.id;
		return note.id;
	}

	async updateNote(id: string, patch: Partial<Omit<Note, 'id'>>): Promise<void> {
		await this.#store.execute({
			type: 'note/update',
			payload: { id, patch: { ...patch, modifiedAt: Date.now() } }
		});
	}

	async removeNote(id: string): Promise<void> {
		await this.#store.execute({ type: 'note/remove', payload: { id } });
		if (this.selectedNoteId === id) this.selectedNoteId = undefined;
	}

	async addBookmark(noteId: string, path: string): Promise<void> {
		const trimmed = path.trim();
		const note = this.state.notes[noteId];
		if (!trimmed || !note) return;
		const now = Date.now();
		await this.#store.execute({
			type: 'note-bookmark/add',
			payload: {
				noteId,
				bookmark: {
					id: crypto.randomUUID(),
					noteId,
					path: trimmed,
					createdAt: now,
					modifiedAt: now
				}
			}
		});
	}

	async removeBookmark(noteId: string, bookmarkId: string): Promise<void> {
		await this.#store.execute({
			type: 'note-bookmark/remove',
			payload: { noteId, bookmarkId }
		});
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

	/** Persists a full (flat) task order; used by drag-and-drop reordering. */
	async reorderTasks(ids: string[]): Promise<void> {
		await this.#store.execute({ type: 'task/reorder', payload: { ids } });
	}

	/** Creates a child task under `parentId` and links the subtree. */
	async addSubtask(parentId: string, title: string): Promise<string | undefined> {
		const trimmed = title.trim();
		if (!trimmed) return undefined;
		const parent = this.state.tasks[parentId];
		if (!parent) return undefined;
		const now = Date.now();
		const id = crypto.randomUUID();
		const task: Task = {
			id,
			title: trimmed,
			notes: '',
			status: 'open',
			priority: 0,
			projectId: parent.projectId,
			parentId,
			dueDay: parent.dueDay,
			subtaskIds: [],
			tagIds: [],
			checklist: [],
			sections: [],
			attachments: [],
			estimateMs: 0,
			trackedMs: 0,
			createdAt: now,
			updatedAt: now,
			order: this.state.taskOrder.length
		};
		await this.#store.execute({ type: 'task/add', payload: { task } });
		return id;
	}

	/** Makes `id` a subtask of the nearest preceding sibling row (if any). */
	async indentTask(id: string, parentId?: string): Promise<void> {
		const task = this.state.tasks[id];
		if (!task) return;
		await this.updateTask(id, { parentId });
	}

	/** Removes `id` from its parent subtree (becomes a top-level task). */
	async dedentTask(id: string): Promise<void> {
		const task = this.state.tasks[id];
		if (!task) return;
		const patch: Partial<Omit<Task, 'id'>> = { parentId: undefined };
		await this.updateTask(id, patch);
	}

	/** Renames a task in place (inline editing). */
	async renameTask(id: string, title: string): Promise<void> {
		const trimmed = title.trim();
		if (!trimmed) return;
		await this.updateTask(id, { title: trimmed });
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
			durationMs: 0,
			source: 'timer',
			updatedAt: Date.now()
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
			durationMs: 0,
			source: 'timer',
			updatedAt: endedAt
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
		const imported = importAnyState(parsed);
		if (!imported.tasks || !imported.projects) throw new Error('Unsupported backup format');
		await this.#store.import(imported);
	}
}

export const model = new NouraModel();
