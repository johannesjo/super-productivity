# Plugin Message Communication in Super Productivity

## How iframe plugins receive messages

### 1. Plugin registers a message handler in its iframe (index.html):

```javascript
// In the plugin's index.html
PluginAPI.onMessage(async (message) => {
  console.log('Plugin received message:', message);

  // Handle different message types
  if (message.type === 'updateBlockedSites') {
    // Update the plugin's state
    return { success: true, sites: message.sites };
  }

  return { error: 'Unknown message type' };
});
```

### 2. Host app sends a message to the plugin:

```typescript
// From anywhere in the Super Productivity app
const pluginBridge = inject(PluginBridgeService);

const response = await pluginBridge.sendMessageToPlugin('procrastination-buster', {
  type: 'updateBlockedSites',
  sites: ['reddit.com', 'twitter.com'],
});
```

### 3. Message flow:

1. `PluginBridgeService.sendMessageToPlugin()` is called
2. It delegates to `PluginRunner.sendMessageToPlugin()`
3. PluginRunner finds the PluginAPI instance and calls its `__sendMessage()` method
4. For iframe plugins, this triggers a postMessage to the iframe with type `PLUGIN_MESSAGE`
5. The iframe's message listener (set up by `onMessage`) handles the message
6. The response is sent back via postMessage with type `PLUGIN_MESSAGE_RESPONSE`
7. The promise resolves with the response

### 4. Implementation details:

The iframe message handling is set up in `plugin-iframe.util.ts`:

```javascript
// When onMessage is called in the iframe:
onMessage: (handler) => {
  window.__pluginMessageHandler = handler;
  window.addEventListener('message', async (event) => {
    if (event.data?.type === 'PLUGIN_MESSAGE' && window.__pluginMessageHandler) {
      try {
        const result = await window.__pluginMessageHandler(event.data.message);
        event.source?.postMessage(
          {
            type: 'PLUGIN_MESSAGE_RESPONSE',
            messageId: event.data.messageId,
            result,
          },
          '*',
        );
      } catch (error) {
        event.source?.postMessage(
          {
            type: 'PLUGIN_MESSAGE_ERROR',
            messageId: event.data.messageId,
            error: error.message,
          },
          '*',
        );
      }
    }
  });
};
```

However, I notice that the actual sending of `PLUGIN_MESSAGE` to the iframe is not implemented in the current code. The `__sendMessage` method on PluginAPI calls the handler directly for non-iframe plugins, but there's no code to post the message to the iframe.

This appears to be a missing piece in the implementation that would need to be added to complete the message communication system for iframe plugins.
