import { exec } from 'child_process';

export default (cb?, customCommands?) => {
  const lockCommands = customCommands || {
    darwin:
      '/System/Library/CoreServices/"Menu Extras"/User.menu/Contents/Resources/CGSession -suspend',
    win32: 'rundll32.exe user32.dll, LockWorkStation',
    linux:
      '(hash gnome-screensaver-command 2>/dev/null && gnome-screensaver-command -l) || (hash dm-tool 2>/dev/null && dm-tool lock) || (qdbus org.freedesktop.ScreenSaver /ScreenSaver Lock)',
  };

  if (Object.keys(lockCommands).indexOf(process.platform) === -1) {
    throw new Error(`lockscreen doesn't support your platform (${process.platform})`);
  } else {
    exec(lockCommands[process.platform], (err, stdout) => (cb ? cb(err, stdout) : null));
  }
};
