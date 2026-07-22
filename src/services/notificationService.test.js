import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendLineNotification } from './notificationService';

const repair = {
  id: 'repair-123',
  category: 'GENERAL',
  priority: 'normal',
  roomCode: 'C112',
  roomName: '二年甲班',
  itemName: '冷氣',
  reporterName: '王老師',
  description: '冷氣漏水',
  imageUrl: 'https://example.com/photo.jpg'
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sendLineNotification', () => {
  it('建立待處理提醒卡並帶入報修詳情連結', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendLineNotification('待處理報修提醒', {
      token: 'test-token',
      targetId: 'U123',
      proxyUrl: 'https://example.com/notify',
      repairData: repair,
      notificationType: 'reminder'
    });

    expect(result).toEqual({ success: true });
    const [, request] = fetchMock.mock.calls[0];
    const payload = JSON.parse(request.body);
    const flex = payload.messages[0];

    expect(payload.targetId).toBe('U123');
    expect(flex.contents.size).toBe('mega');
    expect(flex.contents.header.backgroundColor).toBe('#92400E');
    expect(flex.contents.header.contents[1].text).toBe('待處理報修提醒');
    expect(flex.contents.footer.contents[0].action.uri).toContain('repairId=repair-123');
    expect(flex.contents.hero).toBeUndefined();
  });

  it('後端回傳錯誤時提供失敗結果', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'LINE API error'
    }));

    const result = await sendLineNotification('待處理報修提醒', {
      token: 'test-token',
      targetId: 'U123',
      proxyUrl: 'https://example.com/notify'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('500');
  });
});
