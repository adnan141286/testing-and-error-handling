import { EventLogTracker } from '../../src/utils/eventLogger';

describe('EventLogTracker', (): void => {
  let tracker: EventLogTracker;

  beforeEach((): void => {
    tracker = new EventLogTracker(5);
  });

  it('addEvent returns entry with correct shape', (): void => {
    const entry = tracker.addEvent('TEST_TYPE', 'Hello world', { x: 1 }, 'warn');
    expect(entry.type).toBe('TEST_TYPE');
    expect(entry.message).toBe('Hello world');
    expect(entry.level).toBe('warn');
    expect(entry.details).toEqual({ x: 1 });
    expect(typeof entry.id).toBe('string');
    expect(typeof entry.timestamp).toBe('string');
  });

  it('defaults level to info when omitted', (): void => {
    const entry = tracker.addEvent('EVT', 'msg');
    expect(entry.level).toBe('info');
  });

  it('getEvents returns events newest first', (): void => {
    tracker.addEvent('A', 'first');
    tracker.addEvent('B', 'second');
    tracker.addEvent('C', 'third');
    const events = tracker.getEvents();
    expect(events[0]?.message).toBe('third');
    expect(events[1]?.message).toBe('second');
    expect(events[2]?.message).toBe('first');
  });

  it('getEvents respects limit parameter', (): void => {
    for (let i = 0; i < 5; i++) tracker.addEvent('T', `event ${i}`);
    const events = tracker.getEvents(2);
    expect(events).toHaveLength(2);
  });

  it('clear empties the buffer', (): void => {
    tracker.addEvent('T', 'msg');
    tracker.clear();
    expect(tracker.getEvents()).toHaveLength(0);
  });

  it('evicts oldest event when maxEvents is exceeded (FIFO)', (): void => {
    // maxEvents=5; add 6 events
    for (let i = 0; i < 6; i++) tracker.addEvent('T', `event ${i}`);
    const events = tracker.getEvents();
    expect(events).toHaveLength(5);
    // oldest ('event 0') should be evicted; newest is 'event 5'
    const messages = events.map((e) => e.message);
    expect(messages).not.toContain('event 0');
    expect(messages).toContain('event 5');
  });
});
