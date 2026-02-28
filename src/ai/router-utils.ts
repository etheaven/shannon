// Copyright (C) 2025 Keygraph, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3
// as published by the Free Software Foundation.

/**
 * Get the actual model name being used.
 * When using Kilo Gateway or claude-code-router, the SDK reports its configured model
 * (claude-sonnet) but the actual model is determined by KILO_MODEL or ROUTER_DEFAULT env var.
 */
export function getActualModelName(sdkReportedModel?: string): string | undefined {
  const routerBaseUrl = process.env.ANTHROPIC_BASE_URL;

  // Kilo Gateway mode — model is set directly (e.g., "anthropic/claude-sonnet-4-5")
  const kiloModel = process.env.KILO_MODEL;
  if (routerBaseUrl && kiloModel) {
    return kiloModel;
  }

  // Router mode — ROUTER_DEFAULT format: "provider,model" (e.g., "gemini,gemini-2.5-pro")
  const routerDefault = process.env.ROUTER_DEFAULT;
  if (routerBaseUrl && routerDefault) {
    const parts = routerDefault.split(',');
    if (parts.length >= 2) {
      return parts.slice(1).join(','); // Handle model names with commas
    }
  }

  // Fall back to SDK-reported model
  return sdkReportedModel;
}

