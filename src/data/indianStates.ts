/**
 * Official Indian States and Union Territories.
 *
 * This is the closed set the checkout accepts. Free-text state entry produced
 * unroutable addresses and mismatched fulfillment, so a value outside this list
 * is rejected on both the client and the server.
 *
 * Names match the India Post `State` field so a PIN lookup can be matched back
 * to an entry here without a translation table. Common alternates that India
 * Post or customers use are listed in ALIASES.
 */

export type RegionKind = 'state' | 'ut';

export interface Region {
  name: string;
  kind: RegionKind;
}

export const STATES: readonly string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

export const UNION_TERRITORIES: readonly string[] = [
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export const REGIONS: readonly Region[] = [
  ...STATES.map(name => ({ name, kind: 'state' as const })),
  ...UNION_TERRITORIES.map(name => ({ name, kind: 'ut' as const })),
];

export const ALL_REGION_NAMES: readonly string[] = REGIONS.map(r => r.name);

/**
 * Alternate spellings seen from India Post and from customers, mapped to the
 * canonical name above. Keys are normalised (lowercase, punctuation stripped).
 */
const ALIASES: Record<string, string> = {
  orissa: 'Odisha',
  pondicherry: 'Puducherry',
  uttaranchal: 'Uttarakhand',
  'new delhi': 'Delhi',
  'nct of delhi': 'Delhi',
  'delhi ncr': 'Delhi',
  'jammu kashmir': 'Jammu and Kashmir',
  'andaman nicobar islands': 'Andaman and Nicobar Islands',
  'andaman and nicobar': 'Andaman and Nicobar Islands',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'dadra nagar haveli daman diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'tamilnadu': 'Tamil Nadu',
  'chattisgarh': 'Chhattisgarh',
};

/** Lowercase, collapse whitespace, drop punctuation — for tolerant matching. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,'’&]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const CANONICAL_BY_NORMALISED = new Map<string, string>(
  ALL_REGION_NAMES.map(name => [normalise(name), name]),
);

/**
 * Resolves any reasonable spelling to the canonical region name.
 * Returns undefined when the value is not a recognised state or UT — callers
 * must treat that as invalid rather than passing the raw string through.
 */
export function canonicalRegion(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const key = normalise(value);
  if (!key) return undefined;

  const direct = CANONICAL_BY_NORMALISED.get(key);
  if (direct) return direct;

  const alias = ALIASES[key];
  if (alias) return alias;

  // India Post sometimes returns the state with a trailing qualifier, e.g.
  // "Delhi (NCT)". Fall back to a prefix match before giving up.
  for (const [normalised, canonical] of CANONICAL_BY_NORMALISED) {
    if (key.startsWith(`${normalised} `) || normalised.startsWith(`${key} `)) {
      return canonical;
    }
  }
  return undefined;
}

export function isValidRegion(value: string | null | undefined): boolean {
  return canonicalRegion(value) !== undefined;
}

/**
 * Ranked search for the state picker. Prefix matches rank above substring
 * matches so typing "ka" surfaces Karnataka before Andhra Pradesh.
 */
export function searchRegions(query: string): Region[] {
  const q = normalise(query);
  if (!q) return [...REGIONS];

  const prefix: Region[] = [];
  const contains: Region[] = [];

  for (const region of REGIONS) {
    const name = normalise(region.name);
    if (name.startsWith(q)) prefix.push(region);
    else if (name.includes(q)) contains.push(region);
  }
  return [...prefix, ...contains];
}
