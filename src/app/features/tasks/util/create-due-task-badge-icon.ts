/** Windows taskbar overlay: neutral circle and a centered, smooth white count. */
export const createDueTaskBadgeIcon = (count: number): string | undefined => {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return undefined;

  context.fillStyle = '#373737';
  context.beginPath();
  context.arc(size / 2, size / 2, 28, 0, Math.PI * 2);
  context.fill();

  const text = count > 99 ? '99+' : String(count);
  const fontSize = text.length === 1 ? 40 : text.length === 2 ? 32 : 24;
  context.font = `400 ${fontSize}px "Segoe UI", sans-serif`;
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  const metrics = context.measureText(text);
  // Center the digit shapes rather than the font's ascender/line box.
  const baseline =
    (size + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
  context.fillText(text, size / 2, baseline);
  return canvas.toDataURL('image/png');
};
