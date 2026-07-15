<script lang="ts">
	import BellIcon from '@lucide/svelte/icons/bell';
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import CloudIcon from '@lucide/svelte/icons/cloud';
	import KeyboardIcon from '@lucide/svelte/icons/keyboard';
	import LinkIcon from '@lucide/svelte/icons/link';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import ShieldIcon from '@lucide/svelte/icons/shield-check';
	import UserIcon from '@lucide/svelte/icons/user-round';
	import { INTEGRATIONS, type IntegrationDefinition } from '@noura/integrations';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	let section = $state('general');
	let integrationOpen = $state(false);
	let selectedIntegration = $state<IntegrationDefinition>();
	let integrationEndpoint = $state('');
	let integrationCredential = $state('');
	let configuredIntegrations = $state<string[]>([]);
	const sections = [
		{ id: 'general', label: 'General', icon: MonitorIcon },
		{ id: 'account', label: 'Account & sync', icon: UserIcon },
		{ id: 'appearance', label: 'Appearance', icon: PaletteIcon },
		{ id: 'date', label: 'Date & time', icon: CalendarClockIcon },
		{ id: 'notifications', label: 'Notifications', icon: BellIcon },
		{ id: 'integrations', label: 'Integrations', icon: LinkIcon },
		{ id: 'privacy', label: 'Privacy & backup', icon: ShieldIcon },
		{ id: 'shortcuts', label: 'Shortcuts', icon: KeyboardIcon }
	];

	function configureIntegration(integration: IntegrationDefinition): void {
		selectedIntegration = integration;
		integrationEndpoint = '';
		integrationCredential = '';
		integrationOpen = true;
	}

	function saveIntegration(): void {
		if (!selectedIntegration) return;
		if (!configuredIntegrations.includes(selectedIntegration.id))
			configuredIntegrations = [...configuredIntegrations, selectedIntegration.id];
		integrationCredential = '';
		integrationOpen = false;
	}
</script>

