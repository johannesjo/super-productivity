export const sendMessage = async (type: string, payload?: any) => {
  return new Promise((resolve, reject) => {
    const messageId = Math.random().toString(36).substr(2, 9);

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === 'PLUGIN_MESSAGE_RESPONSE' && data.messageId === messageId) {
        window.removeEventListener('message', handler);
        resolve(data.result);
      } else if (data.type === 'PLUGIN_MESSAGE_ERROR' && data.messageId === messageId) {
        window.removeEventListener('message', handler);
        reject(new Error(data.error));
      }
    };

    window.addEventListener('message', handler);
    window.parent.postMessage(
      {
        type: 'PLUGIN_MESSAGE',
        messageId,
        message: {
          type,
          payload,
        },
      },
      '*',
    );
  });
};
