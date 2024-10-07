# super-productivity-android

Android App for Super Productivity (https://super-productivity.com/).

I am not an Android developer, so help would be very welcome!!

## Launch Modes

*This feature was added on October 7, 2024. See [Pull Request #57](https://github.com/johannesjo/super-productivity-android/pull/57).*

The app supports two launch modes:

1. **Offline Mode** (Recommended) – Use the app without an internet connection.
2. **Online Mode** – Connects to the production, local development, or self-hosted server.

### Configuring Launch Mode

To configure the launch mode, adjust the `LAUNCH_MODE` setting in the `app_config.properties` file:

- **0**: Default behavior (read from SharedPreferences)
- **1**: Force online mode (compatible mode)
- **2**: Force offline mode (new mode)

**Recommendation**: Set `LAUNCH_MODE` to `2` for Offline Mode.

### How to Adjust `LAUNCH_MODE`

1. Locate the `app_config.properties` file in the project's root directory.
2. Open the file in a text editor.
3. Find the `LAUNCH_MODE` setting and set it to your desired mode (`0`, `1`, or `2`).

```properties
LAUNCH_MODE=2
```

**Important**: The `app_config.properties` file is intended for local modifications only. **DO NOT COMMIT** this file unless you are absolutely sure of what you are doing.

### Detailed Configuration Guides

- **[Offline Mode Documentation (Recommended)](./README_OFFLINE.md)**: Step-by-step guide to setting up and building the app in Offline Mode.
- **[Online Mode Documentation](./README_ONLINE.md)**: Step-by-step guide to setting up and building the app in Online Mode.
