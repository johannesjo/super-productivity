<script lang="ts">
	import type { ISODate, TaskStatus } from '@noura/domain';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import type { NouraModel } from './model.svelte';

	let { model }: { model: NouraModel } = $props();

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		await model.commitTaskCapture();
	}
</script>

<Dialog.Root bind:open={model.taskCaptureOpen}>
	<Dialog.Content class="task-capture-dialog">
		<form onsubmit={submit}>
			<Dialog.Header>
				<Dialog.Title>Add task</Dialog.Title>
				<Dialog.Description
					>Capture the task now; refine its details whenever you need.</Dialog.Description
				>
			</Dialog.Header>
			<Field.FieldGroup>
				<Field.Field>
					<Field.FieldLabel for="capture-title">Task</Field.FieldLabel>
					<Input
						id="capture-title"
						bind:value={model.taskCaptureTitle}
						placeholder="What needs to be done?"
						autofocus
					/>
				</Field.Field>
				<div class="capture-details">
					<Field.Field>
						<Field.FieldLabel for="capture-date">Due date</Field.FieldLabel>
						<Input
							id="capture-date"
							type="date"
							value={model.taskCaptureDueDay ?? ''}
							onchange={(event) =>
								(model.taskCaptureDueDay = event.currentTarget.value
									? (event.currentTarget.value as ISODate)
									: undefined)}
						/>
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel>Project</Field.FieldLabel>
						<Select.Root type="single" bind:value={model.taskCaptureProjectId}>
							<Select.Trigger
								>{model.state.projects[model.taskCaptureProjectId]?.title}</Select.Trigger
							>
							<Select.Content>
								<Select.Group>
									{#each Object.values(model.state.projects) as project (project.id)}
										<Select.Item value={project.id}>{project.title}</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel>Status</Field.FieldLabel>
						<Select.Root
							type="single"
							value={model.taskCaptureStatus}
							onValueChange={(value) => (model.taskCaptureStatus = value as TaskStatus)}
						>
							<Select.Trigger
								>{model.taskCaptureStatus === 'done' ? 'Completed' : 'Open'}</Select.Trigger
							>
							<Select.Content>
								<Select.Group>
									<Select.Item value="open">Open</Select.Item>
									<Select.Item value="done">Completed</Select.Item>
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</Field.Field>
				</div>
			</Field.FieldGroup>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (model.taskCaptureOpen = false)}
					>Cancel</Button
				>
				<Button type="submit" disabled={!model.taskCaptureTitle.trim()}>Add task</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.task-capture-dialog) {
		width: min(620px, calc(100vw - 32px));
	}
	form,
	.capture-details {
		display: grid;
		gap: 20px;
	}
	.capture-details {
		grid-template-columns: 1.2fr 1fr 1fr;
	}
	@media (max-width: 620px) {
		.capture-details {
			grid-template-columns: 1fr;
		}
	}
</style>
