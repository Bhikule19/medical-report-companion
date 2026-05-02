'use client';

import { useState, type ReactNode } from 'react';
import { ConsentInterstitial } from './ConsentInterstitial';
import { hasAcknowledgedCurrent, saveAck } from '@/lib/legal/acknowledge';
import { POLICY_VERSION } from '@/lib/legal/versions';

export function ConsentGate({ children }: { children: ReactNode }) {
  const [acknowledged, setAcknowledged] = useState(() => {
    if (typeof window === 'undefined') return false;
    return hasAcknowledgedCurrent();
  });

  function handleAccept() {
    saveAck(POLICY_VERSION);
    setAcknowledged(true);
  }

  if (!acknowledged) return <ConsentInterstitial onAccept={handleAccept} />;
  return <>{children}</>;
}
