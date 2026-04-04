'use client';

import { WebHaptics } from 'web-haptics';

let instance: WebHaptics | null = null;

function getHaptics(): WebHaptics {
  if (!instance) {
    instance = new WebHaptics();
  }
  return instance;
}

export const haptic = {
  light: () => getHaptics().trigger(10),
  medium: () => getHaptics().trigger(25),
  heavy: () => getHaptics().trigger(50),
  success: () => getHaptics().trigger([10, 30, 10]),
  error: () => getHaptics().trigger([50, 20, 50]),
  selection: () => getHaptics().trigger(5),
};
