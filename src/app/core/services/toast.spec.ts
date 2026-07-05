import { ToastService } from './toast';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new ToastService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no toasts', () => {
    expect(service.toasts()).toEqual([]);
  });

  it('adds a toast with the requested type and message', () => {
    service.success('Saved!');
    const toasts = service.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0]).toMatchObject({ type: 'success', message: 'Saved!' });
  });

  it('assigns increasing ids so toasts can be dismissed independently', () => {
    service.info('first');
    service.error('second');
    const [first, second] = service.toasts();
    expect(first.id).not.toBe(second.id);
  });

  it('auto-dismisses after the given duration', () => {
    service.show('bye', 'info', 1000);
    expect(service.toasts().length).toBe(1);

    vi.advanceTimersByTime(1000);

    expect(service.toasts().length).toBe(0);
  });

  it('dismiss() removes only the matching toast', () => {
    service.info('keep me');
    service.info('remove me');
    const idToRemove = service.toasts()[1].id;

    service.dismiss(idToRemove);

    const remaining = service.toasts();
    expect(remaining.length).toBe(1);
    expect(remaining[0].message).toBe('keep me');
  });
});
