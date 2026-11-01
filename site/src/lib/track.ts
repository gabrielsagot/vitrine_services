/**
 * Événement du suivi des visites (script public/visites.js). Sans effet si le script n'est pas chargé
 * ou si le visiteur a refusé le suivi : l'appel est mis en file et traité au chargement du script.
 */
export function track(name: string, props?: Record<string, string | number | boolean | null>): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { visitesQ?: { push: (call: unknown[]) => void } };
  (w.visitesQ ??= [] as unknown as { push: (call: unknown[]) => void }).push(['track', name, props ?? {}]);
}
