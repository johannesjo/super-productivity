# CalDAV Features and Roadmap

## Overview

Super Productivity offers basic CalDAV integration for importing and syncing tasks. This document outlines the current capabilities and limitations of the integration. If you're a developer and would like to improve the integration help would be very welcome.

## Feature Support Matrix

| Feature                                       | Import     | Sync SP → CalDAV | Sync CalDAV → SP |
| --------------------------------------------- | ---------- | ---------------- | ---------------- |
| Title                                         | ✅         | ✅               | ❌               |
| Description                                   | ✅         | ❌               | ❌               |
| Tags                                          | ✅         | ❌               | ❌               |
| Complete/Incomplete Status                    | ✅         | ✅\*             | ❌               |
| New Tasks                                     | ✅         | ❌ [^3017]       | ✅\*             |
| Subtasks                                      | ✅ [^2876] | ❌               | ❌               |
| Deleted Tasks                                 | ❌         | ❌               | ❌ [^2915]       |
| Start Date                                    | ❌         | ❌               | ❌               |
| Due Date                                      | ❌         | ❌               | ❌               |
| Attachments                                   | ❌         | ❌               | ❌               |
| Recurrence Rules                              | ❌         | ❌               | ❌               |
| Created Time                                  | ❌         | ❌               | ❌               |
| Last Modified Time                            | ❌         | ❌               | ❌               |
| Status (Needs Action, In Progress, Cancelled) | ❌         | ❌               | ❌               |
| Priority                                      | ❌         | ❌               | ❌               |

\*Requires enabling in advanced configuration

## Current Features

### Advanced Config Options

- Auto import to Default Project (configurable per calendar)
- Poll imported for changes and notify (only supports new tasks, see above table)
- Automatically complete CalDAV todos on task completion

## Limitations

### Configuration Restrictions

- Each CalDAV calendar/list requires a separate configuration
- Cannot import from multiple calendars with a single configuration

## Future Development

### Note on Integration Roadmap

As [stated](https://github.com/johannesjo/super-productivity/issues/3017#issuecomment-2577469193) by the repository maintainer in Jan 2025:

> "It's important to understand that this will always be limited since CalDAV is likely not completely mappable to the model of Super Productivity. First step for this would be a feasibility analysis to check what parts of the model can be mapped and which not. Next step would be making a concept how this all could work."

### Developer Contributions Welcome

If you have experience with CalDAV development and are interested in improving this integration, your help would be greatly appreciated. Key areas that need attention include:

- Feasibility analysis of CalDAV-to-SP model mapping
- Integration architecture design
- Implementation of additional sync capabilities

Feel free to reach out if you'd like to contribute.

## Related Issues

[^2876]: [Import Multilevel Subtasks from CalDAV](https://github.com/johannesjo/super-productivity/issues/2876)

[^2915]: [CalDav task status and deleted tasks are not updated](https://github.com/johannesjo/super-productivity/issues/2915)

[^3017]: [Unable to upload new local tasks to CalDav](https://github.com/johannesjo/super-productivity/issues/3017)
