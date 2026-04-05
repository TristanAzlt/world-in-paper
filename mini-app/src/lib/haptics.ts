'use client';

import { MiniKit } from '@worldcoin/minikit-js';

const safe = (fn: () => unknown) => {
  try {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      (result as Promise<unknown>).catch(() => {});
    }
  } catch { /* noop */ }
};

export const haptic = {
  light: () => safe(() => MiniKit.sendHapticFeedback({ hapticsType: 'impact', style: 'light' })),
  medium: () => safe(() => MiniKit.sendHapticFeedback({ hapticsType: 'impact', style: 'medium' })),
  heavy: () => safe(() => MiniKit.sendHapticFeedback({ hapticsType: 'impact', style: 'heavy' })),
  success: () => safe(() => MiniKit.sendHapticFeedback({ hapticsType: 'notification', style: 'success' })),
  error: () => safe(() => MiniKit.sendHapticFeedback({ hapticsType: 'notification', style: 'error' })),
  selection: () => safe(() => MiniKit.sendHapticFeedback({ hapticsType: 'selection-changed' })),
};
