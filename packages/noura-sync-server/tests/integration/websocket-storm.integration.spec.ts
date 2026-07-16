import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManagedWebSocket } from '../../src/sync/services/websocket-connection.service';

vi.mock('../../src/logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

const { Logger } = await import('../../src/logger');
const { getWsConnectionService, resetWsConnectionService } =
  await import('../../src/sync/services/websocket-connection.service');

class TestSocket implements ManagedWebSocket {
  readyState = 1;
  readonly sent: string[] = [];
  readonly closes: Array<{ code?: number; reason?: string }> = [];

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closes.push({ code, reason });
    this.readyState = 3;
  }
}

describe('WebSocket reconnect-storm integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWsConnectionService();
  });

  afterEach(() => {
    resetWsConnectionService();
  });

  it('keeps one incumbent alive under a 20-challenger storm and summarizes it once', () => {
    const stormSize = 20;
    const service = getWsConnectionService();
    const incumbent = new TestSocket();
    service.addConnection(42, 'storm', incumbent);

    const challengers = Array.from({ length: stormSize }, () => new TestSocket());
    for (const challenger of challengers) {
      service.addConnection(42, 'storm', challenger);
    }

    expect(challengers.every((socket) => socket.closes[0]?.code === 4008)).toBe(true);
    expect(incumbent.readyState).toBe(1);
    expect(service.getConnectionCount()).toBe(1);

    const stormWarnings = vi
      .mocked(Logger.warn)
      .mock.calls.filter((call) => String(call[0]).includes('Reconnect within cooldown'));
    expect(stormWarnings).toHaveLength(1);

    service.handleClose(incumbent);
    service.handleClose(incumbent);

    const summaries = vi
      .mocked(Logger.info)
      .mock.calls.filter((call) =>
        String(call[0]).includes(`Refused ${stormSize} reconnect challenger(s)`),
      );
    expect(summaries).toHaveLength(1);
    expect(service.getConnectionCount()).toBe(0);
  });
});
