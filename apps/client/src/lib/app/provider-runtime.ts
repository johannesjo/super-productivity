import { NOOP_SYNC_LOGGER } from '@sp/sync-core';
import { Dropbox, type DropboxPrivateCfg, PROVIDER_ID_DROPBOX } from '@sp/sync-providers/dropbox';
import {
	LocalFileSyncBase,
	PROVIDER_ID_LOCAL_FILE,
	type LocalFileSyncPrivateCfg
} from '@sp/sync-providers/local-file';
import {
	OneDrive,
	PROVIDER_ID_ONEDRIVE,
	type OneDrivePrivateCfg
} from '@sp/sync-providers/onedrive';
import type { SyncCredentialStorePort } from '@sp/sync-providers/credential-store';
import type { NativeHttpExecutor } from '@sp/sync-providers/http';
import type { FileSyncProvider, SyncProviderAuthHelper } from '@sp/sync-providers/provider-types';
import {
	NextcloudProvider,
	PROVIDER_ID_NEXTCLOUD,
	PROVIDER_ID_WEBDAV,
	Webdav,
	type NextcloudPrivateCfg,
	type WebdavPrivateCfg
} from '@sp/sync-providers/webdav';
import { join } from '@tauri-apps/api/path';
import { readDir, readTextFile, remove, writeTextFile } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export type FileProviderKind = 'dropbox' | 'onedrive' | 'webdav' | 'nextcloud' | 'local';

export interface ProviderConnection {
	kind: FileProviderKind;
	label: string;
	identity: string;
	provider: FileSyncProvider;
}

export interface OAuthProviderConnection extends ProviderConnection {
	auth: SyncProviderAuthHelper;
	expectedState?: string;
}

class SessionCredentialStore<PID extends string, TPrivateCfg> implements SyncCredentialStorePort<
	PID,
	TPrivateCfg
