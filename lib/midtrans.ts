import crypto from 'crypto';

export const PRO_PLAN_PRICE = 19000;
export const PRO_PLAN_DURATION_DAYS = 30;

export function getMidtransConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

  const snapApiBase = isProduction
    ? 'https://app.midtrans.com/snap/v1'
    : 'https://app.sandbox.midtrans.com/snap/v1';

  const coreApiBase = isProduction
    ? 'https://api.midtrans.com/v2'
    : 'https://api.sandbox.midtrans.com/v2';

  const snapScriptUrl = isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';

  return {
    serverKey,
    clientKey,
    isProduction,
    snapApiBase,
    coreApiBase,
    snapScriptUrl,
  };
}

export function getMidtransAuthHeader(serverKey: string) {
  return 'Basic ' + Buffer.from(`${serverKey}:`).toString('base64');
}

export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
  serverKey: string;
}) {
  const expected = crypto
    .createHash('sha512')
    .update(`${params.orderId}${params.statusCode}${params.grossAmount}${params.serverKey}`)
    .digest('hex');

  return expected === params.signatureKey;
}
