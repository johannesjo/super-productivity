<script lang="ts">
	import BoxIcon from '@lucide/svelte/icons/box';
	import CloudIcon from '@lucide/svelte/icons/cloud';
	import CloudCogIcon from '@lucide/svelte/icons/cloud-cog';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import ServerIcon from '@lucide/svelte/icons/server';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import * as InputGroup from '$lib/components/ui/input-group';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import { Spinner } from '$lib/components/ui/spinner';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();

	const providers = [
		{ id: 'noura', label: 'NouraSync', detail: 'Hosted or self-hosted', icon: CloudIcon },
		{ id: 'dropbox', label: 'Dropbox', detail: 'OAuth app folder', icon: BoxIcon },
		{ id: 'onedrive', label: 'OneDrive', detail: 'Microsoft AppFolder', icon: CloudCogIcon },
		{ id: 'nextcloud', label: 'Nextcloud', detail: 'Personal cloud', icon: DatabaseIcon },
		{ id: 'webdav', label: 'WebDAV', detail: 'Any DAV server', icon: ServerIcon },
		{ id: 'local', label: 'Local folder', detail: 'Desktop backup', icon: HardDriveIcon }
	] as const;

	const isBusy = $derived(model.syncStatus === 'connecting');

	const selectProvider = (value: string) => {
		if (!value) return;
		model.syncProvider = value as typeof model.syncProvider;
		model.syncError = '';
	};
</script>

