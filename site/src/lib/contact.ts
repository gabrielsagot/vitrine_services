export const channels = {
  sms: { label: 'Par SMS', phrase: 'par SMS', needs: 'phone' },
  whatsapp: { label: 'Sur WhatsApp', phrase: 'sur WhatsApp', needs: 'phone' },
  email: { label: 'Par e-mail', phrase: 'par e-mail', needs: 'email' },
  appel: { label: 'Par un appel', phrase: 'par téléphone', needs: 'phone' },
} as const;

export type Channel = keyof typeof channels;

export const moments = {
  matin: { label: 'Le matin', phrase: 'plutôt le matin' },
  journee: { label: 'En journée', phrase: 'plutôt en journée' },
  soir: { label: 'Le soir', phrase: 'plutôt le soir' },
  libre: { label: 'Peu importe', phrase: '' },
} as const;

export type Moment = keyof typeof moments;

/** Numéro saisi librement (« 06 12 34 56 78 », « +33 6… », « 0033… ») → format international. */
export function normalizePhone(input: string): string | null {
  let s = input.replace(/[\s.\-()/]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (/^0[1-9]\d{8}$/.test(s)) return `+33${s.slice(1)}`;
  if (/^\+33[1-9]\d{8}$/.test(s)) return s;
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
  return null;
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
