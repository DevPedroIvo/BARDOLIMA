/**
 * egresTracker.ts
 * Monitoramento leve e local de chamadas e tráfego estimado de Egress do Supabase.
 * NÃO grava nada no Supabase para não gerar egress adicional.
 */

interface QueryMetric {
  tabela: string;
  operacao: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'HEAD';
  registros: number;
  bytesEstimados: number;
  timestamp: number;
  origem: string;
  cacheHit?: boolean;
}

interface EgressSummary {
  totalConsultas: number;
  totalBytesEstimados: number;
  totalCacheHits: number;
  bytesEconomizadosEstimados: number;
  porTabela: Record<string, { chamadas: number; bytes: number; cacheHits: number }>;
}

const STORAGE_KEY = '010_egress_monitor_metrics';

class EgressTracker {
  private resumo: EgressSummary = {
    totalConsultas: 0,
    totalBytesEstimados: 0,
    totalCacheHits: 0,
    bytesEconomizadosEstimados: 0,
    porTabela: {}
  };

  private ultimasMetricas: QueryMetric[] = [];
  private readonly maxHistorico = 100;

  constructor() {
    this.carregar();
  }

  private carregar() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const salvo = sessionStorage.getItem(STORAGE_KEY);
        if (salvo) {
          const parsed = JSON.parse(salvo);
          this.resumo = parsed.resumo || this.resumo;
        }
      }
    } catch {
      // Silencioso
    }
  }

  private persistir() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ resumo: this.resumo }));
      }
    } catch {
      // Silencioso
    }
  }

  registrar(
    tabela: string,
    operacao: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'HEAD',
    dadosOuBytes: any,
    origem: string = 'app',
    cacheHit: boolean = false
  ) {
    let bytes = 0;
    let registros = 0;

    if (cacheHit) {
      this.resumo.totalCacheHits++;
      if (typeof dadosOuBytes === 'number') {
        bytes = dadosOuBytes;
      } else if (dadosOuBytes) {
        try {
          bytes = new Blob([JSON.stringify(dadosOuBytes)]).size;
        } catch {
          bytes = 1024;
        }
      }
      this.resumo.bytesEconomizadosEstimados += bytes;

      if (!this.resumo.porTabela[tabela]) {
        this.resumo.porTabela[tabela] = { chamadas: 0, bytes: 0, cacheHits: 0 };
      }
      this.resumo.porTabela[tabela].cacheHits++;
      this.persistir();
      return;
    }

    if (typeof dadosOuBytes === 'number') {
      bytes = dadosOuBytes;
      registros = 1;
    } else if (Array.isArray(dadosOuBytes)) {
      registros = dadosOuBytes.length;
      try {
        bytes = new Blob([JSON.stringify(dadosOuBytes)]).size;
      } catch {
        bytes = registros * 250;
      }
    } else if (dadosOuBytes && typeof dadosOuBytes === 'object') {
      registros = 1;
      try {
        bytes = new Blob([JSON.stringify(dadosOuBytes)]).size;
      } catch {
        bytes = 300;
      }
    } else {
      bytes = 64; // HEAD ou vazio
      registros = 0;
    }

    this.resumo.totalConsultas++;
    this.resumo.totalBytesEstimados += bytes;

    if (!this.resumo.porTabela[tabela]) {
      this.resumo.porTabela[tabela] = { chamadas: 0, bytes: 0, cacheHits: 0 };
    }
    this.resumo.porTabela[tabela].chamadas++;
    this.resumo.porTabela[tabela].bytes += bytes;

    const metrica: QueryMetric = {
      tabela,
      operacao,
      registros,
      bytesEstimados: bytes,
      timestamp: Date.now(),
      origem,
      cacheHit
    };

    this.ultimasMetricas.unshift(metrica);
    if (this.ultimasMetricas.length > this.maxHistorico) {
      this.ultimasMetricas.pop();
    }

    this.persistir();
  }

  obterResumo(): EgressSummary {
    return { ...this.resumo };
  }

  obterUltimasMetricas(): QueryMetric[] {
    return [...this.ultimasMetricas];
  }

  zerar() {
    this.resumo = {
      totalConsultas: 0,
      totalBytesEstimados: 0,
      totalCacheHits: 0,
      bytesEconomizadosEstimados: 0,
      porTabela: {}
    };
    this.ultimasMetricas = [];
    this.persistir();
  }
}

export const egressTracker = new EgressTracker();
