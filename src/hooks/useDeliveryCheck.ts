import { useEffect, useRef, useState } from 'react';

export type DeliveryOutcome = 'ok' | 'invalid_format' | 'not_found' | 'unavailable' | 'undeliverable';

export interface DeliveryLocation {
  pincode: string;
  state: string;
  district?: string;
  city?: string;
  areas: string[];
}

export type DeliveryPhase =
  | 'idle'        // nothing to check yet — PIN incomplete
  | 'checking'    // request in flight
  | 'verified'    // PIN real and deliverable
  | 'rejected'    // PIN real but nobody delivers there
  | 'error';      // bad PIN, unknown PIN, or lookup down

export interface DeliveryState {
  phase: DeliveryPhase;
  outcome: DeliveryOutcome | null;
  location: DeliveryLocation | null;
  provider: 'Innofulfill' | 'Shiprocket' | null;
  /** True when carriers were unreachable and we let the order through anyway. */
  carrierIndeterminate: boolean;
  message: string | null;
  /** The exact PIN this result describes, so callers never trust a stale one. */
  pincode: string | null;
}

const IDLE: DeliveryState = {
  phase: 'idle',
  outcome: null,
  location: null,
  provider: null,
  carrierIndeterminate: false,
  message: null,
  pincode: null,
};

const PIN_RE = /^[1-9][0-9]{5}$/;

const MESSAGES: Record<Exclude<DeliveryOutcome, 'ok'>, string> = {
  invalid_format: 'Please enter a valid 6-digit PIN code.',
  not_found: "We couldn't verify this PIN code. Please check the number and try again.",
  unavailable: "We're temporarily unable to verify this PIN. Please try again in a moment.",
  undeliverable: "We currently don't have delivery availability for this PIN code.",
};

/**
 * Verifies a PIN code and delivery availability as the customer types.
 *
 * Behaviour that matters:
 *  - Only fires once a complete, well-formed 6-digit PIN is present.
 *  - Debounced, so a request is not made per keystroke.
 *  - Any change to the PIN or payment method immediately discards the previous
 *    result and aborts the in-flight request. Serviceability is never reused
 *    across a different PIN, which is what let customers pay for addresses we
 *    could not ship to.
 *
 * The result is advisory. create-order re-runs the same checks server-side.
 */
export function useDeliveryCheck(pincode: string, paymentMethod: 'prepay' | 'cod'): DeliveryState {
  const [state, setState] = useState<DeliveryState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Drop the previous answer the instant the inputs change — a result for a
    // different PIN must never linger on screen or gate the pay button.
    abortRef.current?.abort();
    abortRef.current = null;

    const pin = pincode.trim();

    if (pin.length === 0) {
      setState(IDLE);
      return;
    }
    if (pin.length < 6) {
      setState({ ...IDLE, phase: 'idle' });
      return;
    }
    if (!PIN_RE.test(pin)) {
      setState({
        ...IDLE,
        phase: 'error',
        outcome: 'invalid_format',
        message: MESSAGES.invalid_format,
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

        const outcome: DeliveryOutcome = data?.outcome ?? 'unavailable';

        if (outcome === 'ok') {
          setState({
            phase: 'verified',
            outcome,
            location: data.location ?? null,
            provider: data.provider ?? null,
            carrierIndeterminate: data.carrierCheck === 'indeterminate',
            message: null,
            pincode: pin,
          });
          return;
        }

        setState({
          phase: outcome === 'undeliverable' ? 'rejected' : 'error',
          outcome,
          location: data.location ?? null,
          provider: null,
          carrierIndeterminate: false,
          message: MESSAGES[outcome as Exclude<DeliveryOutcome, 'ok'>] ?? MESSAGES.unavailable,
          pincode: pin,
        });
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setState({
          ...IDLE,
          phase: 'error',
          outcome: 'unavailable',
          message: MESSAGES.unavailable,
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
