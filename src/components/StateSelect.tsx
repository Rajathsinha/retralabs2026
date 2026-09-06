import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { searchRegions, canonicalRegion } from '../data/indianStates';

interface StateSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Marks the field as auto-filled from a verified PIN. */
  autoFilled?: boolean;
  error?: string | null;
  id?: string;
}

/**
 * Searchable picker for Indian states and union territories.
 *
 * Free text is not accepted: the value is always one of the official names, so
 * fulfillment never receives a state it cannot route on. The list opens in a
 * portal so it escapes the checkout's overflow containers, and flips above the
 * field when there is not enough room below it.
 */
export default function StateSelect({ value, onChange, autoFilled, error, id }: StateSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [anchor, setAnchor] = useState<
    { left: number; width: number; top: number; maxHeight: number } | null
  >(null);

  const results = useMemo(() => searchRegions(query), [query]);
  const selected = canonicalRegion(value);

  /* Position the panel under the trigger, and keep it there while scrolling. */
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const GAP = 6;
      const MIN = 200;
      const below = window.innerHeight - rect.bottom - GAP - 8;
      const above = rect.top - GAP - 8;
      // Flip above the field when there isn't room below — on a phone the
      // field is often near the keyboard, and a panel that runs off-screen
      // is the difference between a usable picker and an abandoned checkout.
      const flip = below < MIN && above > below;
      setAnchor({
        left: rect.left,
        width: rect.width,
        top: flip ? Math.max(8, rect.top - GAP - Math.min(above, 320)) : rect.bottom + GAP,
        maxHeight: Math.max(MIN, Math.min(flip ? above : below, 320)),
      });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(Math.max(0, results.findIndex(r => r.name === selected)));
      // Let the panel mount before focusing, so mobile keyboards open reliably.
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  /* Keep the highlighted option in view during keyboard navigation. */
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !listRef.current?.closest('[data-state-panel]')?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const commit = (name: string) => {
    onChange(name);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) commit(results[active].name);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  const borderClass = error
    ? 'border-red-400'
    : autoFilled
      ? 'border-emerald-300'
      : 'border-slate-200';

  const panel = open && anchor && (
    <div
      data-state-panel
      className="fixed z-[80]"
      style={{
        top: anchor.top,
        left: anchor.left,
        width: Math.max(anchor.width, 260),
      }}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.28)] overflow-hidden">
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" strokeWidth={2} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search state or UT"
            aria-label="Search state or union territory"
            aria-controls={`${id ?? 'state'}-listbox`}
            className="flex-1 min-w-0 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              aria-label="Clear search"
              className="p-1 -m-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>

        <ul
          ref={listRef}
          id={`${id ?? 'state'}-listbox`}
          role="listbox"
          style={{ maxHeight: anchor.maxHeight }}
          className="overflow-y-auto overscroll-contain py-1"
        >
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-[14px] text-slate-500">
              No state matches “{query}”.
            </li>
          )}
          {results.map((region, i) => {
            const isSelected = region.name === selected;
            return (
              <li key={region.name} data-idx={i}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(region.name)}
                  className={`w-full flex items-center justify-between gap-3 text-left px-4 py-3 min-h-[44px] text-[15px] transition-colors ${
                    i === active ? 'bg-slate-100' : 'bg-transparent'
                  } ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
                >
                  <span className="truncate">{region.name}</span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    {region.kind === 'ut' && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">UT</span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 min-h-[48px] rounded-xl border-2 bg-white text-left transition-colors focus:outline-none focus:border-slate-800 ${borderClass}`}
      >
        <span className={`truncate text-base ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
          {selected ?? 'Select state'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </>
  );
}

