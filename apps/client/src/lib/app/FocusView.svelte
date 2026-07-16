<script lang="ts">
	import { onDestroy } from 'svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Volume2Icon from '@lucide/svelte/icons/volume-2';
	import VolumeXIcon from '@lucide/svelte/icons/volume-x';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	let mode = $state('pomodoro');
	let running = $state(false);
	let elapsed = $state(0);
	let segmentStartElapsed = 0;
	let soundEnabled = $state(true);
	let manualOpen = $state(false);
	let manualMinutes = $state(25);
	let timer: ReturnType<typeof setInterval> | undefined;
	let target = $derived(mode === 'pomodoro' ? 25 * 60 : 0);
	let displaySeconds = $derived(mode === 'pomodoro' ? Math.max(0, target - elapsed) : elapsed);
	let display = $derived(
		`${String(Math.floor(displaySeconds / 60)).padStart(2, '0')}:${String(displaySeconds % 60).padStart(2, '0')}`
	);
	const todayStart = new SvelteDate().setHours(0, 0, 0, 0);
	let sessions = $derived(Object.values(model.state.sessions));
	let todaySessions = $derived(sessions.filter((session) => session.startedAt >= todayStart));
	let todayFocusMs = $derived(
		todaySessions.reduce((total, session) => total + session.durationMs, 0)
	);
	let totalFocusMs = $derived(sessions.reduce((total, session) => total + session.durationMs, 0));

	function playCompletionSound(): void {
		if (!soundEnabled || typeof window === 'undefined') return;
		const context = new AudioContext();
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		oscillator.frequency.value = 660;
		gain.gain.setValueAtTime(0.08, context.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
		oscillator.connect(gain).connect(context.destination);
		oscillator.start();
		oscillator.stop(context.currentTime + 0.35);
		oscillator.addEventListener('ended', () => void context.close(), { once: true });
	}

	async function toggle(): Promise<void> {
		if (!running) {
			await model.startFocusSession(mode as 'pomodoro' | 'flowtime' | 'stopwatch');
			segmentStartElapsed = elapsed;
			running = true;
			timer = setInterval(() => {
				elapsed += 1;
				if (mode === 'pomodoro' && elapsed >= target) {
					if (timer) clearInterval(timer);
					running = false;
					void model.stopFocusSession((elapsed - segmentStartElapsed) * 1000);
					playCompletionSound();
				}
			}, 1000);
		} else {
			running = false;
			if (timer) clearInterval(timer);
			await model.stopFocusSession((elapsed - segmentStartElapsed) * 1000);
		}
	}

	async function changeMode(value: string): Promise<void> {
		if (running) await model.stopFocusSession((elapsed - segmentStartElapsed) * 1000);
		mode = value;
		elapsed = 0;
		running = false;
		if (timer) clearInterval(timer);
	}

	async function resetTimer(): Promise<void> {
		if (running) await model.stopFocusSession((elapsed - segmentStartElapsed) * 1000);
		if (timer) clearInterval(timer);
		running = false;
		elapsed = 0;
		segmentStartElapsed = 0;
	}

	async function addManualRecord(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		await model.recordFocusSession(
			mode as 'pomodoro' | 'flowtime' | 'stopwatch',
			Math.max(1, manualMinutes) * 60_000
		);
		manualOpen = false;
	}

	onDestroy(() => {
		if (timer) clearInterval(timer);
		if (running) void model.stopFocusSession((elapsed - segmentStartElapsed) * 1000);
	});
</script>

<section class="focus-view" aria-labelledby="focus-title">
	<div class="timer-pane">
		<header>
			<h1 id="focus-title">Focus</h1>
			<Tabs.Root value={mode} onValueChange={(value) => void changeMode(value)}
				><Tabs.List
					><Tabs.Trigger value="pomodoro">Pomo</Tabs.Trigger><Tabs.Trigger value="flowtime"
						>Flowtime</Tabs.Trigger
					><Tabs.Trigger value="stopwatch">Stopwatch</Tabs.Trigger></Tabs.List
				></Tabs.Root
			>
			<div class="timer-tools">
				<Button
					variant="ghost"
					size="icon"
					aria-label="Add focus record"
					onclick={() => (manualOpen = true)}><PlusIcon /></Button
				><Button
					variant="ghost"
					size="icon"
					aria-label={soundEnabled ? 'Mute completion sound' : 'Enable completion sound'}
					aria-pressed={!soundEnabled}
					onclick={() => (soundEnabled = !soundEnabled)}
					>{#if soundEnabled}<Volume2Icon />{:else}<VolumeXIcon />{/if}</Button
				><DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Button variant="ghost" size="icon" aria-label="Focus options"
							><MoreHorizontalIcon /></Button
						>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Item onclick={() => void resetTimer()}>Reset timer</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</header>
		<button class="focus-task" type="button" onclick={() => (model.searchOpen = true)}
			>{model.selectedTask?.title ?? 'Choose a task to focus on'} →</button
		>
		<div class:running class="timer-ring"><span>{display}</span></div>
		<Button class="start-button" size="lg" onclick={() => void toggle()}
			>{running ? 'Pause' : elapsed ? 'Resume' : 'Start'}</Button
		>
	</div>
	<div class="overview-pane">
		<h2>Overview</h2>
		<div class="stats">
			<Card.Root
				><Card.Header
					><Card.Description>Today's sessions</Card.Description><Card.Title
						>{todaySessions.length}</Card.Title
					></Card.Header
				></Card.Root
			>
			<Card.Root
				><Card.Header
					><Card.Description>Today's focus</Card.Description><Card.Title
						>{Math.round(todayFocusMs / 60_000)} <small>m</small></Card.Title
					></Card.Header
				></Card.Root
			>
			<Card.Root
				><Card.Header
					><Card.Description>Total sessions</Card.Description><Card.Title
						>{sessions.length}</Card.Title
					></Card.Header
				></Card.Root
			>
			<Card.Root
				><Card.Header
					><Card.Description>Total focus</Card.Description><Card.Title
						>{Math.round(totalFocusMs / 60_000)} <small>m</small></Card.Title
					></Card.Header
				></Card.Root
			>
		</div>
		<div class="record-title">
			<h2>Focus record</h2>
			<Button
				variant="ghost"
				size="icon"
				aria-label="Add focus record"
				onclick={() => (manualOpen = true)}><PlusIcon /></Button
			>
		</div>
		{#if sessions.length}
			<div class="focus-records">
				{#each sessions.slice().reverse().slice(0, 12) as session (session.id)}
					<div>
						<span>{session.mode}</span><strong
							>{Math.max(1, Math.round(session.durationMs / 60_000))} min</strong
						>
					</div>
				{/each}
			</div>
		{:else}<div class="record-empty">
				<div class="bottle">◒</div>
				<p>No focus records yet</p>
				<span>Completed focus sessions appear here.</span>
			</div>{/if}
	</div>
</section>

<Dialog.Root bind:open={manualOpen}>
	<Dialog.Content>
		<form class="manual-record" onsubmit={addManualRecord}>
			<Dialog.Header>
				<Dialog.Title>Add focus record</Dialog.Title>
				<Dialog.Description
					>Record focused time that happened away from the timer.</Dialog.Description
				>
			</Dialog.Header>
			<Field.Field>
				<Field.FieldLabel for="focus-minutes">Duration in minutes</Field.FieldLabel>
				<Input id="focus-minutes" type="number" min="1" bind:value={manualMinutes} />
			</Field.Field>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (manualOpen = false)}>Cancel</Button>
				<Button type="submit">Add record</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<style>
	.focus-view {
		display: grid;
		height: 100%;
		grid-template-columns: minmax(520px, 1.3fr) minmax(380px, 1fr);
	}
	.timer-pane,
	.overview-pane {
		min-width: 0;
		padding: 26px 28px;
	}
	.timer-pane {
		display: flex;
		align-items: center;
		flex-direction: column;
		border-right: 1px solid var(--border);
	}
	.timer-pane header {
		display: grid;
		width: 100%;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
	}
	h1,
	h2 {
		font-size: 20px;
		font-weight: 650;
		letter-spacing: -0.02em;
	}
	.timer-tools {
		display: flex;
		justify-content: flex-end;
		gap: 2px;
	}
	.focus-task {
		margin-top: 140px;
		color: var(--muted-foreground);
		font-size: 13px;
	}
	.timer-ring {
		display: grid;
		width: min(40vw, 390px);
		aspect-ratio: 1;
		margin-top: 70px;
		place-content: center;
		border: 5px solid var(--muted);
		border-radius: 999px;
		transition: border-color 200ms ease;
	}
	.timer-ring.running {
		border-color: color-mix(in oklch, var(--primary) 75%, var(--muted));
	}
	.timer-ring span {
		font-size: 58px;
		font-weight: 320;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.05em;
	}
	:global(.start-button) {
		width: 200px;
		margin-top: 70px;
	}
	.stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
		margin-top: 24px;
	}
	.stats :global([data-slot='card']) {
		border: 0;
		box-shadow: none;
	}
	.stats small {
		font-size: 13px;
		color: var(--muted-foreground);
	}
	.record-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 62px;
	}
	.record-empty {
		display: grid;
		min-height: 430px;
		place-content: center;
		text-align: center;
		color: var(--muted-foreground);
	}
	.focus-records {
		display: flex;
		margin-top: 20px;
		flex-direction: column;
		gap: 8px;
	}
	.focus-records > div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px;
		border: 1px solid var(--border);
		border-radius: 10px;
		text-transform: capitalize;
	}
	.manual-record {
		display: grid;
		gap: 20px;
	}
	.bottle {
		margin: 0 auto 20px;
		display: grid;
		width: 90px;
		height: 70px;
		place-content: center;
		border-radius: 30px;
		background: var(--muted);
		color: var(--primary);
		font-size: 34px;
	}
	.record-empty p {
		color: var(--foreground);
		font-size: 14px;
	}
	.record-empty span {
		margin-top: 5px;
		font-size: 12px;
	}
	@media (max-width: 900px) {
		.focus-view {
			grid-template-columns: 1fr;
			overflow: auto;
		}
		.overview-pane {
			border-top: 1px solid var(--border);
		}
		.focus-task {
			margin-top: 70px;
		}
	}
</style>
