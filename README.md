# super-productivity-android

Android App for Super Productivity (https://super-productivity.com/).

I am not an Android developer, so help would be very welcome!!

## Building locally

*This feature was added on September 7, 2024. See [Pull Request #51](https://github.com/johannesjo/super-productivity-android/pull/51).*

To build this app locally, you can configure the URL that the web view loads by modifying the `app_config.properties` file. This allows you to easily switch between a local development server, the production server, or a self-hosted server without changing the source code directly.

> **IMPORTANT**: The `app_config.properties` file is intended for LOCAL MODIFICATIONS ONLY.  
> **DO NOT COMMIT** this file unless you are absolutely sure of what you are doing.  

### Configuration Options

1. **Use Production URL**:
    - By default, the app points to the production URL `https://app.super-productivity.com`.
    - To use this, ensure the `SERVICE_IS_LOCAL` setting in `app_config.properties` is set to `false`.

2. **Use Local Development Server**:
    - If you're running the [super productivity](https://github.com/johannesjo/super-productivity) app locally, you can point the web view to your local server.
    - Set the `SERVICE_IS_LOCAL` setting in `app_config.properties` to `true`.
    - Start the local web app using the following command:
      ```bash
      ng serve --disable-host-check --host 0.0.0.0 --port 4200 --live-reload --watch
      ```
    - This makes the web app accessible from the Android Studio emulator at `http://10.0.2.2:4200`. The URL should also work in the emulator's Chrome browser.

3. **Use a Self-Hosted Server**: `NEW FEATURE`
    - If you prefer to self-host the web app, you can configure the app to point to your own server.
    - Set the `SERVICE_IS_LOCAL` setting to `false` and update the `SERVICE_HOST` and `SERVICE_PROTOCOL` values in the `app_config.properties` file to point to your self-hosted environment.

### How to Modify the URL

You can edit the URL that the web view loads by modifying the `app_config.properties` file located in the project's root directory. This allows you to easily switch between a production server, a local development server, or a self-hosted server. Here's how the relevant settings work:

- `SERVICE_IS_LOCAL`:
    - Set to `true` to load the web app from your local development server (`http://10.0.2.2:4200`).
    - Set to `false` to load the production web app (`https://app.super-productivity.com`) or your self-hosted server.

- `SERVICE_HOST`:
    - Defines the server's address.
    - If `SERVICE_IS_LOCAL` is `true`, this value is ignored, and the app uses `10.0.2.2:4200` instead.
    - If `SERVICE_IS_LOCAL` is `false`, this value determines the server the app will connect to, making it possible to connect to a self-hosted server.

- `SERVICE_PROTOCOL`:
    - Defines the protocol used (`http` or `https`).
    - When `SERVICE_IS_LOCAL` is `true`, the default is `http`.
    - When `SERVICE_IS_LOCAL` is `false`, the app uses the protocol specified in this property, which can be set for self-hosted environments.

### Example `app_config.properties` file:

```properties
# Use 'true' to point to the local server, 'false' to use the production server or self-hosted server
SERVICE_IS_LOCAL=true

# The server address (ignored if SERVICE_IS_LOCAL is true)
# Set this to your self-hosted server address if SERVICE_IS_LOCAL is false
SERVICE_HOST=app.super-productivity.com:1234

# The protocol to use (http or https)
SERVICE_PROTOCOL=https
```

By configuring these properties, you can seamlessly switch between local development, production, and self-hosted environments without making direct changes to your Kotlin source files, improving your development workflow and offering flexibility in deployment.

You can edit the properties in the `app_config.properties` file [here](https://github.com/johannesjo/super-productivity-android/blob/master/app/app_config.properties).