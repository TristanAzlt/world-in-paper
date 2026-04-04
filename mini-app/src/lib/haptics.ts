'use client';

import { MiniKit } from '@worldcoin/minikit-js';

export const haptic = {
  light: () => MiniKit.sendHapticFeedback({ hapticsType: 'impact', style: 'light' }),
  medium: () => MiniKit.sendHapticFeedback({ hapticsType: 'impact', style: 'medium' }),
  heavy: () => MiniKit.sendHapticFeedback({ hapticsType: 'impact', style: 'heavy' }),
  success: () => MiniKit.sendHapticFeedback({ hapticsType: 'notification', style: 'success' }),
  error: () => MiniKit.sendHapticFeedback({ hapticsType: 'notification', style: 'error' }),
  selection: () => MiniKit.sendHapticFeedback({ hapticsType: 'selection-changed' }),
};
