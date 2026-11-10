import request from 'supertest';
import express, { Express } from 'express';
import { createEventsRouter } from '../../src/routes/events.routes';
import { EventLogTracker } from '../../src/utils/eventLogger';

describe('Events Route', (): void => {
  let app: Express;
  let tracker: EventLogTracker;

  beforeEach((): void => {
    tracker = new EventLogTracker(50);
    app = express();
    app.use('/api/events', createEventsRouter({ tracker }));
  });

  it('returns empty events list initially', async (): Promise<void> => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.events).toHaveLength(0);
  });

  it('returns recorded events newest first', async (): Promise<void> => {
    tracker.addEvent('TYPE_A', 'First event');
    tracker.addEvent('TYPE_B', 'Second event');
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(2);
    expect(res.body.events[0].message).toBe('Second event');
    expect(res.body.events[1].message).toBe('First event');
  });

  it('honours the limit query parameter', async (): Promise<void> => {
    for (let i = 0; i < 10; i++) {
      tracker.addEvent('EVT', `Event ${i}`);
    }
    const res = await request(app).get('/api/events?limit=3');
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(3);
  });
});