<Dialog.Root bind:open={model.settingsOpen}>
	<Dialog.Content class="settings-dialog" showCloseButton>
		<Dialog.Header class="sr-only"
			><Dialog.Title>Settings</Dialog.Title><Dialog.Description>Configure Noura</Dialog.Description
			></Dialog.Header
		>
		<div class="settings-shell">
			<aside>
				<h2>Settings</h2>
				<nav aria-label="Settings sections">
					{#each sections as item (item.id)}<button
							class:active={section === item.id}
							type="button"
							onclick={() => (section = item.id)}><item.icon />{item.label}</button
						>{/each}
				</nav>
			</aside>
			<main>
				{#if section === 'general'}
					<header>
						<h2>General</h2>
						<p>Choose calm defaults for capture, task behavior, and startup.</p>
					</header>
					<Field.FieldGroup>
						<Field.Field orientation="horizontal"
							><Field.FieldContent
								><Field.FieldTitle>Start at login</Field.FieldTitle><Field.FieldDescription
									>Open Noura quietly when your computer starts.</Field.FieldDescription
								></Field.FieldContent
							><Switch /></Field.Field
						>
						<Field.Field orientation="horizontal"
							><Field.FieldContent
								><Field.FieldTitle>Default task view</Field.FieldTitle><Field.FieldDescription
									>The view shown when Noura opens.</Field.FieldDescription
								></Field.FieldContent
							><Select.Root type="single" value="today"
								><Select.Trigger>Today</Select.Trigger><Select.Content
									><Select.Group
										><Select.Item value="today">Today</Select.Item><Select.Item value="inbox"
											>Inbox</Select.Item
										><Select.Item value="upcoming">Upcoming</Select.Item></Select.Group
									></Select.Content
								></Select.Root
							></Field.Field
						>
						<Field.Field orientation="horizontal"
							><Field.FieldContent
								><Field.FieldTitle>Show completed tasks</Field.FieldTitle><Field.FieldDescription
									>Keep completed items visible in task lists.</Field.FieldDescription
								></Field.FieldContent
							><Switch bind:checked={model.completedVisible} /></Field.Field
						>
					</Field.FieldGroup>
				{:else if section === 'account'}
					<header>
						<h2>Account & sync</h2>
						<p>Use Noura fully offline or connect the retained encrypted SuperSync stack.</p>
					</header>
					<div class="sync-card">
						<CloudIcon />
						<div>
							<strong
								>{model.syncStatus === 'connected'
									? 'Encrypted sync connected'
									: 'Local-first mode'}</strong
							>
							<p>
								Your data is stored on this device. Add SuperSync credentials only when you want
								encrypted cross-device sync.
							</p>
						</div>
						{#if model.syncStatus === 'connected'}
							<Button variant="outline" onclick={() => model.disconnectSuperSync()}
								>Disconnect</Button
							>
						{:else}
							<Button
								disabled={model.syncStatus === 'connecting'}
								onclick={() => model.connectSuperSync()}
								>{model.syncStatus === 'connecting' ? 'Connecting…' : 'Connect SuperSync'}</Button
							>
						{/if}
					</div>
					<Separator />
					<Field.FieldGroup>
						<Field.Field>
							<Field.FieldLabel for="server-url">SuperSync server</Field.FieldLabel>
							<Input
								id="server-url"
								bind:value={model.syncServerUrl}
								placeholder="https://sync.example.com"
							/>
							<Field.FieldDescription
								>Use the hosted endpoint or your existing self-hosted server.</Field.FieldDescription
							>
						</Field.Field>
						<Field.Field>
							<Field.FieldLabel for="access-token">Access token</Field.FieldLabel>
							<Input
								id="access-token"
								type="password"
								bind:value={model.syncAccessToken}
								autocomplete="off"
								placeholder="Paste a SuperSync JWT"
							/>
							<Field.FieldDescription
								>Kept in memory for this session and never written to localStorage.</Field.FieldDescription
							>
						</Field.Field>
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
								>Used locally to encrypt and decrypt operation payloads.</Field.FieldDescription
							>
						</Field.Field>
						{#if model.syncError}<p class="sync-error" role="alert">{model.syncError}</p>{/if}
					</Field.FieldGroup>
				{:else if section === 'integrations'}
					<header>
						<h2>Integrations</h2>
						<p>Compiled-in providers replace the runtime plugin platform.</p>
					</header>
					<div class="integration-list">
						{#each INTEGRATIONS as integration (integration.id)}<div>
								<div class="provider-mark">{integration.title.slice(0, 1)}</div>
								<span
									><strong>{integration.title}</strong><small
										>{integration.kind} · {integration.auth}</small
									></span
								><Button
									variant="outline"
									size="sm"
									onclick={() => configureIntegration(integration)}
									>{configuredIntegrations.includes(integration.id)
										? 'Configured'
										: 'Configure'}</Button
								>
							</div>{/each}
					</div>
				{:else if section === 'privacy'}
					<header>
						<h2>Privacy & backup</h2>
						<p>
							Noura has no analytics. Export portable local data or restore a compatible backup;
							legacy plugin records are ignored.
						</p>
					</header>
					<div class="backup-actions">
						<Button onclick={() => model.exportBackup()}>Export backup</Button><Button
							variant="outline"
							onclick={() => model.importBackup()}>Import backup</Button
						>
					</div>
					<Field.FieldGroup
						><Field.Field orientation="horizontal"
							><Field.FieldContent
								><Field.FieldTitle>Encrypt remote sync</Field.FieldTitle><Field.FieldDescription
									>SuperSync always uses AES-256-GCM with an Argon2id-derived key.</Field.FieldDescription
								></Field.FieldContent
							><Switch checked disabled /></Field.Field
						></Field.FieldGroup
					>
				{:else}
					<header>
						<h2>{sections.find((item) => item.id === section)?.label}</h2>
						<p>This section uses privacy-preserving local defaults and explicit opt-in controls.</p>
					</header>
					<Field.FieldGroup
						><Field.Field orientation="horizontal"
							><Field.FieldContent
								><Field.FieldTitle>Enable this feature</Field.FieldTitle><Field.FieldDescription
									>Changes are stored locally and can be included in encrypted sync.</Field.FieldDescription
								></Field.FieldContent
							><Switch /></Field.Field
						></Field.FieldGroup
					>
				{/if}
			</main>
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={integrationOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Configure {selectedIntegration?.title}</Dialog.Title>
			<Dialog.Description>
				Credentials are kept in memory. Provider adapters are compiled into Noura.
			</Dialog.Description>
		</Dialog.Header>
		<Field.FieldGroup>
			<Field.Field>
				<Field.FieldLabel for="integration-endpoint">Server or workspace URL</Field.FieldLabel>
				<Input id="integration-endpoint" bind:value={integrationEndpoint} placeholder="https://…" />
			</Field.Field>
			{#if selectedIntegration?.auth !== 'none'}
				<Field.Field>
					<Field.FieldLabel for="integration-credential"
						>{selectedIntegration?.auth === 'basic' ? 'Password' : 'Access token'}</Field.FieldLabel
					>
					<Input
						id="integration-credential"
						type="password"
						bind:value={integrationCredential}
						autocomplete="off"
					/>
				</Field.Field>
			{/if}
		</Field.FieldGroup>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (integrationOpen = false)}>Cancel</Button>
			<Button onclick={saveIntegration}>Save connection</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.settings-dialog) {
		width: min(1120px, calc(100vw - 48px));
		max-width: none;
		height: min(780px, calc(100vh - 48px));
		padding: 0;
		overflow: hidden;
	}
	.settings-shell {
		display: grid;
		height: 100%;
		grid-template-columns: 280px 1fr;
	}
	aside {
		padding: 28px 14px;
		background: var(--muted);
		border-right: 1px solid var(--border);
	}
	aside h2,
	main h2 {
		font-size: 20px;
		font-weight: 650;
	}
	nav {
		display: flex;
		margin-top: 18px;
		flex-direction: column;
		gap: 3px;
	}
	nav button {
		display: flex;
		width: 100%;
		height: 40px;
		align-items: center;
		gap: 11px;
		padding: 0 12px;
		border-radius: 9px;
		color: var(--muted-foreground);
		font-size: 13px;
		text-align: left;
	}
	nav button:hover,
	nav button.active {
		background: var(--accent);
		color: var(--foreground);
	}
	nav :global(svg) {
		width: 17px;
	}
	main {
		overflow: auto;
		padding: 38px 44px;
	}
	main header {
		margin-bottom: 34px;
	}
	main header p,
	.sync-card p {
		margin-top: 6px;
		color: var(--muted-foreground);
		font-size: 12px;
		line-height: 1.5;
	}
	.sync-card {
		display: grid;
		grid-template-columns: 40px 1fr auto;
		align-items: center;
		gap: 16px;
		padding: 20px;
		border: 1px solid var(--border);
		border-radius: 12px;
	}
	.sync-card > :global(svg) {
		width: 24px;
		color: var(--primary);
	}
	.sync-error {
		color: var(--destructive);
		font-size: 12px;
	}
	.integration-list {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.integration-list > div {
		display: grid;
		grid-template-columns: 36px 1fr auto;
		align-items: center;
		gap: 10px;
		min-height: 58px;
		padding: 9px 12px;
		border: 1px solid var(--border);
		border-radius: 10px;
	}
	.provider-mark {
		display: grid;
		width: 32px;
		height: 32px;
		place-content: center;
		border-radius: 9px;
		background: var(--muted);
		font-weight: 700;
	}
	.integration-list span {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.integration-list strong {
		font-size: 12px;
	}
	.integration-list small {
		color: var(--muted-foreground);
		font-size: 10px;
		text-transform: capitalize;
	}
	.backup-actions {
		display: flex;
		gap: 10px;
		margin-bottom: 30px;
	}
	@media (max-width: 760px) {
		.settings-shell {
			grid-template-columns: 1fr;
		}
		aside {
			border-right: 0;
			border-bottom: 1px solid var(--border);
		}
		nav {
			overflow: auto;
			flex-direction: row;
		}
		nav button {
			min-width: max-content;
		}
		main {
			padding: 24px 20px;
		}
		.sync-card {
			grid-template-columns: 40px minmax(0, 1fr);
		}
		.sync-card > :global(button) {
			grid-column: 1 / -1;
		}
		.integration-list {
			grid-template-columns: 1fr;
		}
	}
</style>
