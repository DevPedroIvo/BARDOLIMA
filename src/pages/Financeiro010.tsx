import React, { useState, useMemo } from 'react';
import { ContaReceber010, Venda010, Caixa010, CompraEstoqueNFe } from '../types/010types';
import { getVendasDoCaixa } from '../lib/caixaUtils';
import { formatTimeLocal, formatDateOnlyLocal, formatDateTimeLocal } from '../utils/dateUtils';
import { 
  Wallet, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  QrCode, 
  Banknote, 
  PackageCheck, 
  Award, 
  ShoppingBag,
  Landmark,
  Eye,
  Lock,
  AlertCircle,
  Info,
  FileText,
  FileUp,
  Boxes,
  Building2,
  Package
} from 'lucide-react';

interface Financeiro010Props {
  vendas?: Venda010[];
  caixas?: Caixa010[];
  contasReceber: ContaReceber010[];
  comprasEstoque?: CompraEstoqueNFe[];
  onDarBaixaConta: (id: string) => void;
  onAdicionarConta: (conta: Partial<ContaReceber010>) => void;
  onOpenImportarNFe?: () => void;
}

const MESES_NOME = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

export const Financeiro010: React.FC<Financeiro010Props> = ({
  vendas = [],
  caixas = [],
  contasReceber,
  comprasEstoque = [],
  onDarBaixaConta,
  onAdicionarConta,
  onOpenImportarNFe
}) => {
  // Estado para seletor de mês/ano (Padrão: mês/ano atual)
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0..11

  // Navegação entre sub-abas: Resumo | Compras Estoque | Caixas | Contas a Receber
  const [activeSubTab, setActiveSubTab] = useState<'resumo' | 'compras' | 'caixas' | 'contas_receber'>('resumo');
  const [selectedCompraDetalhes, setSelectedCompraDetalhes] = useState<CompraEstoqueNFe | null>(null);

  // Filtro e modal da sub-aba Caixas
  const [filterCaixaStatus, setFilterCaixaStatus] = useState<'todos' | 'abertos' | 'fechados'>('todos');
  const [selectedCaixaDetalhes, setSelectedCaixaDetalhes] = useState<Caixa010 | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'resumo' | 'vendas' | 'movimentacoes'>('resumo');

  // Modal para Nova Conta a Receber
  const [showModalConta, setShowModalConta] = useState(false);
  const [clienteNome, setClienteNome] = useState('');
  const [valorInput, setValorInput] = useState<number>(0);
  const [vencimentoInput, setVencimentoInput] = useState<string>(
    new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10)
  );

  // Navegar Mês Anterior
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  // Navegar Próximo Mês
  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  // 1. Filtrar Vendas do Mês Selecionado e Mês Anterior
  const vendasMesAtual = useMemo(() => {
    return vendas.filter(v => {
      if (v.status === 'Cancelada') return false;
      const d = new Date(v.data_hora);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [vendas, selectedYear, selectedMonth]);

  const { prevYear, prevMonth } = useMemo(() => {
    return selectedMonth === 0
      ? { prevYear: selectedYear - 1, prevMonth: 11 }
      : { prevYear: selectedYear, prevMonth: selectedMonth - 1 };
  }, [selectedYear, selectedMonth]);

  const vendasMesAnterior = useMemo(() => {
    return vendas.filter(v => {
      if (v.status === 'Cancelada') return false;
      const d = new Date(v.data_hora);
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    });
  }, [vendas, prevYear, prevMonth]);

  // 2. Cálculos de Faturamento e Comparações
  const faturamentoAtual = useMemo(() => {
    return vendasMesAtual.reduce((acc, v) => acc + (v.total || 0), 0);
  }, [vendasMesAtual]);

  const totalVendasCount = vendasMesAtual.length;

  const faturamentoAnterior = useMemo(() => {
    return vendasMesAnterior.reduce((acc, v) => acc + (v.total || 0), 0);
  }, [vendasMesAnterior]);

  // Variação % em relação ao mês anterior
  const varPercentual = useMemo(() => {
    if (faturamentoAnterior === 0) {
      return faturamentoAtual > 0 ? 100 : 0;
    }
    return ((faturamentoAtual - faturamentoAnterior) / faturamentoAnterior) * 100;
  }, [faturamentoAtual, faturamentoAnterior]);

  // Cálculos de Compras de Estoque do Mês (Gastos com NF-e e Fornecedores)
  const comprasMesAtual = useMemo(() => {
    return (comprasEstoque || []).filter(c => {
      const d = new Date(c.data_emissao || c.created_at);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [comprasEstoque, selectedYear, selectedMonth]);

  const totalGastosComprasEstoque = useMemo(() => {
    return comprasMesAtual.reduce((acc, c) => acc + (c.valor_total || 0), 0);
  }, [comprasMesAtual]);

  const totalItensCompradosEstoque = useMemo(() => {
    return comprasMesAtual.reduce((acc, c) => {
      return acc + (c.itens || []).reduce((q, it) => q + (it.quantidade || 0), 0);
    }, 0);
  }, [comprasMesAtual]);

  // Lucro Operacional Bruto (Faturamento de Vendas - Gastos com Compra de Estoque)
  const lucroBrutoMes = useMemo(() => {
    return faturamentoAtual - totalGastosComprasEstoque;
  }, [faturamentoAtual, totalGastosComprasEstoque]);

  // 3. Vendas por Forma de Pagamento (Mês Atual)
  const pagamentosBreakdown = useMemo(() => {
    let dinheiroVal = 0, dinheiroCount = 0;
    let pixVal = 0, pixCount = 0;
    let debitoVal = 0, debitoCount = 0;
    let creditoVal = 0, creditoCount = 0;

    vendasMesAtual.forEach(v => {
      if (v.pagamentos && v.pagamentos.length > 0) {
        v.pagamentos.forEach(p => {
          const formaLower = p.forma.toLowerCase();
          if (formaLower.includes('dinheiro')) {
            dinheiroVal += p.valor;
            dinheiroCount += 1;
          } else if (formaLower.includes('pix')) {
            pixVal += p.valor;
            pixCount += 1;
          } else if (formaLower.includes('débito') || formaLower.includes('debito')) {
            debitoVal += p.valor;
            debitoCount += 1;
          } else if (formaLower.includes('crédito') || formaLower.includes('credito')) {
            creditoVal += p.valor;
            creditoCount += 1;
          }
        });
      } else {
        const formaLower = (v.forma_pagamento || '').toLowerCase();
        if (formaLower.includes('dinheiro')) {
          dinheiroVal += v.total;
          dinheiroCount += 1;
        } else if (formaLower.includes('pix')) {
          pixVal += v.total;
          pixCount += 1;
        } else if (formaLower.includes('débito') || formaLower.includes('debito')) {
          debitoVal += v.total;
          debitoCount += 1;
        } else if (formaLower.includes('crédito') || formaLower.includes('credito')) {
          creditoVal += v.total;
          creditoCount += 1;
        } else {
          // Default fallback se não especificado
          pixVal += v.total;
          pixCount += 1;
        }
      }
    });

    return {
      dinheiro: { valor: dinheiroVal, count: dinheiroCount },
      pix: { valor: pixVal, count: pixCount },
      debito: { valor: debitoVal, count: debitoCount },
      credito: { valor: creditoVal, count: creditoCount },
    };
  }, [vendasMesAtual]);

  // 4. Top 5 Produtos Mais Vendidos no Mês
  const top5Produtos = useMemo(() => {
    const mapa: Record<string, { nome: string; quantidade: number }> = {};
    vendasMesAtual.forEach(v => {
      (v.produtos || []).forEach(p => {
        const key = p.nome.trim();
        if (!mapa[key]) {
          mapa[key] = { nome: p.nome, quantidade: 0 };
        }
        mapa[key].quantidade += (p.quantidade || 0);
      });
    });

    return Object.values(mapa)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [vendasMesAtual]);

  // 5. Listagem de Itens Vendidos no Mês
  const itensVendidosList = useMemo(() => {
    const list: {
      id: string;
      nome: string;
      quantidade: number;
      valor: number;
      data: string;
      hora: string;
      rawDate: Date;
    }[] = [];

    vendasMesAtual.forEach(v => {
      const dataStr = formatDateOnlyLocal(v.data_hora);
      const horaStr = formatTimeLocal(v.data_hora);
      const dateObj = new Date(v.data_hora);

      (v.produtos || []).forEach((p, idx) => {
        list.push({
          id: `${v.id}-${idx}`,
          nome: p.nome,
          quantidade: p.quantidade,
          valor: p.subtotal || (p.quantidade * p.preco_unitario),
          data: dataStr,
          hora: horaStr,
          rawDate: dateObj
        });
      });
    });

    // Ordenar do mais recente para o mais antigo
    return list.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  }, [vendasMesAtual]);

  const totalUnidadesVendidas = useMemo(() => {
    return itensVendidosList.reduce((acc, item) => acc + item.quantidade, 0);
  }, [itensVendidosList]);

  // 6. Caixas do Mês Selecionado
  const caixasMesAtual = useMemo(() => {
    return caixas.filter(c => {
      if (!c.data) return false;
      const [yearStr, monthStr] = c.data.split('-');
      return parseInt(yearStr, 10) === selectedYear && (parseInt(monthStr, 10) - 1) === selectedMonth;
    });
  }, [caixas, selectedYear, selectedMonth]);

  const caixasAbertosMes = useMemo(() => {
    return caixasMesAtual.filter(c => (c.status || '').toLowerCase().trim() === 'aberto');
  }, [caixasMesAtual]);

  const caixasFechadosMes = useMemo(() => {
    return caixasMesAtual.filter(c => (c.status || '').toLowerCase().trim() !== 'aberto');
  }, [caixasMesAtual]);

  // Submit Nova Conta a Receber
  const handleSubmitConta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNome || valorInput <= 0) return;

    onAdicionarConta({
      cliente_nome: clienteNome,
      valor_total: valorInput,
      valor_recebido: 0,
      status: 'Em Aberto',
      data_vencimento: vencimentoInput
    });

    setShowModalConta(false);
    setClienteNome('');
    setValorInput(0);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-in fade-in duration-150 text-zinc-100">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-orange-500" />
            <h1 className="text-xl font-black text-zinc-100 tracking-tight">Relatórios</h1>
          </div>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">Visão mensal de vendas e faturamento</p>
        </div>

        {/* SELETOR DE MÊS / ANO */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5 shadow-lg">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 px-4 select-none">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-black capitalize text-zinc-100 min-w-[140px] text-center">
              {MESES_NOME[selectedMonth]} {selectedYear}
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Próximo Mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO ENTRE SUB-ABAS (Resumo | Compras Estoque | Caixas | Contas a Receber) */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-3 gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('resumo')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'resumo'
                ? 'bg-orange-500 text-zinc-950 shadow-lg shadow-orange-500/20'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Resumo
          </button>

          <button
            onClick={() => setActiveSubTab('compras')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeSubTab === 'compras'
                ? 'bg-orange-500 text-zinc-950 shadow-lg shadow-orange-500/20'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Compras & NF-e</span>
            {comprasMesAtual.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeSubTab === 'compras' ? 'bg-zinc-950 text-white' : 'bg-orange-500 text-zinc-950'
              }`}>
                {comprasMesAtual.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('caixas')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'caixas'
                ? 'bg-orange-500 text-zinc-950 shadow-lg shadow-orange-500/20'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Caixas
          </button>

          <button
            onClick={() => setActiveSubTab('contas_receber')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'contas_receber'
                ? 'bg-orange-500 text-zinc-950 shadow-lg shadow-orange-500/20'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Contas a Receber
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'compras' && onOpenImportarNFe && (
            <button
              onClick={onOpenImportarNFe}
              className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 flex items-center gap-1.5 transition-all"
            >
              <FileUp className="w-4 h-4" />
              <span>Importar NF-e (XML)</span>
            </button>
          )}

          {activeSubTab === 'contas_receber' && (
            <button
              onClick={() => setShowModalConta(true)}
              className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Conta a Receber</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTEÚDO DA SUB-ABA: RESUMO */}
      {activeSubTab === 'resumo' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* CARDS DE FATURAMENTO, GASTOS C/ ESTOQUE, LUCRO E VENDAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card Faturamento */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <DollarSign className="w-20 h-20 text-orange-500" />
              </div>
              <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">Faturamento (Vendas)</span>
              <div className="text-2xl font-black text-zinc-100">
                R$ {faturamentoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className={`font-bold ${varPercentual >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {varPercentual >= 0 ? '+' : ''}{varPercentual.toFixed(1)}%
                </span>
                <span className="text-zinc-500">vs. mês anterior</span>
              </div>
            </div>

            {/* NOVO CARD: Gastos com Compra de Estoque (NF-e) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-2 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Boxes className="w-20 h-20 text-amber-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">Gastos c/ Estoque</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  NF-e
                </span>
              </div>
              <div className="text-2xl font-black text-amber-400">
                R$ {totalGastosComprasEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-zinc-400 block font-medium">
                {comprasMesAtual.length} compras / {totalItensCompradosEstoque} un adquiridas
              </span>
            </div>

            {/* NOVO CARD: Lucro Bruto Operacional (Faturamento - Gastos c/ Estoque) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="w-20 h-20 text-emerald-500" />
              </div>
              <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">Lucro Bruto (Comercial)</span>
              <div className={`text-2xl font-black ${lucroBrutoMes >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                R$ {lucroBrutoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-zinc-400 block font-medium">
                Vendas líquidas menos compras
              </span>
            </div>

            {/* Card Vendas Realizadas */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShoppingBag className="w-20 h-20 text-orange-500" />
              </div>
              <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">Vendas Realizadas</span>
              <div className="text-2xl font-black text-zinc-100">
                {totalVendasCount}
              </div>
              <span className="text-xs text-zinc-400 block font-medium">No PDV no mês selecionado</span>
            </div>
          </div>

          {/* VENDAS POR FORMA DE PAGAMENTO */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-black text-zinc-100 tracking-tight flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-500" />
              <span>Vendas por forma de pagamento</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Dinheiro */}
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-400" /> Dinheiro
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-500">{pagamentosBreakdown.dinheiro.count} vendas</span>
                </div>
                <div className="text-xl font-black text-zinc-100">
                  R$ {pagamentosBreakdown.dinheiro.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* PIX */}
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-400" /> PIX
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-500">{pagamentosBreakdown.pix.count} vendas</span>
                </div>
                <div className="text-xl font-black text-zinc-100">
                  R$ {pagamentosBreakdown.pix.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Débito */}
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-400" /> Débito
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-500">{pagamentosBreakdown.debito.count} vendas</span>
                </div>
                <div className="text-xl font-black text-zinc-100">
                  R$ {pagamentosBreakdown.debito.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Crédito */}
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-purple-400" /> Crédito
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-500">{pagamentosBreakdown.credito.count} vendas</span>
                </div>
                <div className="text-xl font-black text-zinc-100">
                  R$ {pagamentosBreakdown.credito.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* TOP 5 PRODUTOS MAIS VENDIDOS */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-black text-zinc-100 tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-500" />
              <span>Top 5 produtos mais vendidos</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-right">Qtd vendida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {top5Produtos.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-zinc-500 text-xs">
                        Nenhum produto vendido neste mês ainda.
                      </td>
                    </tr>
                  ) : (
                    top5Produtos.map((item, index) => (
                      <tr key={index} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4 text-center font-black text-orange-500">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-zinc-100">
                          {item.nome}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-zinc-200">
                          {item.quantidade}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ITENS VENDIDOS (TABELA DETALHADA) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-black text-zinc-100 tracking-tight flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-orange-500" />
                <span>Itens vendidos ({totalUnidadesVendidas})</span>
              </h2>
              <span className="text-xs text-zinc-400 font-bold">Log detalhado do mês</span>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800 sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-center">Qtd</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Data</th>
                    <th className="py-3 px-4 text-center">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {itensVendidosList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs">
                        Nenhum item vendido registrado no mês selecionado.
                      </td>
                    </tr>
                  ) : (
                    itensVendidosList.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-zinc-100">
                          {item.nome}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-zinc-300">
                          {item.quantidade}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-400">
                          R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center text-zinc-400 font-medium">
                          {item.data}
                        </td>
                        <td className="py-3 px-4 text-center text-zinc-400 font-medium">
                          {item.hora}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA: COMPRAS DE ESTOQUE & NOTAS FISCAIS */}
      {activeSubTab === 'compras' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header e Indicadores de Compras */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Boxes className="w-20 h-20 text-amber-500" />
              </div>
              <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">Total em Compras de Estoque</span>
              <div className="text-3xl font-black text-amber-400">
                R$ {totalGastosComprasEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-zinc-400 block font-medium">Acumulado em {MESES_NOME[selectedMonth]} {selectedYear}</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <FileText className="w-20 h-20 text-orange-500" />
              </div>
              <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">Notas Fiscais de Entrada</span>
              <div className="text-3xl font-black text-zinc-100">
                {comprasMesAtual.length}
              </div>
              <span className="text-xs text-zinc-400 block font-medium">NF-e registradas no mês</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Package className="w-20 h-20 text-emerald-500" />
              </div>
              <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">Unidades Adquiridas</span>
              <div className="text-3xl font-black text-emerald-400">
                {totalItensCompradosEstoque}
              </div>
              <span className="text-xs text-zinc-400 block font-medium">Produtos somados ao estoque</span>
            </div>
          </div>

          {/* Tabela de Compras / Notas Fiscais */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-base font-black text-zinc-100 tracking-tight flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <span>Histórico de Notas Fiscais & Compras de Estoque</span>
                </h2>
                <p className="text-xs text-zinc-400 font-medium">
                  Valores pagos a fornecedores e mercadorias adicionadas ao estoque
                </p>
              </div>

              {onOpenImportarNFe && (
                <button
                  type="button"
                  onClick={onOpenImportarNFe}
                  className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-zinc-950 font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all"
                >
                  <FileUp className="w-4 h-4" />
                  <span>Importar NF-e (XML)</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Data Emissão</th>
                    <th className="py-3 px-4">Nota Fiscal / Série</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4 text-center">Itens Comprados</th>
                    <th className="py-3 px-4 text-right">Valor Total Pago</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {comprasMesAtual.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500 text-xs">
                        <Boxes className="w-10 h-10 mx-auto mb-2 text-zinc-600 opacity-60" />
                        <p className="font-bold text-zinc-400">Nenhuma compra de estoque ou NF-e registrada neste mês.</p>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          Importe uma nota fiscal XML para dar entrada automática em produtos e valores pagos.
                        </p>
                        {onOpenImportarNFe && (
                          <button
                            type="button"
                            onClick={onOpenImportarNFe}
                            className="mt-3 px-4 py-2 bg-orange-500/10 hover:bg-orange-500 hover:text-zinc-950 text-orange-400 border border-orange-500/30 rounded-xl font-black text-xs inline-flex items-center gap-1.5 transition-all"
                          >
                            <FileUp className="w-4 h-4" />
                            <span>Importar Primeira NF-e</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    comprasMesAtual.map((compra) => {
                      const totalQtdItens = (compra.itens || []).reduce((acc, i) => acc + (i.quantidade || 0), 0);
                      const dataFormatada = new Date(compra.data_emissao || compra.created_at).toLocaleDateString('pt-BR');

                      return (
                        <tr key={compra.id} className="hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-zinc-300">
                            {dataFormatada}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-100">
                            NF-e nº {compra.numero_nota || 'S/N'} {compra.serie ? `(Série ${compra.serie})` : ''}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-zinc-100 block">{compra.fornecedor_nome}</span>
                            {compra.fornecedor_cnpj && (
                              <span className="text-[10px] text-zinc-500 font-mono block">{compra.fornecedor_cnpj}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-zinc-200">
                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-[11px]">
                              {totalQtdItens} un ({compra.itens?.length || 0} produtos)
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-amber-400 text-sm">
                            R$ {compra.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedCompraDetalhes(compra)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-orange-400 font-bold rounded-xl text-xs transition-colors border border-zinc-700/80 inline-flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5 text-orange-400" />
                              <span>Ver Itens</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeSubTab === 'caixas' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-150">
          {/* Cabeçalho da sub-aba Caixas com Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-black text-zinc-100 tracking-tight flex items-center gap-2">
                <Landmark className="w-5 h-5 text-orange-500" />
                <span>Gestão de Caixas Diários — {MESES_NOME[selectedMonth]} {selectedYear}</span>
              </h2>
              <p className="text-xs text-zinc-400">Clique em qualquer card para consultar o relatório completo e movimentações do dia</p>
            </div>

            {/* Filtros de Status */}
            <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
              <button
                onClick={() => setFilterCaixaStatus('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  filterCaixaStatus === 'todos'
                    ? 'bg-orange-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Todos ({caixasMesAtual.length})
              </button>
              <button
                onClick={() => setFilterCaixaStatus('abertos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  filterCaixaStatus === 'abertos'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Abertos ({caixasAbertosMes.length})
              </button>
              <button
                onClick={() => setFilterCaixaStatus('fechados')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  filterCaixaStatus === 'fechados'
                    ? 'bg-zinc-800 text-zinc-100 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Lock className="w-3 h-3 text-orange-400" />
                Fechados ({caixasFechadosMes.length})
              </button>
            </div>
          </div>

          {caixasMesAtual.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-medium bg-zinc-950 rounded-2xl border border-zinc-800/80">
              Nenhum caixa registrado no mês de {MESES_NOME[selectedMonth]} {selectedYear}.
            </div>
          ) : (
            <div className="space-y-6">
              {/* SEÇÃO 1: CAIXAS ABERTOS */}
              {(filterCaixaStatus === 'todos' || filterCaixaStatus === 'abertos') && caixasAbertosMes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-400 uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Caixas Abertos do Mês ({caixasAbertosMes.length})</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {caixasAbertosMes.map((cx) => (
                      <div
                        key={cx.id}
                        onClick={() => {
                          setSelectedCaixaDetalhes(cx);
                          setActiveModalTab('resumo');
                        }}
                        className="bg-zinc-950 border border-emerald-500/30 hover:border-emerald-500 rounded-3xl p-5 shadow-xl transition-all cursor-pointer hover:scale-[1.01] flex flex-col justify-between space-y-4 group relative"
                      >
                        {/* Header do Card */}
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                          <div>
                            <span className="font-black text-zinc-100 text-base block">
                              {cx.data ? cx.data.split('-').reverse().join('/') : 'Data N/I'}
                            </span>
                            <p className="text-[11px] text-zinc-400 font-medium">
                              Aberto por <strong className="text-zinc-200">{cx.usuario_abertura}</strong> às {cx.hora_abertura}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Aberto</span>
                          </span>
                        </div>

                        {/* Grid de Valores */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                          <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                            <span className="text-[10px] text-zinc-400 block uppercase">Inicial (Troco)</span>
                            <span className="text-zinc-100 font-black text-sm">R$ {(cx.valor_inicial || 0).toFixed(2)}</span>
                          </div>
                          <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                            <span className="text-[10px] text-zinc-400 block uppercase">Vendas</span>
                            <span className="text-emerald-400 font-black text-sm">R$ {(cx.valor_vendas || 0).toFixed(2)}</span>
                          </div>
                          <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                            <span className="text-[10px] text-zinc-400 block uppercase">Entradas</span>
                            <span className="text-emerald-400 font-black text-sm">R$ {(cx.valor_entradas || 0).toFixed(2)}</span>
                          </div>
                          <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                            <span className="text-[10px] text-zinc-400 block uppercase">Despesas</span>
                            <span className="text-rose-400 font-black text-sm">R$ {(cx.valor_despesas || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Saldo Esperado & Botão */}
                        <div className="pt-2 border-t border-zinc-800 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400 font-semibold">Saldo Atual Esperado:</span>
                            <span className="text-orange-400 font-black text-base">R$ {(cx.saldo_esperado || 0).toFixed(2)}</span>
                          </div>
                          <button
                            type="button"
                            className="w-full py-2 bg-orange-500/10 group-hover:bg-orange-500 text-orange-400 group-hover:text-zinc-950 font-black text-xs rounded-xl border border-orange-500/30 flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Detalhes do Dia</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SEÇÃO 2: CAIXAS FECHADOS */}
              {(filterCaixaStatus === 'todos' || filterCaixaStatus === 'fechados') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-wider">
                    <Lock className="w-4 h-4 text-orange-500" />
                    <span>Caixas Fechados ({caixasFechadosMes.length})</span>
                  </div>

                  {caixasFechadosMes.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500 font-medium bg-zinc-950 rounded-2xl border border-zinc-800">
                      Nenhum caixa fechado encontrado para o filtro selecionado.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {caixasFechadosMes.map((cx) => {
                        const diff = cx.diferenca !== undefined ? cx.diferenca : ((cx.valor_informado || 0) - (cx.saldo_esperado || 0));
                        const temDiferenca = Math.abs(diff) > 0.001;
                        const faltou = diff < -0.001;

                        return (
                          <div
                            key={cx.id}
                            onClick={() => {
                              setSelectedCaixaDetalhes(cx);
                              setActiveModalTab('resumo');
                            }}
                            className="bg-zinc-950 border border-zinc-800 hover:border-orange-500/50 rounded-3xl p-5 shadow-xl transition-all cursor-pointer hover:scale-[1.01] flex flex-col justify-between space-y-4 group"
                          >
                            {/* Header do Card */}
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                              <div>
                                <span className="font-black text-zinc-100 text-base block">
                                  {cx.data ? cx.data.split('-').reverse().join('/') : 'Data N/I'}
                                </span>
                                <p className="text-[11px] text-zinc-400 font-medium">
                                  Fechado por <strong className="text-zinc-200">{cx.usuario_fechamento || cx.usuario_abertura}</strong> {cx.hora_fechamento ? `às ${cx.hora_fechamento}` : ''}
                                </p>
                              </div>
                              <span className="px-2.5 py-1 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-full text-[10px] font-black">
                                Fechado
                              </span>
                            </div>

                            {/* Grid de Valores */}
                            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                              <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                                <span className="text-[10px] text-zinc-400 block uppercase">Inicial (Troco)</span>
                                <span className="text-zinc-100 font-black text-sm">R$ {(cx.valor_inicial || 0).toFixed(2)}</span>
                              </div>
                              <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                                <span className="text-[10px] text-zinc-400 block uppercase">Vendas</span>
                                <span className="text-emerald-400 font-black text-sm">R$ {(cx.valor_vendas || 0).toFixed(2)}</span>
                              </div>
                              <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                                <span className="text-[10px] text-zinc-400 block uppercase">Saldo Esperado</span>
                                <span className="text-orange-400 font-black text-sm">R$ {(cx.saldo_esperado || 0).toFixed(2)}</span>
                              </div>
                              <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                                <span className="text-[10px] text-zinc-400 block uppercase">Gaveta (Contado)</span>
                                <span className="text-zinc-100 font-black text-sm">R$ {((cx.valor_informado ?? cx.saldo_esperado) || 0).toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Alert de Divergência/Quebra se houver */}
                            {temDiferenca && (
                              <div className={`p-2 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
                                faltou ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{faltou ? `Faltou R$ ${Math.abs(diff).toFixed(2)} na gaveta` : `Sobrou R$ ${diff.toFixed(2)} na gaveta`}</span>
                              </div>
                            )}

                            {/* Botão Ação */}
                            <div className="pt-2 border-t border-zinc-800">
                              <button
                                type="button"
                                className="w-full py-2 bg-zinc-800 group-hover:bg-orange-500 text-zinc-300 group-hover:text-zinc-950 font-black text-xs rounded-xl border border-zinc-700/80 flex items-center justify-center gap-1.5 transition-all"
                              >
                                <Eye className="w-3.5 h-3.5 text-orange-400 group-hover:text-zinc-950" />
                                <span>Ver Detalhes do Dia</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA: CONTAS A RECEBER */}
      {activeSubTab === 'contas_receber' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-base font-black text-zinc-100 tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span>Controle de Títulos e Notas Fiado</span>
            </h2>
            <span className="text-xs text-zinc-400 font-bold">{contasReceber.length} contas cadastradas</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Cliente / Referência</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-right">Valor Recebido</th>
                  <th className="py-3 px-4 text-right">Saldo Restante</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {contasReceber.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500 text-xs">
                      Nenhuma conta a receber cadastrada.
                    </td>
                  </tr>
                ) : (
                  contasReceber.map((c) => {
                    const restante = c.valor_total - c.valor_recebido;
                    return (
                      <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-zinc-100 text-sm">{c.cliente_nome}</div>
                          {c.venda_numero && <div className="text-[10px] text-zinc-500">Venda #{c.venda_numero}</div>}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-zinc-300">
                          {new Date(c.data_vencimento).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-zinc-100">
                          R$ {c.valor_total.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                          R$ {c.valor_recebido.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-orange-400">
                          R$ {restante.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            c.status === 'Recebido' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            c.status === 'Em Aberto' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {c.status !== 'Recebido' && (
                            <button
                              onClick={() => onDarBaixaConta(c.id)}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black rounded-lg text-xs shadow-md transition-all"
                            >
                              Dar Baixa
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR CONTA A RECEBER */}
      {showModalConta && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-base">Nova Conta a Receber</h3>
              <button onClick={() => setShowModalConta(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitConta} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bar do Zé"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Valor do Título (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={valorInput || ''}
                  onChange={(e) => setValorInput(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-black text-orange-500 focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Data de Vencimento *</label>
                <input
                  type="date"
                  required
                  value={vencimentoInput}
                  onChange={(e) => setVencimentoInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModalConta(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/20"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES COMPLETOS DO DIA DO CAIXA */}
      {selectedCaixaDetalhes && (() => {
        const cx = selectedCaixaDetalhes;
        const vendasDoDia = getVendasDoCaixa(vendas, cx, caixas);
        const diff = cx.diferenca !== undefined ? cx.diferenca : ((cx.valor_informado || 0) - (cx.saldo_esperado || 0));
        const temDiferenca = Math.abs(diff) > 0.001;

        return (
          <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
              {/* Header do Modal */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
                <div>
                  <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    <span>Detalhes do Caixa — {cx.data ? cx.data.split('-').reverse().join('/') : ''}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      cx.status === 'Aberto' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {cx.status}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Aberto por <strong className="text-zinc-200">{cx.usuario_abertura}</strong> às {cx.hora_abertura}
                    {cx.hora_fechamento && ` • Fechado por ${cx.usuario_fechamento || cx.usuario_abertura} às ${cx.hora_fechamento}`}
                  </p>
                </div>
                <button onClick={() => setSelectedCaixaDetalhes(null)} className="text-zinc-500 hover:text-zinc-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* NAVEGAÇÃO DE SUB-ABAS NO MODAL */}
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 shrink-0">
                <button
                  onClick={() => setActiveModalTab('resumo')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeModalTab === 'resumo'
                      ? 'bg-orange-500 text-zinc-950 font-black'
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Resumo Financeiro
                </button>

                <button
                  onClick={() => setActiveModalTab('vendas')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeModalTab === 'vendas'
                      ? 'bg-orange-500 text-zinc-950 font-black'
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Vendas do Dia ({vendasDoDia.length})
                </button>

                <button
                  onClick={() => setActiveModalTab('movimentacoes')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeModalTab === 'movimentacoes'
                      ? 'bg-orange-500 text-zinc-950 font-black'
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Lançamentos ({cx.movimentacoes?.length || 0})
                </button>
              </div>

              {/* CONTEÚDO SCROLLÁVEL DO MODAL */}
              <div className="overflow-y-auto flex-1 space-y-4 pr-1">
                {activeModalTab === 'resumo' && (
                  <div className="space-y-4">
                    {/* Grid 4 Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block">Valor Inicial</span>
                        <span className="text-base font-black text-zinc-100">R$ {(cx.valor_inicial || 0).toFixed(2)}</span>
                      </div>

                      <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block">Vendas Totais</span>
                        <span className="text-base font-black text-emerald-400">R$ {(cx.valor_vendas || 0).toFixed(2)}</span>
                      </div>

                      <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block">Entradas</span>
                        <span className="text-base font-black text-emerald-400">R$ {(cx.valor_entradas || 0).toFixed(2)}</span>
                      </div>

                      <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block">Despesas</span>
                        <span className="text-base font-black text-rose-400">R$ {(cx.valor_despesas || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Saldo Esperado x Saldo Informado */}
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-bold text-zinc-400 uppercase block">Saldo Esperado em Dinheiro</span>
                        <span className="text-xl font-black text-orange-400">R$ {(cx.saldo_esperado || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-zinc-400 uppercase block">Valor Contado na Gaveta</span>
                        <span className="text-xl font-black text-zinc-100">
                          {cx.status === 'Fechado' ? `R$ ${((cx.valor_informado ?? cx.saldo_esperado) || 0).toFixed(2)}` : 'Em andamento'}
                        </span>
                      </div>
                    </div>

                    {/* Banner Divergência se houver */}
                    {cx.status === 'Fechado' && temDiferenca && (
                      <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                        diff < 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}>
                        <div className="font-black flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" />
                          <span>{diff < 0 ? `Quebra de Caixa: Faltou R$ ${Math.abs(diff).toFixed(2)}` : `Sobra em Caixa: Sobrou R$ ${diff.toFixed(2)}`}</span>
                        </div>
                        <p className="text-[11px] opacity-90 font-medium">
                          Esperado: R$ {(cx.saldo_esperado || 0).toFixed(2)} | Informado: R$ {(cx.valor_informado || 0).toFixed(2)}
                        </p>
                      </div>
                    )}

                    {/* Observações */}
                    {cx.observacao && (
                      <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-xs">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Observações do Caixa</span>
                        <p className="text-zinc-300 font-medium italic">{cx.observacao}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeModalTab === 'vendas' && (
                  <div className="space-y-3">
                    {vendasDoDia.length === 0 ? (
                      <div className="py-8 text-center text-xs text-zinc-500 font-medium bg-zinc-950 rounded-2xl border border-zinc-800">
                        Nenhuma venda registrada no sistema para este dia.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {vendasDoDia.map((v) => (
                          <div key={v.id} className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-2 text-xs">
                            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-orange-400">#{v.numero_venda}</span>
                                <span className="text-zinc-400 text-[11px]">
                                  {formatTimeLocal(v.data_hora)}
                                </span>
                              </div>
                              <span className="font-black text-emerald-400 text-sm">
                                R$ {(v.total || 0).toFixed(2)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                              <span>Forma: <strong className="text-zinc-200">{v.forma_pagamento}</strong></span>
                              <span>Cliente: <strong className="text-zinc-200">{v.cliente_nome || 'Consumidor Final'}</strong></span>
                            </div>

                            {v.produtos && v.produtos.length > 0 && (
                              <div className="bg-zinc-900/60 p-2 rounded-xl text-[11px] text-zinc-300 space-y-1">
                                {v.produtos.map((item, idx) => (
                                  <div key={idx} className="flex justify-between">
                                    <span>{item.quantidade}x {item.nome}</span>
                                    <span className="font-bold text-zinc-400">R$ {(item.subtotal || 0).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeModalTab === 'movimentacoes' && (
                  <div className="space-y-2">
                    {(cx.movimentacoes || []).length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-8">Nenhum lançamento interno registrado.</p>
                    ) : (
                      cx.movimentacoes.map((mov) => (
                        <div key={mov.id} className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-zinc-200 block">{mov.descricao}</span>
                            <span className="text-[10px] text-zinc-500">{mov.hora} • {mov.forma_pagamento || 'Dinheiro'}</span>
                          </div>
                          <span className={`font-black ${mov.tipo === 'Entrada' || mov.tipo === 'Venda' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            R$ {(mov.valor || 0).toFixed(2)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Footer do Modal */}
              <div className="flex justify-end pt-3 border-t border-zinc-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedCaixaDetalhes(null)}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DETALHES DA COMPRA / NOTA FISCAL (NF-e) */}
      {selectedCompraDetalhes && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <span>Detalhes da Nota Fiscal nº {selectedCompraDetalhes.numero_nota}</span>
                </h3>
                <p className="text-xs text-zinc-400 font-medium">Fornecedor: {selectedCompraDetalhes.fornecedor_nome}</p>
              </div>
              <button
                onClick={() => setSelectedCompraDetalhes(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações da Nota */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Fornecedor</span>
                <span className="font-black text-zinc-100 block truncate">{selectedCompraDetalhes.fornecedor_nome}</span>
                <span className="text-[11px] text-zinc-400 font-mono">{selectedCompraDetalhes.fornecedor_cnpj || 'CNPJ não inf.'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Data Emissão</span>
                <span className="font-bold text-zinc-200">
                  {new Date(selectedCompraDetalhes.data_emissao || selectedCompraDetalhes.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Itens Comprados</span>
                <span className="font-bold text-zinc-200">{selectedCompraDetalhes.itens?.length || 0} produtos</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Total Pago na NF</span>
                <span className="font-black text-amber-400 text-base">
                  R$ {selectedCompraDetalhes.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {selectedCompraDetalhes.chave_acesso && (
              <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                <span>Chave SEFAZ: {selectedCompraDetalhes.chave_acesso}</span>
              </div>
            )}

            {/* Tabela de Produtos Comprados */}
            <div className="border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">Produto</th>
                    <th className="py-2.5 px-3">Código / EAN</th>
                    <th className="py-2.5 px-3 text-center">Qtd Comprada</th>
                    <th className="py-2.5 px-3 text-right">Custo Unitário Pago</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {(selectedCompraDetalhes.itens || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-3 font-bold text-zinc-100">
                        {item.nome}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-zinc-400 text-[11px]">
                        {item.codigo_barras || item.codigo_fornecedor || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-zinc-200">
                        {item.quantidade} {item.unidade}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                        R$ {item.valor_unitario_custo.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-zinc-100">
                        R$ {item.valor_total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCompraDetalhes(null)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


