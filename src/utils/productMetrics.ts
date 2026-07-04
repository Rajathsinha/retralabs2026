function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  const random = x - Math.floor(x);
  return Math.floor(random * (max - min + 1)) + min;
}

export function getViewingCount(productId: string): number {
  const seed = hashString(productId);
  const ranges = [
    { weight: 0.5, min: 0, max: 3 },
    { weight: 0.3, min: 4, max: 7 },
    { weight: 0.2, min: 8, max: 10 },
  ];

  const selector = seededRandom(seed, 0, 100);

  if (selector < 50) {
    return seededRandom(seed + 1, ranges[0].min, ranges[0].max);
  } else if (selector < 80) {
    return seededRandom(seed + 2, ranges[1].min, ranges[1].max);
  } else {
    return seededRandom(seed + 3, ranges[2].min, ranges[2].max);
  }
}

export function getSoldCount(productId: string, productName: string, category: string): number {
  const seed = hashString(productId);
  const normalizedCategory = category?.toLowerCase() || '';

  const flagshipProducts = ['Retatrutide', 'Tirzepatide'];
  const isFlagship = flagshipProducts.includes(productName);

  if (isFlagship) {
    return seededRandom(seed + 10, 42, 89);
  } else if (normalizedCategory.includes('peptide') || normalizedCategory.includes('growth hormone')) {
    return seededRandom(seed + 20, 23, 61);
  } else if (normalizedCategory.includes('medical') || normalizedCategory.includes('supplies')) {
    return seededRandom(seed + 30, 12, 38);
  } else {
    return seededRandom(seed + 40, 15, 55);
  }
}
