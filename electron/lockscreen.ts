import { exec } from 'child_process';

export const lockscreen = (cb?: (err: unknown, stdout: string) => void): void => {
  const lockCommands = {
    darwin:
      '(/System/Library/CoreServices/"Menu Extras"/User.menu/Contents/Resources/CGSession -suspend) || (osascript -e "tell application "System Events" to keystroke "q" using {control down, command down}")',
    win32: 'rundll32.exe user32.dll, LockWorkStation',
    linux:
      '(hash gnome-screensaver-command 2>/dev/null && gnome-screensaver-command -l) || (hash dm-tool 2>/dev/null && dm-tool lock) || (qdbus org.freedesktop.ScreenSaver /ScreenSaver Lock)',
  };

  const lockCommandToUse = lockCommands[
    process.platform as 'darwin' | 'win32' | 'linux'
  ] as any;
  if (!lockCommandToUse) {
    throw new Error(`lockscreen doesn't support your platform (${process.platform})`);
  } else {
    exec(lockCommandToUse, (err, stdout) => (cb ? cb(err, stdout) : null));
  }
};
