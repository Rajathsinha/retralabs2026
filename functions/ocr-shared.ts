/**
 * Server-side OCR for payment screenshots, via Google Cloud Vision.
 *
 * The checkout UI already runs OCR in the customer's own browser (tesseract.js)
 * as a UX hint, but that check happens in JavaScript the customer controls —
 * it can be edited or skipped before the request is sent. This runs the same
 * kind of check from the server, against the screenshot the customer actually
 * uploaded, so it cannot be bypassed or faked from the browser.
 *
 * It is still only reading pixels in an image: a convincingly edited
 * screenshot reads the same as a real one. Treat this as a stronger pre-filter
 * that surfaces likely mismatches to the admin — never as proof of payment on
 * its own. The human clicking "Verify Payment" after looking at the actual
 * screenshot remains the real gate.
 */

export interface OcrResult {
  /** False only when OCR could not run at all (not configured, request failed, etc). */
  ok: boolean;
  detectedAmounts?: number[];
  amountMatch?: boolean;
  detectedReference?: string | null;
  referenceMatch?: boolean;
  /** Human-readable summary for the admin, e.g. shown next to "Verify Payment". */
  note: string;
}

function extractAmounts(text: string): number[] {
  const amounts: number[] = [];
  const patterns = [
    /₹\s*([\d,]+\.?\d*)/gi,
    /Rs\.?\s*([\d,]+\.?\d*)/gi,
    /INR\s*([\d,]+\.?\d*)/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!Number.isNaN(amount) && amount > 0) amounts.push(amount);
    }
  }
  return amounts;
}

/** UPI/bank transaction references are long digit runs (usually 12). */
function extractReferenceCandidates(text: string): string[] {
  const matches = text.match(/\b\d{9,22}\b/g) || [];
  return Array.from(new Set(matches));
}

/**
 * Reads the payable amount and a matching reference number off a payment
 * screenshot. Returns ok:false (never throws) when OCR isn't configured or
 * the request fails — callers should treat that as "couldn't check", not as
 * a rejection.
 */
export async function ocrPaymentScreenshot(
  base64Image: string,
  payableAmount: number,
  claimedReference: string,
): Promise<OcrResult> {
  const apiKey = (process.env.GOOGLE_VISION_API_KEY || '').trim();
  if (!apiKey) {
    return { ok: false, note: 'Server-side OCR not configured' };
  }

  try {
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'TEXT_DETECTION' }],
        }],
      }),
    });
    if (!res.ok) {
      return { ok: false, note: `Server-side OCR request failed (HTTP ${res.status})` };
    }
    const json: {
      responses?: Array<{ fullTextAnnotation?: { text?: string }; error?: { message?: string } }>;
    } = await res.json();

    const apiError = json.responses?.[0]?.error?.message;
    if (apiError) {
      return { ok: false, note: `Server-side OCR error: ${apiError}` };
    }

    const rawText = json.responses?.[0]?.fullTextAnnotation?.text || '';
    if (!rawText) {
      return { ok: true, amountMatch: false, referenceMatch: false, detectedAmounts: [], detectedReference: null, note: 'Server-side OCR found no readable text in the screenshot' };
    }

    const amounts = extractAmounts(rawText);
    const amountMatch = amounts.some(a => Math.abs(a - payableAmount) <= 1);

    const refCandidates = extractReferenceCandidates(rawText);
    const cleanedClaim = claimedReference.replace(/\D/g, '');
    const referenceMatch = cleanedClaim.length >= 6 &&
      refCandidates.some(r => r.includes(cleanedClaim) || cleanedClaim.includes(r));

    const noteParts: string[] = [
      amountMatch
        ? `Amount ₹${payableAmount.toLocaleString('en-IN')} found in screenshot`
        : `Amount ₹${payableAmount.toLocaleString('en-IN')} NOT found in screenshot (detected: ${amounts.length ? amounts.map(a => `₹${a}`).join(', ') : 'none'}) — check manually`,
    ];
    if (cleanedClaim) {
      noteParts.push(
        referenceMatch
          ? 'reference number matches screenshot text'
          : 'reference number does not appear in screenshot text — check manually',
      );
    }

    return {
      ok: true,
      detectedAmounts: amounts,
      amountMatch,
      detectedReference: refCandidates[0] || null,
      referenceMatch,
      note: noteParts.join('; '),
    };
  } catch (err) {
    return { ok: false, note: `Server-side OCR error: ${err instanceof Error ? err.message : String(err)}` };
  }
}
