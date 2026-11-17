/**
 * Utilitários de Data e Fuso Horário Local (Brasil - UTC-3 / America/Sao_Paulo).
 * Garante que vendas, caixas e logs sejam sempre salvos e exibidos no horário local oficial brasileiro (America/Sao_Paulo),
 * evitando discrepâncias entre UTC (+00:00) e o horário real do estabelecimento.
 */

const FUSO_BRASIL = 'America/Sao_Paulo';

/**
 * Retorna a data e hora atual no formato ISO com o deslocamento de fuso horário brasileiro explícito (-03:00).
 * Exemplo: "2026-10-19T20:52:00-03:00".
 */
export const getNowIsoWithTimezone = (): string => {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_BRASIL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = dtf.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  let hour = getPart('hour');
  if (hour === '24') hour = '00';
  const minute = getPart('minute');
  const second = getPart('second');

  return `${year}-${month}-${day}T${hour}:${minute}:${second}-03:00`;
};

/**
 * Faz parse seguro de qualquer formato de data recebido do Supabase ou LocalStorage,
 * incluindo formatos PostgreSQL como "2026-10-19 23:52:00", "2026-10-19T23:52:00",
 * "18 Oct 2026 15:47:24 (+0000)" ou "2026-10-18 15:47:24+00".
 * 
 * Timestamps gravados pelo Supabase sem timezone são gerados pelo servidor em UTC;
 * portanto, são normalizados como UTC para posterior conversão precisa para America/Sao_Paulo.
 */
export const parseDateSafe = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'number') return new Date(val);

  let str = String(val).trim();

  // Caso seja apenas data 'YYYY-MM-DD' (ex: data do caixa '2026-10-19')
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(`${str}T12:00:00-03:00`);
  }

  // Normaliza formato PostgreSQL (+0000) ou (+00) para 'Z' (UTC)
  str = str.replace(/\s*\(\+0000\)/g, 'Z').replace(/\s*\(\+00\)/g, 'Z');

  // Normaliza '+00' ou '-00' no final da string para '+00:00'
  str = str.replace(/([+-]00)$/, '$1:00');

  // Se for string no formato ISO ou SQL sem timezone explícita (ex: "2026-10-19 23:52:00" ou "2026-10-19T23:52:00"):
  // Como o Supabase/Postgres opera em UTC, tratamos como UTC adicionando 'Z'
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date();
};

/**
 * Formata data e hora no padrão brasileiro oficial (DD/MM/AAAA HH:mm:ss) no fuso America/Sao_Paulo.
 */
export const formatDateTimeLocal = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '-';
  try {
    const d = parseDateSafe(dateInput);
    return d.toLocaleString('pt-BR', {
      timeZone: FUSO_BRASIL,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return String(dateInput);
  }
};

/**
 * Formata apenas a hora no padrão brasileiro oficial (HH:mm) no fuso America/Sao_Paulo.
 */
export const formatTimeLocal = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '--:--';
  try {
    const d = parseDateSafe(dateInput);
    return d.toLocaleTimeString('pt-BR', {
      timeZone: FUSO_BRASIL,
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(dateInput);
  }
};

/**
 * Formata apenas a data no padrão brasileiro (DD/MM/AAAA) no fuso America/Sao_Paulo.
 */
export const formatDateOnlyLocal = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '-';
  try {
    const d = parseDateSafe(dateInput);
    return d.toLocaleDateString('pt-BR', {
      timeZone: FUSO_BRASIL,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return String(dateInput);
  }
};

/**
 * Retorna a data no formato YYYY-MM-DD no fuso horário oficial brasileiro (America/Sao_Paulo).
 */
export const getYMDLocal = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '';
  try {
    const d = parseDateSafe(dateInput);
    if (isNaN(d.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO_BRASIL,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
  } catch {
    return '';
  }
};

/**
 * Verifica se uma data corresponde exatamente ao mesmo dia civil no fuso America/Sao_Paulo de targetDate (padrão: hoje).
 */
export const isSameDayLocal = (dateInput?: string | Date | null, targetDate: Date = new Date()): boolean => {
  if (!dateInput) return false;
  try {
    const ymd1 = getYMDLocal(dateInput);
    const ymd2 = getYMDLocal(targetDate);
    return Boolean(ymd1 && ymd2 && ymd1 === ymd2);
  } catch {
    return false;
  }
};

