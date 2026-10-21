import { describe, expect, it } from 'vitest';
import { demoSettings, demoStops, hhmm, messageOrder, optimize, permutations, simulate } from './tour';

describe('permutations', () => {
  it('produit toutes les permutations, sans doublon', () => {
    const all = [...permutations([1, 2, 3, 4])].map((p) => p.join(''));
    expect(all).toHaveLength(24);
    expect(new Set(all).size).toBe(24);
  });
});

describe('journée de démonstration', () => {
  const best = optimize(demoStops, demoSettings);
  const messy = simulate(
    messageOrder.map((id) => demoStops.find((s) => s.id === id)!),
    demoSettings,
  );

  it('respecte toutes les contraintes', () => {
    expect(best.late).toBe(0);
    for (const v of best.visits) {
      if (v.stop.earliest !== undefined) expect(v.start).toBeGreaterThanOrEqual(v.stop.earliest);
      if (v.stop.latest !== undefined) expect(v.start).toBeLessThanOrEqual(v.stop.latest + 5);
    }
  });

  it("fait nettement moins de route que l'ordre des messages", () => {
    expect(best.km).toBeLessThan(messy.km * 0.75);
  });

  it('affiche des heures lisibles', () => {
    expect(hhmm(8 * 60 + 5)).toBe('8h05');
    console.log(
      best.order.map((s) => s.id).join(' > '),
      Math.round(best.km),
      'km vs',
      Math.round(messy.km),
      'retour',
      hhmm(best.backAt),
      best.visits.map((v) => `${hhmm(v.start)} ${v.stop.id}`).join(', '),
    );
  });
});
