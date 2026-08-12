<script lang="ts">
	import CheckCircleIcon from '@lucide/svelte/icons/circle-check-big';
	import CloudOffIcon from '@lucide/svelte/icons/cloud-off';
	import LinkIcon from '@lucide/svelte/icons/link';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();

	const formatWhen = (ts?: number): string =>
		ts
			? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(ts)
			: '—';
</script>

<Dialog.Root bind:open={model.syncStatusOpen}>
	<Dialog.Content class="sync-status-dialog">
		<Dialog.Header>
			<Dialog.Title>Sync</Dialog.Title>
			<Dialog.Description
				>Encrypted cross-device sync, device identity, and conflict policy.</Dialog.Description
			>
		</Dialog.Header>
		<div class="rows">
			<div class="row">
				<span>Status</span><strong class:offline={model.syncStatus === 'offline'}
					>{model.syncStatus}
					{#if model.syncStatus === 'connected'}<CheckCircleIcon
						/>{:else if model.syncStatus === 'offline'}<CloudOffIcon />{/if}
				</strong>
			</div>
			<div class="row">
				<span>Provider</span><strong>{model.syncProviderLabel || 'Local-first'}</strong>
			</div>
			<div class="row">
				<span>This device</span><strong class="mono">{model.syncClientId}</strong>
			</div>
			<div class="row">
				<span>Last synced</span><strong>{formatWhen(model.lastSyncedAt)}</strong>
			</div>
			{#if model.syncError}<div class="row error">
					<span>Error</span><strong>{model.syncError}</strong>
				</div>{/if}
		</div>
		<div class="policy">
			<ShieldCheckIcon />
			<p>
				Conflicts resolve deterministically in sync-core: whole-entity last-write-wins with
				project-delete-wins barriers and a replay coordinator, all encrypted before transport.
				Tokens and passphrases never leave memory.
			</p>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (model.syncStatusOpen = false)}>Close</Button>
			<Button
				onclick={() => {
					model.syncStatusOpen = false;
					model.settingsOpen = true;
				}}><LinkIcon data-icon="inline-start" />Open sync settings</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.sync-status-dialog) {
		width: min(520px, calc(100vw - 32px));
	}
	.rows {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.row > span {
		color: var(--muted-foreground);
		font-size: 12px;
	}
	.row > strong {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 13px;
	}
	.row > strong :global(svg) {
		width: 15px;
		margin-left: 4px;
		color: #22c55e;
	}
	.row > strong.offline {
		color: var(--muted-foreground);
	}
	.row > strong.offline :global(svg) {
		color: var(--muted-foreground);
	}
	.row.error > strong {
		color: var(--destructive);
	}
	.mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 11px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.policy {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		margin-top: 16px;
		padding: 12px;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--muted);
	}
	.policy :global(svg) {
		width: 16px;
		flex: 0 0 auto;
		color: var(--primary);
	}
	.policy p {
		color: var(--muted-foreground);
		font-size: 11px;
		line-height: 1.55;
	}
</style>
