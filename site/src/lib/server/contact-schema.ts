import { z } from 'zod';
import { channels, isEmail, normalizePhone } from '../contact';

export const contactSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60),
    channel: z.enum(['sms', 'whatsapp', 'email', 'appel']),
    contact: z.string().trim().min(3).max(120),
    moment: z.enum(['matin', 'journee', 'soir', 'libre']).nullable(),
    message: z.string().trim().max(2000).nullable(),
    model: z
      .object({
        modules: z.array(z.string().max(30)).max(12),
        color: z.string().max(30),
        name: z.string().max(40),
      })
      .nullable(),
    referrer: z
      .string()
      .regex(/^[a-z0-9-]{1,40}$/)
      .nullable(),
    /** Piège à robots : un vrai visiteur ne remplit jamais ce champ invisible. */
    website: z.string().max(200).optional(),
    /** Heure d'ouverture de la conversation : un robot répond en moins de 3 secondes. */
    startedAt: z.number().int().positive(),
  })
  .superRefine((v, ctx) => {
    const needs = channels[v.channel].needs;
    if (needs === 'phone' && !normalizePhone(v.contact)) {
      ctx.addIssue({ code: 'custom', path: ['contact'], message: 'Numéro invalide' });
    }
    if (needs === 'email' && !isEmail(v.contact)) {
      ctx.addIssue({ code: 'custom', path: ['contact'], message: 'E-mail invalide' });
    }
  });

export type ContactRequest = z.infer<typeof contactSchema>;
