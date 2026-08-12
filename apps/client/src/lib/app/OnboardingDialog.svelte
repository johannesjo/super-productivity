<script lang="ts">
	import CheckSquareIcon from '@lucide/svelte/icons/square-check-big';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import TimerIcon from '@lucide/svelte/icons/timer';
	import SearchIcon from '@lucide/svelte/icons/search';
	import KeyboardIcon from '@lucide/svelte/icons/keyboard';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();
	let step = $state(0);

	const steps = [
		{
			icon: CheckSquareIcon,
			title: 'Capture quickly',
			body: 'Type into the quick-add field and press Enter. Syntax like #tag, @project, due:tomorrow, and p2 set details in one line.'
		},
		{
			icon: CalendarDaysIcon,
			title: 'Plan the day and week',
			body: 'The Planner and Schedule views let you drag work onto days; repeats and your calendar feed land there too.'
		},
		{
			icon: TimerIcon,
			title: 'Focus with a timer',
			body: 'Pomodoro, flowtime, and stopwatch run fully offline. Sompleted sessions become timesheet rows automatically.'
		},
		{
			icon: SearchIcon,
			title: 'Search everything',
			body: 'Press ⌘K / Ctrl+K to search tasks, notes, tags, projects, and commands from one dialog.'
		},
		{
			icon: KeyboardIcon,
			title: 'Adjust to taste',
			body: 'Settings persist themes, language, and shortcuts; export an encrypted or plain backup any time.'
		}
	];

	const current = $derived(steps[Math.min(step, steps.length - 1)]);

	async function finish(): Promise<void> {
		await model.completeOnboarding();
		step = 0;
		model.onboardingOpen = false;
	}
</script>

<Dialog.Root bind:open={model.onboardingOpen}>
	<Dialog.Content class="onboarding-dialog">
		<Dialog.Header>
			<Dialog.Title>Welcome to Noura</Dialog.Title>
			<Dialog.Description>A short tour of the quiet local-first workspace.</Dialog.Description>
		</Dialog.Header>
		<div class="onboarding-body">
			<div class="progress">
				{#each steps as item, index (index)}<span class:active={index === step}></span>{/each}
			</div>
			<div class="step">
				<current.icon />
				<h3>{current.title}</h3>
				<p>{current.body}</p>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (model.onboardingOpen = false)}>Skip</Button>
			{#if step < steps.length - 1}
				<Button onclick={() => (step += 1)}>Next</Button>
			{:else}<Button onclick={() => void finish()}>Get started</Button>{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.onboarding-dialog) {
		width: min(520px, calc(100vw - 32px));
	}
	.onboarding-body {
		display: flex;
		flex-direction: column;
		gap: 18px;
		min-height: 150px;
	}
	.progress {
		display: flex;
		gap: 6px;
	}
	.progress span {
		height: 4px;
		flex: 1;
		border-radius: 2px;
		background: var(--muted);
	}
	.progress span.active {
		background: var(--primary);
	}
	.step {
		display: flex;
		align-items: center;
		flex-direction: column;
		text-align: center;
	}
	.step :global(svg) {
		width: 34px;
		height: 34px;
		margin-bottom: 12px;
		color: var(--primary);
	}
	.step h3 {
		margin-bottom: 8px;
		font-size: 16px;
	}
	.step p {
		max-width: 380px;
		color: var(--muted-foreground);
		font-size: 13px;
		line-height: 1.55;
	}
</style>
