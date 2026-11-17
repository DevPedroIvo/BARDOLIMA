import React, { useMemo } from 'react';
import { 
  Produto010, 
  Venda010, 
  ContaReceber010, 
  Caixa010,
  ModuleTab 
} from '../types/010types';
import { getVendasDoCaixa } from '../lib/caixaUtils';
import { isSameDayLocal } from '../utils/dateUtils';
import { 
  ShoppingBag, 
  TrendingUp, 
  TrendingDown,
  Package, 
  PlusCircle, 
  PieChart, 
  Calendar,
  Award
} from 'lucide-react';

interface Dashboard010Props {
  produtos: Produto010[];
  vendas: Venda010[];
  caixas?: Caixa010[];
  contasReceber: ContaReceber010[];
  isOnline: boolean;
  isSynced: boolean;
  onNavigate: (tab: ModuleTab) => void;
  onOpenNovaVenda: () => void;
  onOpenCadastrarProduto: () => void;
  onOpenEntradaEstoque: () => void;
  onOpenAbrirCaixa: () => void;
}

export const Dashboard010: React.FC<Dashboard010Props> = ({
  produtos,
  vendas,
  caixas = [],
  onNavigate,
  onOpenNovaVenda,
  onOpenCadastrarProduto
}) => {
  // Datas no formato local YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Identifica o caixa ativo do dia/turno atual (se aberto) ou o caixa de hoje
  const caixaAtivo = useMemo(() => {
    if (!caixas || caixas.length === 0) return null;
    const aberto = caixas.find(c => c.status === 'Aberto');
    if (aberto) return aberto;
    return caixas.find(c => c.data === todayStr) || null;
  }, [caixas, todayStr]);

  // Vendas Hoje: refletem estritamente as vendas realizadas na data de hoje
  const vendasHojeList = useMemo(() => {
    if (!vendas || vendas.length === 0) return [];
    return vendas
      .filter(v => v.status !== 'Cancelada' && isSameDayLocal(v.data_hora))
      .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
  }, [vendas]);

  const vendasHojeTotal = useMemo(() => {
    return vendasHojeList.reduce((acc, v) => acc + (v.total || 0), 0);
  }, [vendasHojeList]);

  // Vendas Ontem: refletem estritamente as vendas realizadas no dia anterior
  const dataOntemRef = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }, []);

  const vendasOntemList = useMemo(() => {
    if (!vendas || vendas.length === 0) return [];
    return vendas.filter(v => v.status !== 'Cancelada' && isSameDayLocal(v.data_hora, dataOntemRef));
  }, [vendas, dataOntemRef]);

  const vendasOntemTotal = useMemo(() => {
    return vendasOntemList.reduce((acc, v) => acc + (v.total || 0), 0);
  }, [vendasOntemList]);

  // Comparativo percentual com ontem baseado em DADOS REAIS
  const comparativoOntem = useMemo(() => {
    if (vendasOntemTotal === 0 && vendasHojeTotal === 0) {
      return { texto: 'Sem vendas registradas hoje', tipo: 'neutral' as const };
    }
    if (vendasOntemTotal === 0 && vendasHojeTotal > 0) {
      return { texto: 'Primeiras vendas do dia (Sem vendas ontem)', tipo: 'positive' as const };
    }
    if (vendasOntemTotal > 0) {
      const pct = ((vendasHojeTotal - vendasOntemTotal) / vendasOntemTotal) * 100;
      if (pct >= 0) {
        return { texto: `+${pct.toFixed(1)}% que ontem`, tipo: 'positive' as const };
      } else {
        return { texto: `${pct.toFixed(1)}% que ontem`, tipo: 'negative' as const };
      }
    }
    return { texto: 'Sem vendas', tipo: 'neutral' as const };
  }, [vendasHojeTotal, vendasOntemTotal]);

  // Indicadores Gerais do Dia
  const numeroVendas = vendasHojeList.length;
  const ticketMedio = numeroVendas > 0 ? vendasHojeTotal / numeroVendas : 0;
  const totalProdutosVendidos = vendasHojeList.reduce((acc, v) => {
    const itens = Array.isArray(v.produtos) 
      ? v.produtos 
      : (typeof v.produtos === 'string' ? (() => { try { return JSON.parse(v.produtos); } catch { return []; } })() : []);
    return acc + itens.reduce((pAcc: number, p: any) => {
      if (p?.produto_id === 'taxa-deslocamento' || String(p?.produto_id || '').startsWith('parcial-')) return pAcc;
      return pAcc + (p.quantidade || 0);
    }, 0);
  }, 0);

  const produtosEstoqueBaixo = produtos.filter(p => p.quantidade > 0 && p.quantidade <= p.estoque_minimo);
  const produtosSemEstoque = produtos.filter(p => p.quantidade === 0);

  // Consolida os produtos mais vendidos nas vendas reais
  const produtosMaisVendidos = useMemo(() => {
    const mapa = new Map<string, { nome: string; quantidade: number; total: number }>();
    (vendas || []).filter(v => v.status !== 'Cancelada').forEach(v => {
      const itens = Array.isArray(v.produtos) 
        ? v.produtos 
        : (typeof v.produtos === 'string' ? (() => { try { return JSON.parse(v.produtos); } catch { return []; } })() : []);
      itens.forEach(p => {
        if (!p || p.produto_id === 'taxa-deslocamento' || String(p.produto_id || '').startsWith('parcial-')) return;
        const key = p.produto_id || p.nome;
        const ex = mapa.get(key);
        if (ex) {
          ex.quantidade += (p.quantidade || 0);
          ex.total += (p.subtotal || ((p.quantidade || 0) * (p.preco_unitario || 0)));
        } else {
          mapa.set(key, {
            nome: p.nome || 'Produto',
            quantidade: p.quantidade || 0,
            total: p.subtotal || ((p.quantidade || 0) * (p.preco_unitario || 0))
          });
        }
      });
    });
    return Array.from(mapa.values()).sort((a, b) => b.quantidade - a.quantidade).slice(0, 4);
  }, [vendas]);

  // Formas de Pagamento resumo (Vendas de hoje)
  const vendasPorPagamento = useMemo(() => {
    const map: Record<string, number> = {};
    vendasHojeList.forEach(v => {
      if (v.pagamentos && v.pagamentos.length > 0) {
        v.pagamentos.forEach(p => {
          map[p.forma] = (map[p.forma] || 0) + p.valor;
        });
      } else {
        const forma = v.forma_pagamento || 'Outros';
        map[forma] = (map[forma] || 0) + v.total;
      }
    });
    return map;
  }, [vendasHojeList]);

  // Gráfico dos últimos 7 dias com DADOS REAIS
  const ultimos7Dias = useMemo(() => {
    const dias = [];
    const hoje = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const rawDay = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const labelDia = rawDay.charAt(0).toUpperCase() + rawDay.slice(1, 3);
      const diaMes = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

      const vendasDoDia = vendas.filter(v => {
        if (v.status === 'Cancelada') return false;
        return isSameDayLocal(v.data_hora, d);
      });

      const totalDia = vendasDoDia.reduce((acc, v) => acc + (v.total || 0), 0);

      dias.push({
        data: dateStr,
        dia: labelDia,
        diaMes,
        valor: totalDia,
        count: vendasDoDia.length
      });
    }

    return dias;
  }, [vendas]);

  const maxValor7Dias = useMemo(() => {
    return Math.max(...ultimos7Dias.map(d => d.valor), 1);
  }, [ultimos7Dias]);

  const faturamento7DiasTotal = useMemo(() => {
    return ultimos7Dias.reduce((acc, d) => acc + d.valor, 0);
  }, [ultimos7Dias]);

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-in fade-in duration-150">
      {/* Banner Superior & Ações Rápidas com Logo Oficial */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 lg:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-20 sm:w-24 rounded-2xl overflow-hidden border border-blue-400/30 bg-white/95 p-1.5 shadow-lg shrink-0 flex items-center justify-center">
            <img src="/logo.png" alt="Bar do Lima" className="w-full h-auto object-contain rounded-xl" />
          </div>
          <div>
            <span className="text-orange-500 font-black text-xs uppercase tracking-wider">Painel Geral • Dashboard</span>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100 mt-0.5">Bar do Lima</h1>
            <p className="text-xs text-zinc-300 mt-0.5">Cerveja gelada, variedade e atendimento rápido! Acompanhe seus indicadores em tempo real.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={onOpenNovaVenda}
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Nova Venda</span>
          </button>

          <button
            onClick={onOpenCadastrarProduto}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-100 font-bold rounded-xl text-xs border border-zinc-700 flex items-center justify-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4 text-orange-500" />
            <span>Cad. Produto</span>
          </button>
        </div>
      </div>

      {/* Grid de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Vendas Hoje */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase">Vendas Hoje</span>
          <div className="text-xl font-black text-zinc-100">
            R$ {vendasHojeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-[11px] font-bold flex items-center gap-1 ${
            comparativoOntem.tipo === 'positive' ? 'text-emerald-400' :
            comparativoOntem.tipo === 'negative' ? 'text-rose-400' :
            'text-zinc-400'
          }`}>
            {comparativoOntem.tipo === 'positive' && <TrendingUp className="w-3 h-3" />}
            {comparativoOntem.tipo === 'negative' && <TrendingDown className="w-3 h-3" />}
            <span>{comparativoOntem.texto}</span>
          </div>
        </div>

        {/* Número de Vendas */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase">Nº de Vendas</span>
          <div className="text-xl font-black text-orange-500">{numeroVendas} vendas</div>
          <div className="text-[11px] text-zinc-400">Registradas hoje no PDV</div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase">Ticket Médio</span>
          <div className="text-xl font-black text-zinc-100">
            R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-400">Média por venda hoje</div>
        </div>

        {/* Produtos Vendidos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase">Produtos Vendidos</span>
          <div className="text-xl font-black text-zinc-100">{totalProdutosVendidos} un</div>
          <div className="text-[11px] text-zinc-400">Unidades hoje</div>
        </div>

        {/* Estoque Baixo */}
        <div 
          onClick={() => onNavigate('estoque')}
          className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 cursor-pointer rounded-2xl p-4 space-y-2 transition-all"
        >
          <span className="text-[11px] font-bold text-zinc-400 uppercase">Estoque Baixo / Sem Estoque</span>
          <div className="text-xl font-black text-orange-400">{produtosEstoqueBaixo.length + produtosSemEstoque.length} itens</div>
          <div className="text-[11px] text-orange-400 font-bold">Reposição necessária</div>
        </div>
      </div>

      {/* Grid Intermediário: Formas de Pagamento + Produtos Mais Vendidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formas de Pagamento */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h4 className="font-bold text-zinc-100 text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-orange-500" />
              <span>Formas de Pagamento (Hoje)</span>
            </h4>
          </div>

          <div className="space-y-3 text-xs font-semibold">
            {['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito'].map((forma) => {
              const valor = vendasPorPagamento[forma] || 0;
              const pct = vendasHojeTotal > 0 ? (valor / vendasHojeTotal) * 100 : 0;

              return (
                <div key={forma} className="space-y-1">
                  <div className="flex justify-between text-zinc-300">
                    <span>{forma}</span>
                    <span className="font-bold text-zinc-100">R$ {valor.toFixed(2)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                    <div className="bg-orange-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Produtos Mais Vendidos / Catálogo em Destaque */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h4 className="font-bold text-zinc-100 text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-500" />
              <span>{produtosMaisVendidos.length > 0 ? 'Produtos Mais Vendidos' : 'Produtos Cadastrados'}</span>
            </h4>
            <button 
              onClick={() => onNavigate(produtosMaisVendidos.length > 0 ? 'relatorios' : 'produtos')} 
              className="text-xs text-orange-400 font-bold hover:underline"
            >
              {produtosMaisVendidos.length > 0 ? 'Ver Relatório Completo' : `Ver Todos (${produtos.length})`}
            </button>
          </div>

          <div className="space-y-3">
            {produtosMaisVendidos.length > 0 ? (
              produtosMaisVendidos.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-zinc-950 rounded-xl border border-zinc-800/80">
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-500 font-black text-xs flex items-center justify-center shrink-0">
                      #{i + 1}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-zinc-200 block truncate">{p.nome}</span>
                      <span className="text-[10px] text-zinc-500">{p.quantidade} un vendidas</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-orange-400 shrink-0 font-mono">
                    R$ {p.total.toFixed(2)}
                  </span>
                </div>
              ))
            ) : produtos.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs">
                Nenhum produto cadastrado no momento.
              </div>
            ) : (
              produtos.slice(0, 4).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-zinc-950 rounded-xl border border-zinc-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-500 font-black text-xs flex items-center justify-center">
                      #{i + 1}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-zinc-200 block line-clamp-1">{p.nome}</span>
                      <span className="text-[10px] text-zinc-500">Estoque: {p.quantidade}un</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-orange-400">R$ {p.preco.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de Desempenho de Vendas e Faturamento (DADOS REAIS dos Últimos 7 Dias) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <span>Desempenho de Vendas e Faturamento</span>
            </h3>
            <p className="text-xs text-zinc-400">Histórico de faturamento real dos últimos 7 dias</p>
          </div>

          <div className="px-3.5 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Total 7 dias: R$ {faturamento7DiasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Barras do Gráfico com Dados Reais */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 mb-2">
            <span>Volume de Vendas Diário (R$) — Dados Reais</span>
            <span className="text-orange-400 font-bold">{vendas.length} vendas gravadas</span>
          </div>

          <div className="grid grid-cols-7 gap-2 items-end h-44 pt-6 px-2 bg-zinc-950 rounded-xl border border-zinc-800/80">
            {ultimos7Dias.map((bar, idx) => {
              const alturaPct = Math.max((bar.valor / maxValor7Dias) * 100, 4);

              return (
                <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                  <div 
                    className="w-full bg-orange-500 hover:bg-orange-400 rounded-t-lg transition-all relative group-hover:scale-105"
                    style={{ height: `${alturaPct}%` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-200 px-2 py-1 rounded-lg font-bold whitespace-nowrap shadow-xl transition-opacity pointer-events-none z-10">
                      <div>R$ {bar.valor.toFixed(2)}</div>
                      <div className="text-[9px] text-orange-400 font-normal">{bar.count} vendas</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-zinc-300 capitalize">{bar.dia}</span>
                    <span className="text-[9px] text-zinc-500 font-mono">{bar.diaMes}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

