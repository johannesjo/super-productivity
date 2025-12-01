# Online-Only Mode (Compatibility Mode) Configuration

**Online-Only Mode (Compatibility Mode)** allows the Super Productivity Android app to connect to the production server, a local development server, or a self-hosted server. This mode requires an internet connection and is compatible with various server setups.

**Note**: While Online-Only Mode offers connectivity to production, local development, or self-hosted servers, it is highly recommended to use the latest **Connectivity-Free Mode** for a more stable and reliable experience. Connectivity-Free Mode allows you to use the app without an internet connection, ensuring uninterrupted productivity, enhanced privacy, and reduced latency.

For more information, refer to the **[Connectivity-Free Mode Documentation (Recommended)](./README_OFFLINE.md)**.

If you require online features or need to connect to specific servers, proceed with the Online-Only Mode configuration below.

## Setting Launch Mode to Online

To enable Online-Only Mode, set the `LAUNCH_MODE` to `1` or `0` in the `app_config.properties` file.

- **1**: Force Online-Only Mode (Compatibility Mode)
- **0**: Default behavior (read from SharedPreferences)

**Recommendation**: Set `LAUNCH_MODE` to `0` for default behavior. The app will use the default behavior, which may attempt to read from SharedPreferences and connect to online services if available.

### Configuration Options

1. **Launch Mode (`LAUNCH_MODE`)**

   ```properties
   LAUNCH_MODE=1
   ```

   - **0**: Default behavior (read from SharedPreferences)
   - **1**: Force Online-Only Mode (compatible mode)
   - **2**: Force Connectivity-Free Mode (for offline configuration)

2. **Use Production URL**

   - **Condition**: Applicable when `LAUNCH_MODE` is set to `1`, or set to `0` and the user has upgraded from a previous version.
   - **Default**: `https://app.super-productivity.com`
   - **Configuration**: Ensure `ONLINE_SERVICE_IS_LOCAL` is set to `false`.

   ```properties
   ONLINE_SERVICE_IS_LOCAL=false
   ```

3. **Use Local Development Server**

   - **Condition**: Applicable when `LAUNCH_MODE` is set to `1`, or set to `0` and the user has upgraded from a previous version.
   - **Configuration**: Set `ONLINE_SERVICE_IS_LOCAL` to `true` and start the local server.

   ```properties
   ONLINE_SERVICE_IS_LOCAL=true
   ```

   - **Start Local Server**

     ```bash
     ng serve --disable-host-check --host 0.0.0.0 --port 4200 --live-reload --watch
     ```

   - **Access URL**: `http://10.0.2.2:4200` (accessible from the Android Studio emulator and emulator's Chrome browser).

4. **Use a Self-Hosted Server**

   - **Condition**: Applicable when `LAUNCH_MODE` is set to `1`, or set to `0` and the user has upgraded from a previous version.
   - **Configuration**: Set `ONLINE_SERVICE_IS_LOCAL` to `false` and update `ONLINE_SERVICE_HOST` and `ONLINE_SERVICE_PROTOCOL`.

   ```properties
   ONLINE_SERVICE_IS_LOCAL=false
   ONLINE_SERVICE_HOST=your.server.address
   ONLINE_SERVICE_PROTOCOL=https
   ```

## How to Modify the URL

You can edit the URL that the web view loads by modifying the `app_config.properties` file located in the project's root directory. This allows you to easily switch between a production server, a local development server, or a self-hosted server.

### Relevant Settings

- **`LAUNCH_MODE`**:

  - `0`: Default behavior (read from SharedPreferences)
  - `1`: Force Online-Only Mode
  - `2`: Force Connectivity-Free Mode

- **When `LAUNCH_MODE` is `1` or `0` (with upgrade)**:
  - **`ONLINE_SERVICE_IS_LOCAL`**:
    - `true`: Load from local development server (`http://10.0.2.2:4200`).
    - `false`: Load from production or self-hosted server.
  - **`ONLINE_SERVICE_HOST`**:
    - Defines the server's address.
  - **`ONLINE_SERVICE_PROTOCOL`**:
    - `http` or `https`.

## Important Notes

- **Local Modifications**: The `app_config.properties` file is intended for local modifications only. **DO NOT COMMIT** this file unless you are absolutely sure of the changes.
- **Switching Servers**: By configuring these properties, you can seamlessly switch between default, online, and offline launch behaviors without making direct changes to your Kotlin source files, improving your development workflow and offering flexibility in deployment.
