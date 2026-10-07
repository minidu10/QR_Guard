'use client';

import type { AlertWithShop, Payment } from '@qrguard/types';
import { useEffect, useRef, useState } from 'react';
import { realtimeTicketAction } from '@/app/dashboard/actions';

export type LiveStatus = 'connecting' | 'live' | 'offline';

interface Handlers {
  onAlert?: (alert: AlertWithShop) => void;
  onPayment?: (payment: Payment) => void;
}

/**
 * Live alerts and payments from the API (Socket.io).
 * `url` is the API address the browser can reach. Each (re)connect gets a fresh ticket.
 */
export function useRealtime(url: string, handlers: Handlers): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>('connecting');
  // Always call the latest handlers without reconnecting.
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    let socket: import('socket.io-client').Socket | null = null;
    let stopped = false;

    void (async () => {
      const { io } = await import('socket.io-client');
      if (stopped) return;
      socket = io(url, {
        transports: ['websocket'],
        auth: (cb) => {
          void realtimeTicketAction().then((ticket) => cb({ ticket: ticket ?? '' }));
        },
      });
      socket.on('connect', () => setStatus('live'));
      socket.on('connect_error', () => setStatus('offline'));
      socket.on('disconnect', (reason) => {
        // The server only closes the connection itself when the ticket is not accepted.
        setStatus(reason === 'io server disconnect' ? 'offline' : 'connecting');
      });
      socket.on('alert', (a: AlertWithShop) => ref.current.onAlert?.(a));
      socket.on('payment', (p: Payment) => ref.current.onPayment?.(p));
    })();

    return () => {
      stopped = true;
      socket?.disconnect();
    };
  }, [url]);

  return status;
}
