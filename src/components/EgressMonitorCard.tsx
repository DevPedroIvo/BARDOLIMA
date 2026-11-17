import React, { useState, useEffect } from 'react';
import { egressTracker } from '../lib/egressTracker';
import { idbCache } from '../lib/indexedDbCache';
import { 
  Activity, 
  Database, 
  Zap, 
  Trash2, 
  RefreshCw, 
  ArrowDownCircle, 
  ShieldCheck, 
  TrendingDown,
  CheckCircle2
} from 'lucide-react';

export const EgressMonitorCard: React.FC = () => {
  const [resumo, setResumo] = useState(() => egressTracker.obterResumo());
  const [metricas, setMetricas] = useState(() => egressTracker.obterUltimasMetricas());
  const [avisoLimpeza, setAvisoLimpeza] = useState(false);

  const atualizar = () => {
    setResumo(egressTracker.obterResumo());
    setMetricas(egressTracker.obterUltimasMetricas());
  };

  useEffect(() => {
    const interval = setInterval(atualizar, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLimparCache = async () => {
    await idbCache.clearAll();
    egressTracker.zerar();
    atualizar();
    setAvisoLimpeza(true);
    setTimeout(() => setAvisoLimpeza(false), 3000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const tabelasOrdenadas = Object.entries(resumo.porTabela).sort((a, b) => b[1].bytes - a[1].bytes);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-2">
        <div>
          <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Monitor Operacional de Egress Supabase</span>
          </h3>
          <p className="text-xs text-zinc-400 font-medium">
            Métricas em tempo real de tráfego de rede, chamadas evitadas e economia de franquia local
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={atualizar}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors"
            title="Atualizar métricas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLimparCache}
            className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
            title="Limpar cache local do IndexedDB"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Cache Local</span>
          </button>
        </div>
      </div>

      {avisoLimpeza && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Cache local do IndexedDB e contadores de Egress reiniciados com sucesso!</span>
        </div>
      )}

      {/* Grid de Cards de Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold uppercase">Consultas na Nuvem</span>
            <Database className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl font-black text-zinc-100">{resumo.totalConsultas}</div>
          <div className="text-[10px] text-zinc-400">Total disparado ao Supabase</div>
        </div>

        <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold uppercase">Egress Estimado</span>
            <ArrowDownCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-400">{formatBytes(resumo.totalBytesEstimados)}</div>
          <div className="text-[10px] text-zinc-400">Tráfego transferido nesta sessão</div>
        </div>

        <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold uppercase">Cache Hits</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">{resumo.totalCacheHits}</div>
          <div className="text-[10px] text-emerald-400/80">Requisições poupadas</div>
        </div>

        <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold uppercase">Egress Economizado</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">{formatBytes(resumo.bytesEconomizadosEstimados)}</div>
          <div className="text-[10px] text-zinc-400">Evitado pelo IndexedDB / Deltas</div>
        </div>
      </div>

      {/* Detalhamento por Tabela */}
      <div className="space-y-2 pt-2">
        <h4 className="font-bold text-zinc-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-orange-500" />
          <span>Consumo de Egress por Tabela</span>
        </h4>
        
        {tabelasOrdenadas.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 text-xs bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
            Nenhuma consulta registrada ainda. Navegue pelo sistema para visualizar o tráfego gerado.
          </div>
        ) : (
          <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/90 text-zinc-400 font-bold border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Tabela</th>
                  <th className="py-2.5 px-3 text-center">Consultas Nuvem</th>
                  <th className="py-2.5 px-3 text-center">Atendidas por Cache</th>
                  <th className="py-2.5 px-3 text-right">Egress Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {tabelasOrdenadas.map(([tabela, stat]) => (
                  <tr key={tabela} className="hover:bg-zinc-900/50">
                    <td className="py-2.5 px-3 font-bold text-zinc-200 font-mono">
                      {tabela}
                    </td>
                    <td className="py-2.5 px-3 text-center text-zinc-300 font-mono">
                      {stat.chamadas}
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold font-mono">
                      {stat.cacheHits}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-amber-400 font-mono">
                      {formatBytes(stat.bytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nota de Esclarecimento sobre Métricas Oficiais vs Estimativas */}
      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 text-xs text-zinc-400 space-y-1">
        <div className="flex items-center gap-2 font-bold text-zinc-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Esclarecimento Técnico: Estimativa Local vs Painel Oficial</span>
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-400">
          Os valores acima são <strong>estimativas de telemetria calculadas no cliente</strong> a partir dos payloads serializados transferidos via REST API. O consumo oficial e faturado de Egress inclui cabeçalhos HTTP, encriptação TLS e conexões de infraestrutura, sendo aferido com exatidão unicamente no painel do Supabase (<span className="text-zinc-300 font-mono">Dashboard &gt; Organization &gt; Reports &gt; Egress</span>).
        </p>
      </div>
    </div>
  );
};
