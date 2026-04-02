import axios from 'axios';
import type { WSEvent } from '@gitflow/shared';

const eventEmoji: Record<string, string> = {
  'merge:completed':  '✅',
  'merge:conflict':   '⚠️',
  'conflict:resolved':'🔧',
  'branch:created':   '🌿',
  'branch:deleted':   '🗑️',
  'merge:started':    '🔀',
  'approval:requested': '📝',
  'approval:status_changed': '⚖️',
};

// ─── #14 Slack ─────────────────────────────────────────────────────────────────

export async function notifySlack(webhookUrl: string, event: WSEvent): Promise<void> {
  try {
    const emoji = eventEmoji[event.type] ?? 'ℹ️';
    const payload = event.payload as Record<string, any>;
    const detail = Object.entries(payload)
      .map(([k, v]) => `*${k}:* ${v}`)
      .join('  ·  ');

    await axios.post(webhookUrl, {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *GitFlow · ${event.repoId}*\n*${event.type}*\n${detail}`,
          },
        },
        {
          type: 'context',
          elements: [{ type: 'mrkdwn', text: `<!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>` }],
        },
      ],
    });
  } catch (error) {
    console.error('Slack Notification Failed:', error);
  }
}

// ─── #14 Microsoft Teams ─────────────────────────────────────────────────────

export async function notifyTeams(webhookUrl: string, event: WSEvent): Promise<void> {
  try {
    const emoji = eventEmoji[event.type] ?? 'ℹ️';
    const payload = event.payload as Record<string, any>;
    const facts = Object.entries(payload).map(([k, v]) => ({ name: k, value: String(v) }));

    await axios.post(webhookUrl, {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: event.type.includes('conflict') ? 'FF6B6B' : '0078D4',
      summary: `GitFlow: ${event.type}`,
      sections: [{
        activityTitle: `${emoji} ${event.type}`,
        activitySubtitle: event.repoId,
        facts,
        markdown: true,
      }],
    });
  } catch (error) {
    console.error('Teams Notification Failed:', error);
  }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export interface NotificationConfig {
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;
  events: string[]; // which event types to notify on
}

export async function dispatchNotifications(
  config: NotificationConfig,
  event: WSEvent
): Promise<void> {
  if (!config.events.includes(event.type) && !config.events.includes('*')) return;

  const promises: Promise<void>[] = [];
  if (config.slackWebhookUrl) promises.push(notifySlack(config.slackWebhookUrl, event));
  if (config.teamsWebhookUrl) promises.push(notifyTeams(config.teamsWebhookUrl, event));
  
  await Promise.allSettled(promises);
}
