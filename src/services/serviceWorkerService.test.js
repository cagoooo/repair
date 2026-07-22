import { describe, expect, it, vi } from 'vitest';
import {
  activateWaitingServiceWorker,
  waitForServiceWorkerCandidate,
  watchForServiceWorkerUpdate
} from './serviceWorkerService';

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type) {
    this.listeners.get(type)?.forEach(listener => listener());
  }
}

describe('Service Worker 更新流程', () => {
  it('已有 waiting worker 時立即通知', () => {
    const registration = Object.assign(new FakeEventTarget(), {
      waiting: { state: 'installed' },
      installing: null
    });
    const onUpdate = vi.fn();

    const cleanup = watchForServiceWorkerUpdate(registration, () => true, onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(registration);
    cleanup();
  });

  it('首次安裝沒有 controller 時不誤報更新', () => {
    const worker = Object.assign(new FakeEventTarget(), { state: 'installing' });
    const registration = Object.assign(new FakeEventTarget(), {
      waiting: null,
      installing: worker
    });
    const onUpdate = vi.fn();

    watchForServiceWorkerUpdate(registration, () => false, onUpdate);
    registration.dispatch('updatefound');
    worker.state = 'installed';
    worker.dispatch('statechange');

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('按下更新會向最新 waiting worker 發送 SKIP_WAITING', async () => {
    const worker = {
      state: 'installed',
      postMessage: vi.fn()
    };
    const registration = {
      waiting: worker,
      installing: null,
      update: vi.fn()
    };

    const activated = await activateWaitingServiceWorker(registration);

    expect(activated).toBe(true);
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(registration.update).not.toHaveBeenCalled();
  });

  it('版本檢查後會等待 updatefound 提供真正的新 worker', async () => {
    const registration = Object.assign(new FakeEventTarget(), {
      waiting: null,
      installing: null
    });
    const worker = { state: 'installing' };

    const candidatePromise = waitForServiceWorkerCandidate(registration, 100);
    registration.installing = worker;
    registration.dispatch('updatefound');

    await expect(candidatePromise).resolves.toBe(worker);
  });
});
