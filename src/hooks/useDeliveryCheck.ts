import { useEffect, useRef, useState } from 'react';

export type DeliveryPhase =
  | 'idle'       // PIN incomplete — nothing to ask yet
  | 'checking'   // request in flight
  | 'ready'      // we know which options apply
  | 'invalid';   // not a well-formed 6-digit PIN

export interface DeliveryState {
  phase: DeliveryPhase;
  /** Innofulfill serves this PIN, so Express may be offered. */
  expressAvailable: boolean;
  /** Carrier that will handle it. Shiprocket is the floor, never null. */
  provider: 'Innofulfill' | 'Shiprocket' | null;
  /** True when Innofulfill could not be reached and Express was hidden on a guess. */
  indeterminate: boolean;
  message: string | null;
  /** The exact PIN this result describes, so a stale answer is never trusted. */
  pincode: string | null;
}

const IDLE: DeliveryState = {
  phase: 'idle',
  expressAvailable: false,
  provider: null,
  indeterminate: false,
  message: null,
  pincode: null,
};

const PIN_RE = /^[1-9][0-9]{5}$/;

/**
 * Works out which delivery options apply to a PIN code.
 *
 * Every PIN is deliverable, so this never blocks checkout. It decides one
 * thing: whether Express (Innofulfill) can be offered, or whether the order
 * will go Standard via Shiprocket.
 *
 * Debounced, and any change to the PIN or payment method aborts the request in
 * flight and discards the previous answer, so options are never carried over
 * from a different address.
 */
export function useDeliveryCheck(pincode: string, paymentMethod: 'prepay' | 'cod'): DeliveryState {
  const [state, setState] = useState<DeliveryState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    const pin = pincode.trim();

    if (pin.length === 0) {
      setState(IDLE);
      return;
    }
    if (pin.length < 6) {
      setState({ ...IDLE, pincode: pin });
      return;
    }
    if (!PIN_RE.test(pin)) {
      setState({
        ...IDLE,
        phase: 'invalid',
        message: 'Please enter a valid 6-digit PIN code.',
        pincode: pin,
      });
      return;
    }

    setState({ ...IDLE, phase: 'checking', pincode: pin });

    const timer = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/.netlify/functions/verify-delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pincode: pin, paymentMethod }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;

        if (data?.outcome === 'invalid_format') {
          setState({
            ...IDLE,
            phase: 'invalid',
            message: 'Please enter a valid 6-digit PIN code.',
            pincode: pin,
          });
          return;
        }

        setState({
          phase: 'ready',
          expressAvailable: Boolean(data?.expressAvailable),
          provider: data?.provider ?? 'Shiprocket',
          indeterminate: Boolean(data?.indeterminate),
          message: null,
          pincode: pin,
        });
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        // Standard delivery still applies — treat our own failure as "no Express".
        setState({
          phase: 'ready',
          expressAvailable: false,
          provider: 'Shiprocket',
          indeterminate: true,
          message: null,
          pincode: pin,
        });
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [pincode, paymentMethod]);

  return state;
}
