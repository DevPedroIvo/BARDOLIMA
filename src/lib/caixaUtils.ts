import { Caixa010, Venda010 } from '../types/010types';
import { getYMDLocal, parseDateSafe } from '../utils/dateUtils';

/**
 * Retorna o timestamp em milissegundos de quando o caixa foi aberto.
 */
export function getCaixaAberturaTimestamp(caixa: Caixa010): number {
  if (!caixa) return 0;

  // 1. Prioridade: Se o ID segue o padrão cx-<timestamp>
  if (caixa.id && caixa.id.startsWith('cx-')) {
    const rawTs = parseInt(caixa.id.replace('cx-', ''), 10);
    if (!isNaN(rawTs) && rawTs > 1000000000000) {
      return rawTs;
    }
  }

  // 2. Campo created_at vindo do banco de dados
  if ((caixa as any).created_at) {
    const t = new Date((caixa as any).created_at).getTime();
    if (!isNaN(t)) return t;
  }

  // 3. Fallback: data + hora_abertura (YYYY-MM-DDTHH:mm:00)
  if (caixa.data) {
    const hora = caixa.hora_abertura || '00:00';
    const t = new Date(`${caixa.data}T${hora}:00`).getTime();
    if (!isNaN(t)) return t;
  }

  return 0;
}

/**
 * Retorna o timestamp em milissegundos de fechamento do caixa (se fechado).
 */
export function getCaixaFechamentoTimestamp(caixa: Caixa010): number {
  if (!caixa || caixa.status !== 'Fechado') return Infinity;

  const tsAbertura = getCaixaAberturaTimestamp(caixa);

  if (caixa.hora_fechamento && caixa.data) {
    let dFim = new Date(`${caixa.data}T${caixa.hora_fechamento}:00`);
    // Se a hora de fechamento for numericamente menor que a de abertura (virou a madrugada),
    // o fechamento ocorreu no dia seguinte (+24h)
    if (dFim.getTime() < tsAbertura) {
      dFim = new Date(dFim.getTime() + 24 * 60 * 60 * 1000);
    }
    return dFim.getTime();
  }

  return Infinity;
}

/**
 * Verifica rigorosamente se uma venda pertence a um determinado caixa.
 * Elimina o vazamento de vendas entre caixas e expedientes que passam da meia-noite.
 */
export function isVendaDoCaixa(
  venda: Venda010,
  caixa: Caixa010,
  todosCaixas: Caixa010[] = []
): boolean {
  if (!venda || !caixa) return false;
  if (venda.status === 'Cancelada') return false;

  // 1. Se a venda possui vínculo direto gravado via caixa_id:
  if (venda.caixa_id) {
    return venda.caixa_id === caixa.id;
  }

  // 2. Se a venda NÃO possui caixa_id gravado (legado ou fallback):
  const dVenda = parseDateSafe(venda.data_hora);
  const tsVenda = dVenda.getTime();
  if (isNaN(tsVenda)) return false;

  const vendaDataYMD = getYMDLocal(venda.data_hora);
  const caixaDataYMD = caixa.data || '';

  const tsAbertura = getCaixaAberturaTimestamp(caixa);
  if (tsAbertura > 0 && tsVenda < tsAbertura) {
    // Venda realizada ANTES da abertura deste caixa -> NUNCA pertence a ele!
    return false;
  }

  // Se o caixa está atualmente aberto: qualquer venda após a abertura pertence a ele
  // (mesmo que tenha passado da meia-noite), a menos que outro caixa posterior tenha sido aberto.
  if (caixa.status === 'Aberto') {
    if (todosCaixas.length > 0) {
      const outroCaixaMaisRecente = todosCaixas.some(outro => {
        if (outro.id === caixa.id) return false;
        const outroTsAbertura = getCaixaAberturaTimestamp(outro);
        return outroTsAbertura > tsAbertura && tsVenda >= outroTsAbertura;
      });
      if (outroCaixaMaisRecente) return false;
    }
    return true;
  }

  // Se o caixa está fechado: verifica timestamp de fechamento
  const tsFechamento = getCaixaFechamentoTimestamp(caixa);
  if (tsVenda > tsFechamento) {
    return false;
  }

  // Se houver outros caixas posteriores abertos antes desta venda:
  if (todosCaixas.length > 0) {
    const outroCaixaMaisRecente = todosCaixas.some(outro => {
      if (outro.id === caixa.id) return false;
      const outroTsAbertura = getCaixaAberturaTimestamp(outro);
      return outroTsAbertura > tsAbertura && tsVenda >= outroTsAbertura;
    });
    if (outroCaixaMaisRecente) return false;
  }

  return true;
}

/**
 * Filtra as vendas pertencentes a um caixa específico.
 */
export function getVendasDoCaixa(
  vendas: Venda010[],
  caixa: Caixa010 | null | undefined,
  todosCaixas: Caixa010[] = []
): Venda010[] {
  if (!caixa) return [];
  return vendas.filter(v => isVendaDoCaixa(v, caixa, todosCaixas));
}
