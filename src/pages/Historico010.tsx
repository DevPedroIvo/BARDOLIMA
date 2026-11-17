import React, { useState, useMemo } from 'react';
import { Venda010, AuditLog010 } from '../types/010types';
import { formatDateTimeLocal } from '../utils/dateUtils';
import { supabaseService } from '../services/supabaseService';
import { 
  History, 
  Search, 
  UserCheck, 
  ShieldCheck, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  XCircle, 
  CheckCircle2, 
  Printer, 
  Eye, 
  X, 
  CreditCard, 
  Receipt, 
  AlertTriangle,
  User,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface Historico010Props {
  logs?: AuditLog010[];
  vendas?: Venda010[];
  onCancelarVenda?: (vendaId: string) => void;
}

export const Historico010: React.FC<Historico010Props> = ({ 
  logs = [], 
  vendas = [], 
  onCancelarVenda 
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'vendas' | 'audit'>('vendas');
  
  // Vendas Filter State & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [periodoFilter, setPeriodoFilter] = useState<'todas' | 'hoje' | '7dias' | '30dias' | 'mes'>('todas');
  const [pagamentoFilter, setPagamentoFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'Concluída' | 'Cancelada'>('todos');
  const [pageVendas, setPageVendas] = useState(1);
  const vendasPorPagina = 25;

  // Carregamento histórico sob demanda para não sobrecarregar o polling
  const [extraVendas, setExtraVendas] = useState<Venda010[]>([]);
  const [isCarregandoHistorico, setIsCarregandoHistorico] = useState(false);
  const [totalHistoricoCarregado, setTotalHistoricoCarregado] = useState(false);

  // Consolidação de vendas locais + histórico sob demanda
  const todasVendas = useMemo(() => {
    const map = new Map<string, Venda010>();
    vendas.forEach(v => map.set(v.id, v));
    extraVendas.forEach(v => map.set(v.id, v));
    return Array.from(map.values()).sort((a, b) => (b.data_hora || '').localeCompare(a.data_hora || ''));
  }, [vendas, extraVendas]);

  const handleCarregarMaisVendas = async () => {
    if (isCarregandoHistorico) return;
    setIsCarregandoHistorico(true);
    try {
      const mais = await supabaseService.fetchVendas(500, true);
      if (mais && mais.length > 0) {
        setExtraVendas(mais);
        setTotalHistoricoCarregado(true);
      }
    } finally {
      setIsCarregandoHistorico(false);
    }
  };

  // Audit Logs Filter State & Pagination
  const [auditSearch, setAuditSearch] = useState('');
  const [pageAudit, setPageAudit] = useState(1);
  const logsPorPagina = 25;

  // Modais State
  const [selectedVenda, setSelectedVenda] = useState<Venda010 | null>(null);
  const [vendaParaCancelar, setVendaParaCancelar] = useState<Venda010 | null>(null);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);

  // Helper para datas
  const isDateInPeriod = (dateStr: string, period: string) => {
    if (period === 'todas') return true;
    const itemDate = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'hoje') {
      return itemDate >= today;
    }
    if (period === '7dias') {
      const past7 = new Date(today);
      past7.setDate(past7.getDate() - 7);
      return itemDate >= past7;
    }
    if (period === '30dias') {
      const past30 = new Date(today);
      past30.setDate(past30.getDate() - 30);
      return itemDate >= past30;
    }
    if (period === 'mes') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Vendas filtradas
  const filteredVendas = useMemo(() => {
    return todasVendas.filter(v => {
      const numStr = `#${v.numero_venda}`;
      const userStr = (v.usuario || '').toLowerCase();
      const clientStr = (v.cliente_nome || '').toLowerCase();
      const pagStr = (v.forma_pagamento || '').toLowerCase();
      const search = searchTerm.toLowerCase().trim();

      const matchSearch = !search || 
        numStr.toLowerCase().includes(search) ||
        userStr.includes(search) ||
        clientStr.includes(search) ||
        pagStr.includes(search) ||
        (Array.isArray(v.produtos) && v.produtos.some(p => (p.nome || '').toLowerCase().includes(search)));

      const matchPeriod = isDateInPeriod(v.data_hora, periodoFilter);

      const matchPagamento = pagamentoFilter === 'todos' || 
        (v.forma_pagamento || '').toLowerCase().includes(pagamentoFilter.toLowerCase());

      const matchStatus = statusFilter === 'todos' || v.status === statusFilter;

      return matchSearch && matchPeriod && matchPagamento && matchStatus;
    });
  }, [todasVendas, searchTerm, periodoFilter, pagamentoFilter, statusFilter]);

  // Estatísticas das Vendas Filtradas
  const metrics = useMemo(() => {
    const concluídas = filteredVendas.filter(v => v.status !== 'Cancelada');
    const canceladas = filteredVendas.filter(v => v.status === 'Cancelada');

    const totalFaturado = concluídas.reduce((acc, v) => acc + (v.total || 0), 0);
    const qtdVendas = concluídas.length;
    const ticketMedio = qtdVendas > 0 ? totalFaturado / qtdVendas : 0;

    const totalCancelado = canceladas.reduce((acc, v) => acc + (v.total || 0), 0);
    const qtdCanceladas = canceladas.length;

    return {
      totalFaturado,
      qtdVendas,
      ticketMedio,
      totalCancelado,
      qtdCanceladas
    };
  }, [filteredVendas]);

  // Vendas paginadas
  const totalPagesVendas = Math.max(1, Math.ceil(filteredVendas.length / vendasPorPagina));
  const vendasExibidas = useMemo(() => {
    const start = (pageVendas - 1) * vendasPorPagina;
    return filteredVendas.slice(start, start + vendasPorPagina);
  }, [filteredVendas, pageVendas, vendasPorPagina]);

  // Logs de Auditoria Filtrados e paginados
  const filteredAuditLogs = useMemo(() => {
    return logs.filter(l => {
      const search = auditSearch.toLowerCase().trim();
      if (!search) return true;
      return (
        (l.usuario || '').toLowerCase().includes(search) ||
        (l.acao || '').toLowerCase().includes(search) ||
        (l.registro_relacionado || '').toLowerCase().includes(search) ||
        (l.detalhes || '').toLowerCase().includes(search)
      );
    });
  }, [logs, auditSearch]);

  const totalPagesAudit = Math.max(1, Math.ceil(filteredAuditLogs.length / logsPorPagina));
  const logsExibidos = useMemo(() => {
    const start = (pageAudit - 1) * logsPorPagina;
    return filteredAuditLogs.slice(start, start + logsPorPagina);
  }, [filteredAuditLogs, pageAudit, logsPorPagina]);

  const handleConfirmCancel = () => {
    if (vendaParaCancelar && onCancelarVenda) {
      onCancelarVenda(vendaParaCancelar.id);
      setVendaParaCancelar(null);
      setSelectedVenda(null);
      setShowCancelSuccess(true);
      setTimeout(() => setShowCancelSuccess(false), 3000);
    }
  };

  const handlePrintReceipt = (venda: Venda010) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const itemsHtml = (venda.produtos || []).map(p => `
      <tr>
        <td style="padding: 4px 0;">${p.nome} x${p.quantidade}</td>
        <td style="text-align: right; padding: 4px 0;">R$ ${(p.subtotal || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Recibo Venda #${venda.numero_venda}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 280px; padding: 10px; margin: 0 auto; font-size: 12px; }
            h2, h3 { text-align: center; margin: 5px 0; }
            .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <h2>BAR DO LIMA</h2>
          <div class="center">Gestão e Vendas</div>
          <div class="line"></div>
          <div><strong>Venda #${venda.numero_venda}</strong></div>
          <div>Data: ${formatDateTimeLocal(venda.data_hora)}</div>
          <div>Caixa / Operador: ${venda.usuario}</div>
          <div>Cliente: ${venda.cliente_nome || 'Consumidor Balcão'}</div>
          <div class="line"></div>
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th style="text-align: left;">Item</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="line"></div>
          <table>
            <tr><td>Subtotal:</td><td class="right">R$ ${(venda.subtotal || venda.total).toFixed(2)}</td></tr>
            ${venda.taxa_deslocamento ? `<tr><td>Taxa Desloc.:</td><td class="right">+ R$ ${venda.taxa_deslocamento.toFixed(2)}</td></tr>` : ''}
            ${venda.desconto_valor ? `<tr><td>Desconto:</td><td class="right">- R$ ${venda.desconto_valor.toFixed(2)}</td></tr>` : ''}
            <tr class="bold" style="font-size: 14px;"><td>TOTAL:</td><td class="right">R$ ${venda.total.toFixed(2)}</td></tr>
            <tr><td>Pagamento:</td><td class="right">${venda.forma_pagamento}</td></tr>
            ${venda.valor_recebido ? `<tr><td>Valor Pago:</td><td class="right">R$ ${venda.valor_recebido.toFixed(2)}</td></tr>` : ''}
            ${venda.troco ? `<tr><td>Troco:</td><td class="right">R$ ${venda.troco.toFixed(2)}</td></tr>` : ''}
          </table>
          <div class="line"></div>
          <div class="center" style="margin-top: 15px;">Obrigado pela preferência!</div>
          <div class="center">Volte Sempre!</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-zinc-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-orange-500" />
            <span>Histórico de Vendas & Auditoria</span>
          </h1>
          <p className="text-xs text-zinc-400 font-semibold mt-0.5">
            Consulte vendas realizadas, comprovantes, estornos e logs detalhados de operação
          </p>
        </div>

        {/* Alternate Tabs (Vendas vs Logs) */}
        <div className="bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl flex items-center gap-1 self-start md:self-auto shadow-lg">
          <button
            onClick={() => setActiveMainTab('vendas')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeMainTab === 'vendas'
                ? 'bg-orange-500 text-zinc-950 shadow-md shadow-orange-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Vendas ({todasVendas.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeMainTab === 'audit'
                ? 'bg-orange-500 text-zinc-950 shadow-md shadow-orange-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Logs de Auditoria ({logs.length})</span>
          </button>
        </div>
      </div>

      {showCancelSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl text-xs flex items-center gap-2 font-bold animate-bounce shadow-xl">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>Venda cancelada com sucesso! O estoque dos produtos foi estornado automaticamente.</span>
        </div>
      )}

      {/* VIEW 1: HISTÓRICO DE VENDAS */}
      {activeMainTab === 'vendas' && (
        <div className="space-y-6">
          {/* Metrics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card Total Faturado */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Faturamento Filtrado</span>
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl lg:text-3xl font-black text-emerald-400 tracking-tight">
                  R$ {metrics.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[11px] text-zinc-500 font-medium mt-1">
                  Somatório das vendas concluídas
                </p>
              </div>
            </div>

            {/* Card Qtd Vendas */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Vendas Realizadas</span>
                <div className="w-9 h-9 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl lg:text-3xl font-black text-zinc-100 tracking-tight">
                  {metrics.qtdVendas} <span className="text-xs font-bold text-zinc-400">vendas</span>
                </span>
                <p className="text-[11px] text-zinc-500 font-medium mt-1">
                  Atendimentos concluídos
                </p>
              </div>
            </div>

            {/* Card Ticket Médio */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ticket Médio</span>
                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl lg:text-3xl font-black text-blue-400 tracking-tight">
                  R$ {metrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[11px] text-zinc-500 font-medium mt-1">
                  Valor médio por venda
                </p>
              </div>
            </div>

            {/* Card Cancelamentos */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Vendas Canceladas</span>
                <div className="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl lg:text-3xl font-black text-rose-400 tracking-tight">
                  {metrics.qtdCanceladas} <span className="text-xs font-bold text-zinc-400">({metrics.totalCancelado > 0 ? `R$ ${metrics.totalCancelado.toFixed(2)}` : 'R$ 0,00'})</span>
                </span>
                <p className="text-[11px] text-zinc-500 font-medium mt-1">
                  Operações canceladas/estornadas
                </p>
              </div>
            </div>
          </div>

          {/* Filter Bar & Controls */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 lg:p-5 shadow-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Campo Busca */}
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar por #venda, cliente, bebida ou operador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-medium transition-colors"
                />
              </div>

              {/* Filtro Período */}
              <div className="lg:col-span-3 flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-2xl p-1 overflow-x-auto">
                {[
                  { id: 'todas', label: 'Todas' },
                  { id: 'hoje', label: 'Hoje' },
                  { id: '7dias', label: '7 D' },
                  { id: '30dias', label: '30 D' },
                  { id: 'mes', label: 'Mês' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPeriodoFilter(p.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      periodoFilter === p.id 
                        ? 'bg-orange-500 text-zinc-950 font-black shadow-sm' 
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Filtro Forma de Pagamento */}
              <div className="lg:col-span-3">
                <select
                  value={pagamentoFilter}
                  onChange={(e) => setPagamentoFilter(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-3 py-2.5 text-xs font-bold text-zinc-200 focus:outline-none focus:border-orange-500"
                >
                  <option value="todos">💳 Todas as Formas de Pagamento</option>
                  <option value="pix">⚡ PIX</option>
                  <option value="dinheiro">💵 Dinheiro</option>
                  <option value="crédito">💳 Cartão de Crédito</option>
                  <option value="débito">💳 Cartão de Débito</option>
                  <option value="múltiplo">🔀 Múltiplo</option>
                </select>
              </div>

              {/* Filtro Status */}
              <div className="lg:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-3 py-2.5 text-xs font-bold text-zinc-200 focus:outline-none focus:border-orange-500"
                >
                  <option value="todos">📌 Todos Status</option>
                  <option value="Concluída">✅ Concluídas</option>
                  <option value="Cancelada">🚫 Canceladas</option>
                </select>
              </div>
            </div>

            {!totalHistoricoCarregado && (
              <div className="pt-2 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-zinc-500 font-medium">
                  Exibindo vendas recentes em memória ({todasVendas.length}). Precisa consultar períodos mais antigos?
                </span>
                <button
                  type="button"
                  onClick={handleCarregarMaisVendas}
                  disabled={isCarregandoHistorico}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCarregandoHistorico ? 'animate-spin' : ''}`} />
                  <span>{isCarregandoHistorico ? 'Consultando...' : 'Carregar + Vendas do Banco'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Vendas List Table / Cards */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            {filteredVendas.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500 mx-auto">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-300">Nenhuma venda encontrada</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Tente alterar os termos de busca ou remover os filtros de período e forma de pagamento.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase font-black tracking-wider text-[10px] border-b border-zinc-800">
                    <tr>
                      <th className="py-3.5 px-4">#Venda / Data</th>
                      <th className="py-3.5 px-4">Cliente / Caixa</th>
                      <th className="py-3.5 px-4">Itens Comprados</th>
                      <th className="py-3.5 px-4">Forma de Pagamento</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Valor Total</th>
                      <th className="py-3.5 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium">
                    {vendasExibidas.map((venda) => {
                      const isCancelada = venda.status === 'Cancelada';
                      const produtosList = Array.isArray(venda.produtos) ? venda.produtos : [];
                      const primItens = produtosList.slice(0, 2);
                      const maisItensQtd = produtosList.length > 2 ? produtosList.length - 2 : 0;

                      return (
                        <tr 
                          key={venda.id} 
                          className={`hover:bg-zinc-800/40 transition-colors group ${
                            isCancelada ? 'opacity-60 bg-rose-500/5' : ''
                          }`}
                        >
                          {/* #Venda / Data */}
                          <td className="py-4 px-4 font-mono">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-orange-400 text-sm">#{venda.numero_venda}</span>
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              {formatDateTimeLocal(venda.data_hora)}
                            </div>
                          </td>

                          {/* Cliente / Caixa */}
                          <td className="py-4 px-4">
                            <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>{venda.cliente_nome || 'Consumidor Balcão'}</span>
                            </div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                              <UserCheck className="w-3 h-3 text-orange-500/80 shrink-0" />
                              <span>Caixa: <strong className="text-zinc-300">{venda.usuario || 'Operador'}</strong></span>
                            </div>
                          </td>

                          {/* Itens Comprados */}
                          <td className="py-4 px-4 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {primItens.map((item, idx) => (
                                <span 
                                  key={idx} 
                                  className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 font-semibold"
                                >
                                  {item.quantidade}x {item.nome}
                                </span>
                              ))}
                              {maisItensQtd > 0 && (
                                <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/30 rounded-lg text-[10px] text-orange-400 font-bold">
                                  +{maisItensQtd} itens
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Forma de Pagamento */}
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                              (venda.forma_pagamento || '').toLowerCase().includes('pix')
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : (venda.forma_pagamento || '').toLowerCase().includes('dinheiro')
                                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                : (venda.forma_pagamento || '').toLowerCase().includes('cartão')
                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                            }`}>
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{venda.forma_pagamento}</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            {isCancelada ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-black uppercase">
                                <XCircle className="w-3 h-3" />
                                <span>Cancelada</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Concluída</span>
                              </span>
                            )}
                          </td>

                          {/* Valor Total */}
                          <td className="py-4 px-4 text-right font-black text-base text-emerald-400">
                            R$ {(venda.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Ações */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Ver Detalhes */}
                              <button
                                onClick={() => setSelectedVenda(venda)}
                                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-colors"
                                title="Ver Detalhes do Recibo"
                              >
                                <Eye className="w-4 h-4 text-orange-400" />
                              </button>

                              {/* Imprimir Recibo */}
                              <button
                                onClick={() => handlePrintReceipt(venda)}
                                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-colors"
                                title="Imprimir Comprovante Térmico"
                              >
                                <Printer className="w-4 h-4 text-zinc-300" />
                              </button>

                              {/* Cancelar Venda */}
                              {!isCancelada && onCancelarVenda && (
                                <button
                                  onClick={() => setVendaParaCancelar(venda)}
                                  className="p-2 bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 rounded-xl transition-colors"
                                  title="Cancelar / Estornar Venda"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Rodapé de Paginação das Vendas */}
            {filteredVendas.length > 0 && (
              <div className="bg-zinc-950/80 px-4 py-3 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 font-medium">
                <div>
                  Mostrando <strong className="text-zinc-200">{(pageVendas - 1) * vendasPorPagina + 1}</strong> a <strong className="text-zinc-200">{Math.min(pageVendas * vendasPorPagina, filteredVendas.length)}</strong> de <strong className="text-zinc-200">{filteredVendas.length}</strong> vendas
                </div>
                {totalPagesVendas > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPageVendas(prev => Math.max(1, prev - 1))}
                      disabled={pageVendas <= 1}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-900 flex items-center gap-1 font-bold transition-all shadow-sm"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Anterior</span>
                    </button>
                    <span className="px-3 py-1 text-zinc-300 font-bold bg-zinc-900 border border-zinc-800 rounded-xl">
                      Página {pageVendas} de {totalPagesVendas}
                    </span>
                    <button
                      onClick={() => setPageVendas(prev => Math.min(totalPagesVendas, prev + 1))}
                      disabled={pageVendas >= totalPagesVendas}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-900 flex items-center gap-1 font-bold transition-all shadow-sm"
                    >
                      <span>Próxima</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: LOGS DE AUDITORIA */}
      {activeMainTab === 'audit' && (
        <div className="space-y-6">
          {/* Busca de Logs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 lg:p-5 shadow-xl">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Filtrar por operador, ação (ex: Venda realizada, Produto editado) ou registro..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>
          </div>

          {/* Tabela de Audit Logs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950 text-zinc-400 uppercase font-black tracking-wider text-[10px] border-b border-zinc-800">
                  <tr>
                    <th className="py-3.5 px-4">Data / Hora</th>
                    <th className="py-3.5 px-4">Usuário</th>
                    <th className="py-3.5 px-4">Ação Realizada</th>
                    <th className="py-3.5 px-4">Registro Relacionado</th>
                    <th className="py-3.5 px-4">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500">
                        Nenhum log de auditoria encontrado.
                      </td>
                    </tr>
                  ) : (
                    logsExibidos.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4 text-zinc-400 font-mono">
                          {formatDateTimeLocal(log.data_hora)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20">
                            {log.usuario}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-black text-zinc-100">
                          {log.acao}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-zinc-300">
                          {log.registro_relacionado}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400 italic">
                          {log.detalhes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé de Paginação dos Logs */}
            {filteredAuditLogs.length > 0 && (
              <div className="bg-zinc-950/80 px-4 py-3 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 font-medium">
                <div>
                  Mostrando <strong className="text-zinc-200">{(pageAudit - 1) * logsPorPagina + 1}</strong> a <strong className="text-zinc-200">{Math.min(pageAudit * logsPorPagina, filteredAuditLogs.length)}</strong> de <strong className="text-zinc-200">{filteredAuditLogs.length}</strong> registros
                </div>
                {totalPagesAudit > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPageAudit(prev => Math.max(1, prev - 1))}
                      disabled={pageAudit <= 1}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-900 flex items-center gap-1 font-bold transition-all shadow-sm"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Anterior</span>
                    </button>
                    <span className="px-3 py-1 text-zinc-300 font-bold bg-zinc-900 border border-zinc-800 rounded-xl">
                      Página {pageAudit} de {totalPagesAudit}
                    </span>
                    <button
                      onClick={() => setPageAudit(prev => Math.min(totalPagesAudit, prev + 1))}
                      disabled={pageAudit >= totalPagesAudit}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-900 flex items-center gap-1 font-bold transition-all shadow-sm"
                    >
                      <span>Próxima</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DETALHES DO RECIBO DA VENDA */}
      {selectedVenda && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedVenda(null)}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-zinc-100 text-lg flex items-center gap-2">
                  <span>Comprovante Venda #{selectedVenda.numero_venda}</span>
                </h3>
                  <p className="text-xs text-zinc-400">
                    {formatDateTimeLocal(selectedVenda.data_hora)} • Operador: <strong className="text-zinc-200">{selectedVenda.usuario}</strong>
                  </p>
              </div>
            </div>

            {/* Informações Básicas */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Cliente:</span>
                <span className="font-bold text-zinc-100">{selectedVenda.cliente_nome || 'Consumidor Balcão'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Forma de Pagamento:</span>
                <span className="font-bold text-orange-400">{selectedVenda.forma_pagamento}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Status:</span>
                <span className={`font-bold ${selectedVenda.status === 'Cancelada' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {selectedVenda.status}
                </span>
              </div>
            </div>

            {/* Lista de Itens da Venda */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Itens da Compra</span>
              <div className="bg-zinc-950 rounded-2xl border border-zinc-800 divide-y divide-zinc-800/80 max-h-48 overflow-y-auto">
                {(selectedVenda.produtos || []).map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-zinc-200">{item.nome}</div>
                      <div className="text-zinc-500">{item.quantidade}x R$ {(item.preco_unitario || 0).toFixed(2)}</div>
                    </div>
                    <span className="font-black text-emerald-400">R$ {(item.subtotal || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal:</span>
                <span className="font-semibold text-zinc-200">R$ {(selectedVenda.subtotal || selectedVenda.total).toFixed(2)}</span>
              </div>
              {selectedVenda.desconto_valor ? (
                <div className="flex justify-between text-rose-400">
                  <span>Desconto:</span>
                  <span className="font-semibold">- R$ {selectedVenda.desconto_valor.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-base font-black text-zinc-100 pt-2 border-t border-zinc-800">
                <span>TOTAL PAGO:</span>
                <span className="text-emerald-400 text-lg">R$ {selectedVenda.total.toFixed(2)}</span>
              </div>
              {selectedVenda.valor_recebido ? (
                <div className="flex justify-between text-zinc-400 text-[11px] pt-1">
                  <span>Valor Entregue:</span>
                  <span>R$ {selectedVenda.valor_recebido.toFixed(2)}</span>
                </div>
              ) : null}
              {selectedVenda.troco ? (
                <div className="flex justify-between text-emerald-400 text-[11px]">
                  <span>Troco:</span>
                  <span>R$ {selectedVenda.troco.toFixed(2)}</span>
                </div>
              ) : null}
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => handlePrintReceipt(selectedVenda)}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Recibo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE CANCELAMENTO */}
      {vendaParaCancelar && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-zinc-100 text-base">Cancelar Venda #{vendaParaCancelar.numero_venda}?</h3>
                <p className="text-xs text-zinc-400">Esta ação irá estornar os produtos ao estoque</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 leading-relaxed">
              Você está prestes a cancelar a venda no valor de <strong className="text-orange-400">R$ {vendaParaCancelar.total.toFixed(2)}</strong>. O estoque das bebidas será devolvido automaticamente ao cadastro de produtos.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setVendaParaCancelar(null)}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-colors"
              >
                Manter Venda
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-zinc-950 font-black rounded-xl text-xs shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirmar Cancelamento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
