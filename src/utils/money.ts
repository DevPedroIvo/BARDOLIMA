/**
 * Utilitário para cálculo e formatação monetária exata (2 casas decimais).
 * Elimina imprecisões de ponto flutuante IEEE 754 (ex: 22.290000000000003 -> 22.29).
 */

export const round2 = (val: number | string | undefined | null): number => {
  const n = typeof val === 'number' ? val : parseFloat(String(val || 0));
  if (isNaN(n) || !isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

export const formatMoney = (val: number | string | undefined | null): string => {
  return round2(val).toFixed(2);
};
