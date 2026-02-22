// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

/**
 * Telegram Notification Service
 *
 * Sends a summary message to Telegram when an audit completes or fails.
 * Opt-in: silently skips if TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID are unset.
 */

import type { SessionMetadata } from '../types/audit.js';
import type { WorkflowSummary } from '../audit/workflow-logger.js';
import type { ActivityLogger } from '../types/activity-logger.js';
import { formatDuration } from '../utils/formatting.js';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatMessage(sessionMetadata: SessionMetadata, summary: WorkflowSummary): string {
  const statusEmoji = summary.status === 'completed' ? '\u2705' : '\u274C';
  const statusLabel = summary.status === 'completed' ? 'Completed' : 'Failed';
  const duration = formatDuration(summary.totalDurationMs);
  const cost = `$${summary.totalCostUsd.toFixed(4)}`;
  const agentCount = summary.completedAgents.length;

  const lines = [
    `<b>Shannon Audit ${statusEmoji} ${statusLabel}</b>`,
    '',
    `<b>Target:</b>   ${escapeHtml(sessionMetadata.webUrl)}`,
    `<b>Duration:</b> ${duration}`,
    `<b>Cost:</b>     ${cost}`,
    `<b>Agents:</b>   ${agentCount} completed`,
  ];

  if (summary.status === 'failed' && summary.error) {
    const truncated = summary.error.length > 200
      ? summary.error.slice(0, 200) + '...'
      : summary.error;
    lines.push('', `<b>Error:</b> ${escapeHtml(truncated)}`);
  }

  return lines.join('\n');
}

export async function sendTelegramNotification(
  sessionMetadata: SessionMetadata,
  summary: WorkflowSummary,
  logger: ActivityLogger
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return;
  }

  const text = formatMessage(sessionMetadata, summary);
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.warn(`Telegram notification failed: ${response.status} ${body}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Telegram notification failed: ${message}`);
  }
}
