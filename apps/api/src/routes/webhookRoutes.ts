import { Router, type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import { eventStore } from '../lib/eventStore';
import { emitRepoEvent } from '../services/socketHandlers';
import { dispatchNotifications } from '../services/notificationService';
import type { Server } from 'socket.io';
import type { WSEventType } from '@gitflow/shared';

export const webhookRouter = Router();

function verifyGitHubSignature(req: Request): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true; // skip if not configured
  const sig = req.headers['x-hub-signature-256'] as string;
  if (!sig) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(req.body));
  const digest = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(digest));
}

const githubEventToWSType: Record<string, WSEventType> = {
  push:              'branch:updated',
  create:            'branch:created',
  delete:            'branch:deleted',
  pull_request:      'merge:started',
  status:            'graph:updated',
};

// POST /api/v1/webhooks/github — receive GitHub webhook events
webhookRouter.post('/webhooks/github', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!verifyGitHubSignature(req)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const io = req.app.get('io') as Server | undefined;
    const githubEvent = String(req.headers['x-github-event'] || 'push');
    const payload = req.body;
    const repoId: string = payload.repository?.full_name ?? 'unknown';

    // Store for replay
    const stored = eventStore.append({ repoId, githubEvent, payload, receivedAt: Date.now() });

    // Map to WS event and broadcast
    const wsType = githubEventToWSType[githubEvent] ?? 'graph:updated';
    const wsEvent = {
      type: wsType,
      payload: { githubEvent, eventId: stored.id, ref: payload.ref ?? '', action: payload.action },
      timestamp: new Date().toISOString(),
      repoId,
    };

    if (io) {
      emitRepoEvent(io, repoId, wsEvent);
    }

    const notifConfig = {
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL,
      events: ['merge:completed', 'merge:conflict', 'conflict:resolved', 'branch:updated', 'approval:requested'],
    };
    await dispatchNotifications(notifConfig, wsEvent);

    res.status(200).json({ ok: true, eventId: stored.id });
  } catch (err) { next(err); }
});


webhookRouter.get('/:owner/:repo/events', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const limit = parseInt((req.query.limit as string) ?? '50', 10);
    const events = eventStore.forRepo(`${owner}/${repo}`, limit);
    res.json({ success: true, data: events });
  } catch (err) { next(err); }
});

// POST /api/v1/repos/:owner/:repo/events/:eventId/replay — replay single event
webhookRouter.post('/:owner/:repo/events/:eventId/replay', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo, eventId } = req.params;
    const io = req.app.get('io') as Server | undefined;
    const event = eventStore.getById(eventId as string);
    if (!event) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });
      return;
    }

    const wsType = githubEventToWSType[event.githubEvent] ?? 'graph:updated';
    const wsEvent = {
      type: wsType,
      payload: { ...((event.payload as Record<string, unknown>) ?? {}), replayed: true },
      timestamp: new Date().toISOString(),
      repoId: `${owner}/${repo}`,
    };

    if (io) {
      emitRepoEvent(io, `${owner}/${repo}`, wsEvent);
    }
    
    res.json({ success: true, data: { replayed: true, event: wsEvent } });
  } catch (err) { next(err); }
});

export default webhookRouter;