> {
	#value: TPrivateCfg | null;
	#listeners = new Set<(data: { providerId: PID; privateCfg: TPrivateCfg }) => void>();

	constructor(
		readonly providerId: PID,
		initialValue: TPrivateCfg | null = null
	) {
		this.#value = initialValue ? structuredClone(initialValue) : null;
	}

	async load(): Promise<TPrivateCfg | null> {
		return this.#value ? structuredClone(this.#value) : null;
	}

	async setComplete(privateCfg: TPrivateCfg): Promise<void> {
		this.#value = structuredClone(privateCfg);
		for (const listener of this.#listeners)
			listener({ providerId: this.providerId, privateCfg: structuredClone(privateCfg) });
	}

	async updatePartial(updates: Partial<TPrivateCfg>): Promise<void> {
		if (!this.#value) throw new Error(`${this.providerId} credentials are not configured`);
		await this.setComplete({ ...this.#value, ...updates });
	}

	async upsertPartial(updates: Partial<TPrivateCfg>): Promise<void> {
		await this.setComplete({ ...(this.#value ?? ({} as TPrivateCfg)), ...updates });
	}

	async clear(): Promise<void> {
		this.#value = null;
	}

	onConfigChange(callback: (data: { providerId: PID; privateCfg: TPrivateCfg }) => void): void {
		this.#listeners.add(callback);
	}
}

const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const providerFetch = (): typeof fetch =>
	(isTauri() ? tauriFetch : globalThis.fetch) as typeof fetch;

const nativeHttp: NativeHttpExecutor = async (config) => {
	const response = await providerFetch()(config.url, {
		method: config.method,
		headers: config.headers,
		body: config.data
	});
	return {
		status: response.status,
		headers: Object.fromEntries(response.headers.entries()),
		data: config.responseType === 'json' ? await response.json() : await response.text(),
		url: response.url
	};
};

const platformInfo = {
	isNativePlatform: false,
	isAndroidWebView: false,
	isIosNative: false
} as const;

const sharedNetworkDeps = {
	logger: NOOP_SYNC_LOGGER,
	platformInfo,
	webFetch: providerFetch
};

export const createWebdavConnection = async (
	cfg: WebdavPrivateCfg
): Promise<ProviderConnection> => {
	const credentialStore = new SessionCredentialStore(PROVIDER_ID_WEBDAV, cfg);
	const provider = new Webdav({
		...sharedNetworkDeps,
		nativeHttp,
		credentialStore
	});
	if (!(await provider.isReady())) throw new Error('Complete every WebDAV connection field');
	return {
		kind: 'webdav',
		label: 'WebDAV',
		identity: `${cfg.baseUrl}|${cfg.userName}|${cfg.syncFolderPath}`,
		provider
	};
};

export const createNextcloudConnection = async (
	cfg: NextcloudPrivateCfg
): Promise<ProviderConnection> => {
	const credentialStore = new SessionCredentialStore(PROVIDER_ID_NEXTCLOUD, cfg);
	const provider = new NextcloudProvider({
		...sharedNetworkDeps,
		nativeHttp,
		credentialStore
	});
	if (!(await provider.isReady())) throw new Error('Complete every Nextcloud connection field');
	return {
		kind: 'nextcloud',
		label: 'Nextcloud',
		identity: `${cfg.serverUrl}|${cfg.userName}|${cfg.syncFolderPath}`,
		provider
	};
};

export const createDropboxConnection = async (appKey: string): Promise<OAuthProviderConnection> => {
	const credentialStore = new SessionCredentialStore<typeof PROVIDER_ID_DROPBOX, DropboxPrivateCfg>(
		PROVIDER_ID_DROPBOX,
		{ accessToken: '', refreshToken: '' }
	);
	const provider = new Dropbox(
		{ appKey: appKey.trim(), basePath: '/' },
		{
			...sharedNetworkDeps,
			credentialStore,
			nativeHttpExecutor: nativeHttp
		}
	);
	return {
		kind: 'dropbox',
		label: 'Dropbox',
		identity: appKey.trim(),
		provider,
		auth: await provider.getAuthHelper()
	};
};

export const createOneDriveConnection = async (
	clientId: string,
	tenantId: string
): Promise<OAuthProviderConnection> => {
	const config: OneDrivePrivateCfg = {
		clientId: clientId.trim(),
		tenantId: tenantId.trim() || 'common',
		syncFolderPath: 'Noura',
		accessToken: '',
		refreshToken: '',
		tokenExpiresAt: 0,
		useCustomApp: true
	};
	const credentialStore = new SessionCredentialStore(PROVIDER_ID_ONEDRIVE, config);
	let expectedState: string | undefined;
	const provider = new OneDrive(
		{},
		{
			...sharedNetworkDeps,
			credentialStore,
			officialClientId: null,
			hasOfficialClientId: false,
			addOAuthState: (_provider, state) => (expectedState = state),
			isElectron: false
		}
	);
	return {
		kind: 'onedrive',
		label: 'OneDrive',
		identity: `${config.clientId}|${config.tenantId}`,
		provider,
		auth: await provider.getAuthHelper(),
		expectedState
	};
};

const safeRemoteName = (targetPath: string): string => {
	const normalized = targetPath.replace(/^\/+/, '');
	if (
		!normalized ||
		normalized.includes('..') ||
		normalized.includes('/') ||
		normalized.includes('\\')
	)
		throw new Error('Invalid local sync file name');
	return normalized;
};

class TauriLocalFileProvider extends LocalFileSyncBase {
	constructor(
		private readonly folderPath: string,
		credentialStore: SessionCredentialStore<typeof PROVIDER_ID_LOCAL_FILE, LocalFileSyncPrivateCfg>
	) {
		super({
			logger: NOOP_SYNC_LOGGER,
			credentialStore,
			fileAdapter: {
				readFile: (path) => readTextFile(path),
				writeFile: (path, data) => writeTextFile(path, data),
				deleteFile: (path) => remove(path),
				listFiles: async (path) => (await readDir(path)).map((entry) => entry.name)
			}
		});
	}

	async isReady(): Promise<boolean> {
		return isTauri() && Boolean(this.folderPath);
	}

	protected async getFilePath(targetPath: string): Promise<string> {
		return await join(this.folderPath, safeRemoteName(targetPath));
	}
}

export const createLocalFileConnection = async (
	folderPath: string
): Promise<ProviderConnection> => {
	if (!isTauri()) throw new Error('Local-folder sync is available in the Noura desktop app');
	const trimmedPath = folderPath.trim();
	if (!trimmedPath) throw new Error('Choose a local sync folder');
	const credentialStore = new SessionCredentialStore<
		typeof PROVIDER_ID_LOCAL_FILE,
		LocalFileSyncPrivateCfg
	>(PROVIDER_ID_LOCAL_FILE, { syncFolderPath: trimmedPath });
	const provider = new TauriLocalFileProvider(trimmedPath, credentialStore);
	if (!(await provider.isReady())) throw new Error('Choose a local sync folder');
	return {
		kind: 'local',
		label: 'Local folder',
		identity: trimmedPath,
		provider
	};
};

export const parseOAuthResult = (
	value: string,
	expectedState?: string
): { code: string; state?: string } => {
	const trimmed = value.trim();
	if (!trimmed) throw new Error('Paste the authorization code or callback URL');
	try {
		const url = new URL(trimmed);
		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state') ?? undefined;
		if (!code) throw new Error('The callback URL does not contain an authorization code');
		if (expectedState && state !== expectedState)
			throw new Error('The OAuth callback state does not match this authorization request');
		return { code, state };
	} catch (error) {
		if (/^https?:\/\//i.test(trimmed)) throw error;
		return { code: trimmed };
	}
};
