# Migrating from Super Productivity

1. In Super Productivity, create a complete JSON backup.
2. In Noura, open Settings → Backups.
3. Choose Import backup and select the JSON file.
4. Review imported projects, tags, completed tasks, and linked issues before replacing the old installation.

Noura maps projects, tags, live and archived tasks, notes, completion, priority, due dates, reminders, repeat references, estimates, tracked duration, subtasks/checklists, attachments, and issue-provider metadata. `INBOX_PROJECT` is normalized to Noura's Inbox.

Plugin state is ignored because Noura has no runtime plugin platform. Features intentionally outside the product scope—Brain Dump, Doc Mode, Todoist import, Automations, AI prompts, Procrastination Buster, Voice Reminder, Yesterday Tasks, sync.md, iOS, and Android—are not migrated as active features.

The import is local and does not upload the source file. Export a fresh Noura backup after verifying the result.
