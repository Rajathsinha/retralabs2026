/**
 * MongoDB document shapes, mirroring the Airtable "Orders" and "COD Orders"
 * tables field-for-field so the dual-write phase can write the same data to
 * both stores without translation drift. Field names here are the MongoDB
 * side (camelCase); the comment on each names the Airtable field it mirrors.
 */

export interface MongoOrderDocument {
  _id?: string;
  /** Mirrors Airtable's own record id, so a dual-written doc can always be
   *  traced back to the Airtable row it came from during the transition. */
  airtableRecordId?: string;

  orderID: string;               // orderID
  name: string;                  // Name
  phone: string;                 // Phone
  email: string;                 // Email
  address: string;               // Address
  city?: string;                 // City
  state?: string;                // State
  pincode?: string;              // Pincode / PIN
  items: string;                 // Items
  total: number;                 // Total (₹)
  payment: string;               // Payment (e.g. "COD", "UPI/Prepay", "UPI QR (Customer Form)")
  delivery: string;              // Delivery ("Standard" | "Express")
  referral?: string;             // Referral
  status: string;                // Status

  paymentStatus?: string;        // Payment Status: PENDING | PROOF_SUBMITTED | CONFIRMED
  shipmentStatus?: string;       // Shipment Status: NOT_CREATED | AWB_PENDING | AWB_ASSIGNED
  transaction?: string;          // Transaction (UTR / payment reference)

  trackingId?: string;           // Tracking ID
  innofulfillOrderId?: string;   // Innofulfill Order ID
  innofulfillInternalId?: string;// Innofulfill Internal ID
  innofulfillError?: string;     // Innofulfill Error
  awbNumber?: string;            // AWB Number
  awbEmailSent?: boolean;        // AWB Email Sent
  carrierDisplayName?: string;   // Carrier Display Name
  courierProvider?: string;      // Courier Provider
  trackingUrl?: string;          // Tracking URL

  paymentSessionStartedAt?: string;  // Payment Session Started At (ISO)
  paymentSessionExpiresAt?: string;  // Payment Session Expires At (ISO)
  paymentProofSubmittedAt?: string;  // Payment Proof Submitted At (ISO)
  paymentVerificationNote?: string;  // Payment Verification Note
  shipmentCreatedAt?: string;        // Shipment Created At (ISO)

  /** Screenshot attachments live in Airtable/R2, not duplicated here —
   *  store a reference URL if/when screenshots move too. */
  screenshotUrl?: string;

  createdAt: string;             // Created (ISO) — order placement date
  updatedAt?: string;
}

export interface MongoCodOrderDocument {
  _id?: string;
  airtableRecordId?: string;

  name: string;                  // Name
  phone: string;                 // Phone
  address: string;               // Address
  orderDetails?: string;         // Order Details
  amount: number;                // Amount
  linkedOrderId?: string;        // Linked Order (orderID of the Orders record)
  trackingId?: string;           // Tracking ID
  deliveredOrNot?: string;       // Delivered or not
  date?: string;                 // Date (ISO)
  paidByMaruthi?: string;        // paid by MARUTHI
  deductionByMaruthi?: string;   // deduction by maruthi

  createdAt: string;
  updatedAt?: string;
}
