/**
 * Type declarations for environment variables.
 * Add your environment variable types here.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    // Example environment variables - add your own here
    GOOGLE_DRIVE_TOKEN?: string;
    DROPBOX_API_KEY?: string;
    WEBDAV_URL?: string;
    WEBDAV_USERNAME?: string;
    WEBDAV_PASSWORD?: string;

    // Add more environment variables as needed
    [key: string]: string | undefined;
  }
}

// Ensure process is available globally in the browser
declare const process: {
  env: NodeJS.ProcessEnv;
};