<Alert.Root class="connection-summary">
	<CloudIcon />
	<Alert.Title
		>{model.syncStatus === 'connected'
			? `${model.syncProviderLabel} connected`
			: 'Local-first mode'}</Alert.Title
	>
	<Alert.Description>
		{model.syncStatus === 'connected'
			? 'New changes are encrypted before they leave this device.'
			: 'Choose one provider for encrypted cross-device synchronization.'}
	</Alert.Description>
	{#if model.syncStatus === 'connected'}
		<Alert.Action
			><Button variant="outline" size="sm" onclick={() => model.disconnectSync()}>Disconnect</Button
			></Alert.Action
		>
	{/if}
	<div class="device-line" role="status">
		<span>Device {model.syncClientId.slice(0, 8)}</span>
		{#if model.syncError}<span class="sync-error">{model.syncError}</span>{/if}
	</div>
</Alert.Root>

<ToggleGroup.Root
	type="single"
	variant="outline"
	spacing={1}
	value={model.syncProvider}
	onValueChange={selectProvider}
	class="provider-grid"
	aria-label="Sync providers"
>
	{#each providers as provider (provider.id)}
		<ToggleGroup.Item value={provider.id} aria-label={provider.label}>
			<span class="provider-icon"><provider.icon /></span>
			<span><strong>{provider.label}</strong><small>{provider.detail}</small></span>
		</ToggleGroup.Item>
	{/each}
</ToggleGroup.Root>

<Separator />

<Field.FieldGroup>
	{#if model.syncProvider === 'noura'}
		<Field.Field>
			<Field.FieldLabel for="server-url">NouraSync server</Field.FieldLabel>
			<Input
				id="server-url"
				bind:value={model.syncServerUrl}
				placeholder="https://sync.example.com"
			/>
			<Field.FieldDescription
				>Use the hosted endpoint or your self-hosted server.</Field.FieldDescription
			>
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="access-token">Access token</Field.FieldLabel>
			<Input
				id="access-token"
				type="password"
				bind:value={model.syncAccessToken}
				autocomplete="off"
			/>
		</Field.Field>
	{:else if model.syncProvider === 'webdav'}
		<Field.Field>
			<Field.FieldLabel for="webdav-url">WebDAV URL</Field.FieldLabel>
			<Input
				id="webdav-url"
				bind:value={model.webdavUrl}
				placeholder="https://dav.example.com/files/user/"
			/>
		</Field.Field>
		<div class="field-row">
			<Field.Field
				><Field.FieldLabel for="webdav-user">Username</Field.FieldLabel><Input
					id="webdav-user"
					bind:value={model.webdavUsername}
				/></Field.Field
			>
			<Field.Field
				><Field.FieldLabel for="webdav-password">Password</Field.FieldLabel><Input
					id="webdav-password"
					type="password"
					bind:value={model.webdavPassword}
					autocomplete="off"
				/></Field.Field
			>
		</div>
		<Field.Field
			><Field.FieldLabel for="webdav-folder">Sync folder</Field.FieldLabel><Input
				id="webdav-folder"
				bind:value={model.webdavFolder}
			/></Field.Field
		>
	{:else if model.syncProvider === 'nextcloud'}
		<Field.Field>
			<Field.FieldLabel for="nextcloud-url">Nextcloud server</Field.FieldLabel>
			<Input
				id="nextcloud-url"
				bind:value={model.nextcloudUrl}
				placeholder="https://cloud.example.com"
			/>
			<Field.FieldDescription
				>Noura constructs the DAV path from this server and your account username.</Field.FieldDescription
			>
		</Field.Field>
		<div class="field-row">
			<Field.Field
				><Field.FieldLabel for="nextcloud-user">Account username</Field.FieldLabel><Input
					id="nextcloud-user"
					bind:value={model.nextcloudUsername}
				/></Field.Field
			>
			<Field.Field
				><Field.FieldLabel for="nextcloud-login">Login name (optional)</Field.FieldLabel><Input
					id="nextcloud-login"
					bind:value={model.nextcloudLoginName}
					placeholder="Email, if different"
				/></Field.Field
			>
		</div>
		<div class="field-row">
			<Field.Field
				><Field.FieldLabel for="nextcloud-password">App password</Field.FieldLabel><Input
					id="nextcloud-password"
					type="password"
					bind:value={model.nextcloudPassword}
					autocomplete="off"
				/></Field.Field
			>
			<Field.Field
				><Field.FieldLabel for="nextcloud-folder">Sync folder</Field.FieldLabel><Input
					id="nextcloud-folder"
					bind:value={model.nextcloudFolder}
				/></Field.Field
			>
		</div>
	{:else if model.syncProvider === 'dropbox'}
		<Field.Field>
			<Field.FieldLabel for="dropbox-key">Dropbox app key</Field.FieldLabel>
			<Input id="dropbox-key" bind:value={model.dropboxAppKey} autocomplete="off" />
			<Field.FieldDescription
				>Create a scoped Dropbox app with App Folder access. Noura uses PKCE and stores no app
				secret.</Field.FieldDescription
			>
		</Field.Field>
	{:else if model.syncProvider === 'onedrive'}
		<div class="field-row">
			<Field.Field
				><Field.FieldLabel for="onedrive-client">Microsoft client ID</Field.FieldLabel><Input
					id="onedrive-client"
					bind:value={model.oneDriveClientId}
					autocomplete="off"
				/></Field.Field
			>
			<Field.Field
				><Field.FieldLabel for="onedrive-tenant">Tenant</Field.FieldLabel><Input
					id="onedrive-tenant"
					bind:value={model.oneDriveTenantId}
					placeholder="common"
				/></Field.Field
			>
		</div>
		<Field.FieldDescription
			>Register a public/native application with Files.ReadWrite.AppFolder and offline_access.</Field.FieldDescription
		>
	{:else}
		<Field.Field>
			<Field.FieldLabel for="local-folder">Local sync folder</Field.FieldLabel>
			<InputGroup.Root>
				<InputGroup.Input
					id="local-folder"
					value={model.localSyncFolder}
					readonly
					placeholder="Choose a folder…"
				/>
				<InputGroup.Addon align="inline-end"
					><InputGroup.Button onclick={() => model.chooseLocalSyncFolder()}
						><FolderOpenIcon data-icon="inline-start" />Choose</InputGroup.Button
					></InputGroup.Addon
				>
			</InputGroup.Root>
			<Field.FieldDescription
				>Best for backup or a single writer. Concurrent devices should use another provider.</Field.FieldDescription
			>
		</Field.Field>
	{/if}

	<Field.Field>
		<Field.FieldLabel for="sync-password">Encryption password</Field.FieldLabel>
		<Input
			id="sync-password"
			type="password"
			bind:value={model.syncPassphrase}
			autocomplete="off"
			placeholder="At least 8 characters"
		/>
		<Field.FieldDescription
			>The same password is required on every device. It never leaves Noura.</Field.FieldDescription
		>
	</Field.Field>

	{#if model.oauthProvider === model.syncProvider}
		<Alert.Root class="oauth-result">
			<FolderIcon />
			<Alert.Title>Authorization opened in your browser</Alert.Title>
			<Alert.Description
				>Paste the returned code or the complete callback URL below.</Alert.Description
			>
		</Alert.Root>
		<Field.Field>
			<Field.FieldLabel for="oauth-code">Authorization result</Field.FieldLabel>
			<Input id="oauth-code" bind:value={model.oauthCode} autocomplete="off" />
		</Field.Field>
		<Button disabled={isBusy} onclick={() => model.finishOAuth()}
			>{#if isBusy}<Spinner data-icon="inline-start" />{/if}Finish authorization</Button
		>
	{:else if model.syncProvider === 'noura'}
		<Button disabled={isBusy} onclick={() => model.connectNouraSync()}
			>{#if isBusy}<Spinner data-icon="inline-start" />{/if}{isBusy
				? 'Connecting…'
				: 'Connect NouraSync'}</Button
		>
	{:else if model.syncProvider === 'webdav'}
		<Button disabled={isBusy} onclick={() => model.connectWebdav()}
			>{#if isBusy}<Spinner data-icon="inline-start" />{/if}{isBusy
				? 'Connecting…'
				: 'Connect WebDAV'}</Button
		>
	{:else if model.syncProvider === 'nextcloud'}
		<Button disabled={isBusy} onclick={() => model.connectNextcloud()}
			>{#if isBusy}<Spinner data-icon="inline-start" />{/if}{isBusy
				? 'Connecting…'
				: 'Connect Nextcloud'}</Button
		>
	{:else if model.syncProvider === 'dropbox'}
		<Button disabled={isBusy} onclick={() => model.beginDropboxAuth()}>Authorize Dropbox</Button>
	{:else if model.syncProvider === 'onedrive'}
		<Button disabled={isBusy} onclick={() => model.beginOneDriveAuth()}>Authorize OneDrive</Button>
	{:else}
		<Button disabled={isBusy} onclick={() => model.connectLocalFolder()}
			>{#if isBusy}<Spinner data-icon="inline-start" />{/if}{isBusy
				? 'Connecting…'
				: 'Use local folder'}</Button
		>
	{/if}

	{#if model.syncError}<Alert.Root variant="destructive"
			><Alert.Title>Sync could not connect</Alert.Title><Alert.Description
				>{model.syncError}</Alert.Description
			></Alert.Root
		>{/if}
	<p class="session-note">
		Provider credentials are held for this app session. A secure OS credential vault will be added
		before production release.
	</p>
</Field.FieldGroup>

<style>
	:global(.connection-summary) {
		align-items: center;
	}
	.device-line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-top: 10px;
		color: var(--muted-foreground);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	.sync-error {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--destructive);
	}
	.provider-icon :global(svg) {
		width: 19px;
	}
	:global(.provider-grid) {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
		margin: 18px 0;
	}
	:global(.provider-grid [data-slot='toggle-group-item']) {
		display: grid;
		grid-template-columns: 34px 1fr;
		height: auto;
		align-items: center;
		gap: 10px;
		padding: 10px;
		border: 1px solid var(--border);
		border-radius: 10px;
		text-align: left;
	}
	:global(.provider-grid [data-slot='toggle-group-item']:hover),
	:global(.provider-grid [data-slot='toggle-group-item'][data-state='on']) {
		border-color: color-mix(in srgb, var(--primary) 50%, var(--border));
		background: var(--accent);
	}
	:global(.provider-grid [data-state='on']) .provider-icon {
		background: var(--primary);
		color: var(--primary-foreground);
	}
	.provider-icon {
		width: 34px;
		height: 34px;
	}
	:global(.provider-grid strong),
	:global(.provider-grid small) {
		display: block;
	}
	:global(.provider-grid strong) {
		font-size: 12px;
	}
	:global(.provider-grid small) {
		margin-top: 2px;
		color: var(--muted-foreground);
		font-size: 10px;
	}
	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	:global(.oauth-result) {
		align-items: center;
	}
	.session-note {
		color: var(--muted-foreground);
		font-size: 10px;
		line-height: 1.45;
	}
	@media (max-width: 860px) {
		:global(.provider-grid) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.field-row {
			grid-template-columns: 1fr;
		}
	}
</style>
