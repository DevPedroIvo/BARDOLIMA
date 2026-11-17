import React, { useState, useEffect, useMemo } from 'react';
import { Caixa010, Venda010, MovimentacaoCaixaDetalhe } from '../types/010types';
import { getVendasDoCaixa } from '../lib/caixaUtils';
import { supabaseService } from '../services/supabaseService';
import { formatTimeLocal, formatDateTimeLocal, parseDateSafe, getYMDLocal, isSameDayLocal } from '../utils/dateUtils';
import { 
  Landmark, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Lock, 
  Unlock, 
  Eye, 
  PlusCircle, 
  MinusCircle,
  AlertCircle, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  CreditCard,
  QrCode,
  Banknote,
  Clock,
  Receipt,
  Info,
  Download,
  Printer,
  Package,
  Trash2
} from 'lucide-react';

interface Caixa010Props {
  caixas: Caixa010[];
  vendas?: Venda010[];
  onAbrirCaixa: (valorInicial: number, obs?: string) => void;
  onFecharCaixa: (caixaId: string, valorInformado: number, obs?: string) => void;
  onAdicionarEntradaDespesa?: (caixaId: string, tipo: 'Entrada' | 'Despesa', valor: number, descricao: string) => void;
  onCancelarVenda?: (vendaId: string) => void;
  onExcluirVenda?: (vendaId: string) => void;
  usuarioAtual: string;
  autoOpenAbrirModal?: boolean;
}

export const CaixaPage010: React.FC<Caixa010Props> = ({
  caixas,
  vendas = [],
  onAbrirCaixa,
  onFecharCaixa,
  onAdicionarEntradaDespesa,
  onCancelarVenda,
  onExcluirVenda,
  usuarioAtual,
  autoOpenAbrirModal = false
}) => {
  const [showAbrirModal, setShowAbrirModal] = useState(autoOpenAbrirModal);
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [showEntradaModal, setShowEntradaModal] = useState(false);
  const [showDespesaModal, setShowDespesaModal] = useState(false);
  const [selectedCaixa, setSelectedCaixa] = useState<Caixa010 | null>(null);
  const [isLoadingDetalhes, setIsLoadingDetalhes] = useState(false);

  // Estado para expandir/ocultar histórico de caixas anteriores
  const [showHistoricoCompleto, setShowHistoricoCompleto] = useState(false);

  // Estados para exclusão/cancelamento de vendas indevidas do caixa
  const [vendaParaExcluir, setVendaParaExcluir] = useState<Venda010 | null>(null);
  const [showConfirmLimparVendas, setShowConfirmLimparVendas] = useState(false);

  useEffect(() => {
    if (autoOpenAbrirModal) {
      setShowAbrirModal(true);
    }
  }, [autoOpenAbrirModal]);

  // Form Abertura
  const [valorInicialInput, setValorInicialInput] = useState<number>(0);
  const [obsAberturaInput, setObsAberturaInput] = useState('');

  // Form Fechamento
  const [valorInformadoInput, setValorInformadoInput] = useState<number>(0);
  const [obsFechamentoInput, setObsFechamentoInput] = useState('');

  // Form Entrada / Despesa
  const [valorMovInput, setValorMovInput] = useState<number>(0);
  const [descMovInput, setDescMovInput] = useState('');

  // Helper para extrair data local YYYY-MM-DD sem bug de offset UTC
  const getLocalYMD = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.slice(0, 10);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch(e) {
      return dateStr.slice(0, 10);
    }
  };

  // Identifica caixa aberto ativo ou caixa mais recente
  const caixaHoje = caixas.find(c => c.status === 'Aberto') || caixas[0];
  const isAberto = caixaHoje && caixaHoje.status === 'Aberto';
  const caixasAnteriores = caixas.filter(c => c.id !== caixaHoje?.id);

  // Vendas estritamente pertencentes ao caixa ativo (inclui vendas após a meia-noite do mesmo turno)
  const vendasCaixa = useMemo(() => {
    if (!caixaHoje) return [];
    return getVendasDoCaixa(vendas, caixaHoje, caixas);
  }, [vendas, caixaHoje, caixas]);

  // Métricas por Meio de Pagamento (Considera pagamentos múltiplos e simples)
  let valorDinheiro = 0;
  let countDinheiro = 0;
  let valorPix = 0;
  let countPix = 0;
  let valorDebito = 0;
  let countDebito = 0;
  let valorCredito = 0;
  let countCredito = 0;

  vendasCaixa.forEach(v => {
    if (Array.isArray(v.pagamentos) && v.pagamentos.length > 0) {
      let hasDin = false;
      let hasPix = false;
      let hasDeb = false;
      let hasCre = false;

      v.pagamentos.forEach(p => {
        const f = (p.forma || '').toLowerCase();
        if (f.includes('dinheiro')) {
          valorDinheiro += (p.valor || 0);
          hasDin = true;
        } else if (f.includes('pix')) {
          valorPix += (p.valor || 0);
          hasPix = true;
        } else if (f.includes('débito') || f.includes('debito')) {
          valorDebito += (p.valor || 0);
          hasDeb = true;
        } else if (f.includes('crédito') || f.includes('credito')) {
          valorCredito += (p.valor || 0);
          hasCre = true;
        }
      });

      if (hasDin) countDinheiro++;
      if (hasPix) countPix++;
      if (hasDeb) countDebito++;
      if (hasCre) countCredito++;
    } else {
      const f = (v.forma_pagamento || '').toLowerCase();
      if (f.includes('dinheiro')) {
        valorDinheiro += (v.total || 0);
        countDinheiro++;
      }
      if (f.includes('pix')) {
        valorPix += (v.total || 0);
        countPix++;
      }
      if (f.includes('débito') || f.includes('debito')) {
        valorDebito += (v.total || 0);
        countDebito++;
      }
      if (f.includes('crédito') || f.includes('credito')) {
        valorCredito += (v.total || 0);
        countCredito++;
      }
    }
  });

  const totalVendasValor = vendasCaixa.reduce((acc, v) => acc + (v.total || 0), 0);
  const totalVendasQtd = vendasCaixa.length;

  // Cálculo exato da gaveta: Valor Inicial + Vendas em Dinheiro + Entradas - Despesas
  const esperadoDinheiro = (caixaHoje?.valor_inicial || 0) + valorDinheiro + (caixaHoje?.valor_entradas || 0) - (caixaHoje?.valor_despesas || 0);

  // Formatação de data em DD/MM
  const dataFormatadaStr = (() => {
    if (!caixaHoje?.data) return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const parts = caixaHoje.data.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return caixaHoje.data;
  })();

  // Lançamentos manuais de sangria / suprimento
  const lancamentosEntradaDespesa = (caixaHoje?.movimentacoes || []).filter(m => m.tipo === 'Entrada' || m.tipo === 'Despesa' || m.tipo === 'Saída');

  const handleOpenFechar = (caixa: Caixa010) => {
    setSelectedCaixa(caixa);
    setValorInformadoInput(esperadoDinheiro);
    setShowFecharModal(true);
  };

  const handleOpenVer = async (caixa: Caixa010) => {
    setSelectedCaixa(caixa);
    setShowDetalhesModal(true);

    // Se o caixa for fechado e não tiver as movimentações detalhadas carregadas, busca sob demanda
    if (caixa.status !== 'Aberto' && (!caixa.movimentacoes || caixa.movimentacoes.length === 0)) {
      setIsLoadingDetalhes(true);
      try {
        const movs = await supabaseService.fetchCaixaMovimentacoes(caixa.id);
        setSelectedCaixa(prev => prev && prev.id === caixa.id ? { ...prev, movimentacoes: movs } : prev);
      } finally {
        setIsLoadingDetalhes(false);
      }
    }
  };

  const handleExportCaixaPdf = async (caixa: Caixa010) => {
    let caixaParaImprimir = caixa;
    if (caixa.status !== 'Aberto' && (!caixa.movimentacoes || caixa.movimentacoes.length === 0)) {
      const movs = await supabaseService.fetchCaixaMovimentacoes(caixa.id);
      caixaParaImprimir = { ...caixa, movimentacoes: movs };
    }
    caixa = caixaParaImprimir;
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) return;

    const diff = caixa.diferenca !== undefined 
      ? caixa.diferenca 
      : ((caixa.valor_informado || 0) - caixa.saldo_esperado);

    const movsHtml = (caixa.movimentacoes || []).map(m => `
      <tr style="border-bottom: 1px solid #e4e4e7;">
        <td style="padding: 8px; text-align: left;">${m.hora || '-'}</td>
        <td style="padding: 8px; text-align: left;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: ${m.tipo === 'Entrada' || m.tipo === 'Venda' ? '#dcfce7; color: #15803d;' : '#fee2e2; color: #b91c1c;'}">
            ${m.tipo}
          </span>
        </td>
        <td style="padding: 8px; text-align: left;">${m.descricao}</td>
        <td style="padding: 8px; text-align: center;">${m.forma_pagamento || 'Dinheiro'}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold; color: ${m.tipo === 'Entrada' || m.tipo === 'Venda' ? '#16a34a' : '#dc2626'}">
          R$ ${Number(m.valor || 0).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Detalhamento do Caixa - ${caixa.data}</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 30px; color: #18181b; background: #ffffff; }
            .header { border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 20px; font-weight: 900; color: #18181b; text-transform: uppercase; letter-spacing: -0.5px; }
            .subtitle { font-size: 12px; color: #71717a; margin-top: 4px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 900; text-transform: uppercase; background: ${caixa.status === 'Aberto' ? '#dcfce7; color: #15803d;' : '#f4f4f5; color: #52525b;'}; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
            .card { background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 12px; padding: 12px; }
            .card-label { font-size: 10px; text-transform: uppercase; font-weight: 800; color: #71717a; }
            .card-value { font-size: 16px; font-weight: 900; margin-top: 4px; color: #18181b; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th { background: #f4f4f5; border-bottom: 2px solid #e4e4e7; padding: 8px; text-align: left; font-weight: 800; color: #3f3f46; }
            .footer-notes { margin-top: 25px; padding: 12px 15px; border: 1px solid #e4e4e7; border-radius: 12px; background: #fafafa; font-size: 11px; color: #52525b; }
            .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; }
            .sig-box { flex: 1; border-top: 1px solid #a1a1aa; text-align: center; font-size: 11px; color: #71717a; padding-top: 6px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background: #2563eb; color: #ffffff; border: none; padding: 10px 20px; font-weight: 900; border-radius: 10px; cursor: pointer; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              🖨️ Imprimir / Salvar PDF do Caixa
            </button>
          </div>

          <div class="header">
            <div>
              <div class="title">BAR DO LIMA — DETALHAMENTO DE CAIXA</div>
              <div class="subtitle">Data: <strong>${caixa.data}</strong> | Operador Abertura: <strong>${caixa.usuario_abertura}</strong> ${caixa.usuario_fechamento ? `| Operador Fechamento: <strong>${caixa.usuario_fechamento}</strong>` : ''}</div>
            </div>
            <div class="badge">${caixa.status}</div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-label">Valor Inicial</div>
              <div class="card-value">R$ ${Number(caixa.valor_inicial || 0).toFixed(2)}</div>
            </div>
            <div class="card">
              <div class="card-label">Total Vendas</div>
              <div class="card-value" style="color: #16a34a;">R$ ${Number(caixa.valor_vendas || 0).toFixed(2)}</div>
            </div>
            <div class="card">
              <div class="card-label">Entradas / Suprimentos</div>
              <div class="card-value" style="color: #2563eb;">R$ ${Number(caixa.valor_entradas || 0).toFixed(2)}</div>
            </div>
            <div class="card">
              <div class="card-label">Sangrias / Despesas</div>
              <div class="card-value" style="color: #dc2626;">R$ ${Number(caixa.valor_despesas || 0).toFixed(2)}</div>
            </div>
          </div>

          <div class="grid" style="grid-template-columns: repeat(3, 1fr);">
            <div class="card" style="background: #eff6ff; border-color: #bfdbfe;">
              <div class="card-label" style="color: #1d4ed8;">Saldo Esperado em Gaveta</div>
              <div class="card-value" style="color: #1e40af;">R$ ${Number(caixa.saldo_esperado || 0).toFixed(2)}</div>
            </div>
            <div class="card" style="background: #f8fafc; border-color: #cbd5e1;">
              <div class="card-label">Valor Contado em Dinheiro</div>
              <div class="card-value">R$ ${caixa.valor_informado !== undefined ? Number(caixa.valor_informado).toFixed(2) : '-'}</div>
            </div>
            <div class="card" style="background: ${diff < 0 ? '#fef2f2; border-color: #fecaca;' : diff > 0 ? '#fffbeb; border-color: #fde68a;' : '#f0fdf4; border-color: #bbf7d0;'};">
              <div class="card-label" style="color: ${diff < 0 ? '#b91c1c' : diff > 0 ? '#b45309' : '#15803d'};">Diferença / Quebra de Caixa</div>
              <div class="card-value" style="color: ${diff < 0 ? '#dc2626' : diff > 0 ? '#d97706' : '#16a34a'};">
                ${diff === 0 ? 'Sem divergência' : `R$ ${diff.toFixed(2)}`}
              </div>
            </div>
          </div>

          <h4 style="font-size: 13px; font-weight: 900; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; color: #3f3f46;">LANÇAMENTOS E MOVIMENTAÇÕES DO CAIXA</h4>
          <table>
            <thead>
              <tr>
                <th style="width: 70px;">Hora</th>
                <th style="width: 80px;">Tipo</th>
                <th>Descrição</th>
                <th style="width: 130px; text-align: center;">Pagamento</th>
                <th style="width: 110px; text-align: right;">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              ${movsHtml.length > 0 ? movsHtml : '<tr><td colspan="5" style="text-align: center; padding: 15px; color: #71717a;">Nenhuma movimentação registrada neste caixa.</td></tr>'}
            </tbody>
          </table>

          ${caixa.observacao ? `
            <div class="footer-notes">
              <strong>Observação Registrada:</strong> ${caixa.observacao}
            </div>
          ` : ''}

          <div class="signatures">
            <div class="sig-box">Assinatura do Operador de Caixa</div>
            <div class="sig-box">Assinatura do Gerente / Supervisor</div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleConfirmAbrir = (e: React.FormEvent) => {
    e.preventDefault();
    onAbrirCaixa(valorInicialInput, obsAberturaInput);
    setShowAbrirModal(false);
  };

  const handleConfirmFechar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaixa) return;
    
    const diff = valorInformadoInput - esperadoDinheiro;
    let obsFinal = obsFechamentoInput.trim();

    if (!obsFinal && Math.abs(diff) > 0.001) {
      if (diff < 0) {
        obsFinal = `Quebra de caixa: Faltou R$ ${Math.abs(diff).toFixed(2)}`;
      } else {
        obsFinal = `Sobra em caixa: Sobrou R$ ${diff.toFixed(2)}`;
      }
    }

    onFecharCaixa(selectedCaixa.id, valorInformadoInput, obsFinal);
    setShowFecharModal(false);
  };

  const handleConfirmEntrada = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixaHoje || valorMovInput <= 0) return;
    if (onAdicionarEntradaDespesa) {
      onAdicionarEntradaDespesa(caixaHoje.id, 'Entrada', valorMovInput, descMovInput || 'Suprimento de troco');
    }
    setShowEntradaModal(false);
    setValorMovInput(0);
    setDescMovInput('');
  };

  const handleConfirmDespesa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixaHoje || valorMovInput <= 0) return;
    if (onAdicionarEntradaDespesa) {
      onAdicionarEntradaDespesa(caixaHoje.id, 'Despesa', valorMovInput, descMovInput || 'Sangria / Retirada');
    }
    setShowDespesaModal(false);
    setValorMovInput(0);
    setDescMovInput('');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-in fade-in duration-150 max-w-7xl mx-auto">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-100 flex items-center gap-2.5">
            <Landmark className="w-6 h-6 text-orange-500" />
            <span>Caixa Operacional</span>
          </h1>
          <p className="text-xs text-zinc-400 font-medium">Controle diário de movimentações, fechamento de gaveta e histórico de vendas</p>
        </div>
      </div>

      {/* TELA DE CAIXA FECHADO (SE NÃO HOUVER CAIXA ABERTO) */}
      {!isAberto && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl max-w-2xl mx-auto my-8">
          <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-zinc-100">Caixa Fechado</h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Nenhum caixa está aberto no momento. Para iniciar as vendas e movimentações do dia, abra o caixa abaixo.
            </p>
          </div>

          <button
            onClick={() => setShowAbrirModal(true)}
            className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black rounded-2xl text-sm shadow-xl shadow-orange-500/20 inline-flex items-center gap-2.5 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Unlock className="w-5 h-5" />
            <span>Abrir Caixa do Dia</span>
          </button>
        </div>
      )}

      {/* TELA DE CAIXA ABERTO (EXIBE TODAS AS SEÇÕES SOLICITADAS) */}
      {isAberto && caixaHoje && (
        <div className="space-y-6">
          {/* Header Card de Caixa Aberto */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Caixa Aberto</span>
                </span>
              </div>
              <p className="text-xs text-zinc-300 font-medium">
                Aberto por <strong className="text-zinc-100">{caixaHoje.usuario_abertura}</strong> em <strong className="text-zinc-100">{dataFormatadaStr}</strong> às <strong className="text-zinc-100">{caixaHoje.hora_abertura}</strong>
              </p>
            </div>

            <button
              onClick={() => handleOpenFechar(caixaHoje)}
              className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-black text-xs rounded-xl border border-rose-500/30 flex items-center gap-2 transition-all shadow-md"
            >
              <Lock className="w-4 h-4" />
              <span>Fechar caixa</span>
            </button>
          </div>

          {/* Cards de Métricas Principais (4 Colunas) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-md">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Valor inicial</span>
              <span className="text-xl sm:text-2xl font-black text-zinc-100">R$ {caixaHoje.valor_inicial.toFixed(2)}</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Vendas</span>
                <span className="text-[10px] font-black bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">
                  {totalVendasQtd} vendas
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-orange-500">R$ {totalVendasValor.toFixed(2)}</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-md">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Entradas</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400">R$ {caixaHoje.valor_entradas.toFixed(2)}</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-md">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Despesas</span>
              <span className="text-xl sm:text-2xl font-black text-rose-400">R$ {caixaHoje.valor_despesas.toFixed(2)}</span>
            </div>
          </div>

          {/* Vendas por Pagamento */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <h3 className="font-black text-zinc-100 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-orange-500" />
              <span>Vendas por pagamento</span>
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-1">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dinheiro</span>
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-black text-zinc-100">R$ {valorDinheiro.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-500 font-bold">{countDinheiro} vendas</span>
                </div>
              </div>

              <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-1">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-teal-400" />
                  <span>PIX</span>
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-black text-zinc-100">R$ {valorPix.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-500 font-bold">{countPix} vendas</span>
                </div>
              </div>

              <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-1">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  <span>Débito</span>
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-black text-zinc-100">R$ {valorDebito.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-500 font-bold">{countDebito} vendas</span>
                </div>
              </div>

              <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-1">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                  <span>Crédito</span>
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-black text-zinc-100">R$ {valorCredito.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-500 font-bold">{countCredito} vendas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Esperado em Dinheiro (Gaveta) */}
          <div className="bg-gradient-to-r from-orange-500/10 via-zinc-900 to-zinc-900 border border-orange-500/30 rounded-3xl p-5 space-y-2 shadow-xl">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">Esperado em dinheiro</span>
            <div className="text-3xl font-black text-orange-400">R$ {esperadoDinheiro.toFixed(2)}</div>
            <p className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 pt-1">
              <Info className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Valor inicial + vendas em dinheiro + entradas − despesas. Use no fechamento para conferir a gaveta.</span>
            </p>
          </div>

          {/* Ações Rápidas & Entradas e Despesas */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="font-black text-zinc-100 text-sm flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>Entradas e despesas</span>
              </h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEntradaModal(true)}
                  className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/30 flex items-center gap-1.5 transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Nova entrada</span>
                </button>

                <button
                  onClick={() => setShowDespesaModal(true)}
                  className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs rounded-xl border border-rose-500/30 flex items-center gap-1.5 transition-all"
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                  <span>Nova despesa</span>
                </button>
              </div>
            </div>

            {lancamentosEntradaDespesa.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 font-medium bg-zinc-950/60 rounded-2xl border border-zinc-800/80">
                Nenhum lançamento ainda
              </div>
            ) : (
              <div className="space-y-2">
                {lancamentosEntradaDespesa.map((mov) => (
                  <div key={mov.id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-2xl border border-zinc-800 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        mov.tipo === 'Entrada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {mov.tipo}
                      </span>
                      <span className="text-zinc-200 font-bold">{mov.descricao}</span>
                      <span className="text-[10px] text-zinc-500">às {mov.hora}</span>
                    </div>

                    <span className={`font-black ${mov.tipo === 'Entrada' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {mov.tipo === 'Entrada' ? '+' : '-'} R$ {mov.valor.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vendas do caixa (Qtd e Detalhamento de Produtos) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-2">
              <div className="flex items-center gap-3">
                <h3 className="font-black text-zinc-100 text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-orange-500" />
                  <span>Vendas do caixa ({totalVendasQtd})</span>
                </h3>
                {Boolean(onExcluirVenda && vendasCaixa.length > 0) && (
                  <button
                    onClick={() => setShowConfirmLimparVendas(true)}
                    className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[10px] rounded-lg border border-rose-500/30 flex items-center gap-1 transition-all"
                    title="Excluir todas as vendas registradas indevidamente neste caixa"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpar Vendas deste Caixa</span>
                  </button>
                )}
              </div>
              <span className="text-[11px] font-bold text-zinc-400">
                Total acumulado: <strong className="text-orange-500">R$ {totalVendasValor.toFixed(2)}</strong>
              </span>
            </div>

            {vendasCaixa.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 font-medium bg-zinc-950/60 rounded-2xl border border-zinc-800/80">
                Nenhuma venda realizada neste caixa ainda.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {vendasCaixa.map((venda) => {
                  const horaStr = formatTimeLocal(venda.data_hora);
                  const produtosList = venda.produtos || [];
                  const totalItensQtd = produtosList.reduce((acc, p) => acc + (p.quantidade || 0), 0);

                  return (
                    <div key={venda.id} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4 space-y-3 hover:border-zinc-700/80 transition-all shadow-sm">
                      {/* Cabeçalho da Venda */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg font-mono text-[11px] font-black">
                            Venda #{venda.numero_venda || venda.id.slice(0, 5)}
                          </span>
                          <div className="flex items-center gap-1 text-zinc-400 font-mono text-[11px] bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                            <Clock className="w-3.5 h-3.5 text-orange-400" />
                            <span>{horaStr}</span>
                          </div>
                          {venda.cliente_nome && (
                            <span className="text-[11px] text-zinc-300 font-semibold bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                              Cliente: <strong className="text-zinc-100">{venda.cliente_nome}</strong>
                            </span>
                          )}
                          {venda.usuario && (
                            <span className="text-[11px] text-zinc-400 font-medium bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800 hidden sm:inline-block">
                              Op: <strong className="text-zinc-200">{venda.usuario}</strong>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-800/90 text-zinc-200 font-bold text-[11px] border border-zinc-700/50">
                            {venda.forma_pagamento}
                          </span>
                          <span className="font-black text-orange-500 text-sm bg-orange-500/10 px-2.5 py-0.5 rounded-lg border border-orange-500/20">
                            R$ {venda.total.toFixed(2)}
                          </span>

                          {(onExcluirVenda || onCancelarVenda) && (
                            <button
                              onClick={() => setVendaParaExcluir(venda)}
                              className="p-1.5 bg-zinc-900 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/40 rounded-lg transition-all ml-1"
                              title="Excluir ou cancelar venda não realizada"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lista de Produtos Vendidos */}
                      <div className="space-y-2 pt-0.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                          <span className="uppercase tracking-wider flex items-center gap-1 text-zinc-300">
                            <Package className="w-3.5 h-3.5 text-orange-400" />
                            <span>Produtos Vendidos ({totalItensQtd} {totalItensQtd === 1 ? 'item' : 'itens'}):</span>
                          </span>
                          {venda.desconto_valor > 0 && (
                            <span className="text-emerald-400 font-semibold text-[10px]">
                              Desconto: R$ {venda.desconto_valor.toFixed(2)} ({venda.desconto_porcentagem}%)
                            </span>
                          )}
                        </div>

                        {produtosList.length === 0 ? (
                          <div className="p-2 bg-zinc-900/60 rounded-xl border border-zinc-800 text-xs text-zinc-500 italic">
                            Nenhum produto discriminado nesta venda.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {produtosList.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-zinc-900 rounded-xl border border-zinc-800 text-xs hover:border-zinc-700 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md font-black text-[11px] shrink-0">
                                    {item.quantidade}x
                                  </span>
                                  <span className="font-semibold text-zinc-100 truncate" title={item.nome}>
                                    {item.nome}
                                  </span>
                                </div>
                                <div className="text-right shrink-0 pl-2">
                                  <span className="font-black text-zinc-100 block">R$ {item.subtotal.toFixed(2)}</span>
                                  <span className="text-[10px] text-zinc-400 font-medium block">R$ {item.preco_unitario.toFixed(2)} un</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão de expansão para histórico de caixas anteriores */}
      {caixasAnteriores.length > 0 && (
        <div className="flex flex-col items-center pt-4">
          <button
            onClick={() => setShowHistoricoCompleto(!showHistoricoCompleto)}
            className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-xs rounded-2xl flex items-center gap-2.5 transition-all shadow-md"
          >
            <Calendar className="w-4 h-4 text-orange-400" />
            <span>{showHistoricoCompleto ? 'Ocultar Histórico Anterior' : `Ver Histórico Anterior (${caixasAnteriores.length} caixas passados)`}</span>
            {showHistoricoCompleto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Cards de Histórico de Caixas Anteriores */}
      {showHistoricoCompleto && caixasAnteriores.length > 0 && (
        <div className="space-y-3 animate-in fade-in duration-200 border-t border-zinc-800/80 pt-6">
          <h3 className="font-black text-zinc-100 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span>Histórico de Caixas Anteriores</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {caixasAnteriores.map((cx) => (
              <div key={cx.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-zinc-700 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-black text-zinc-100 text-sm">{cx.data}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    cx.status === 'Aberto' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {cx.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Vendas</span>
                    <span className="text-zinc-200 font-bold">R$ {cx.valor_vendas.toFixed(2)}</span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">Saldo Esperado</span>
                    <span className="text-orange-400 font-bold">R$ {cx.saldo_esperado.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenVer(cx)}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-orange-400" />
                    <span>Ver Detalhes</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL ABERTURA DE CAIXA */}
      {showAbrirModal && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-base">Abertura de Caixa</h3>
              <button onClick={() => setShowAbrirModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAbrir} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Valor Inicial em Caixa (Troco R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={valorInicialInput}
                  onChange={(e) => setValorInicialInput(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-base font-black text-orange-500 focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Observação de Abertura</label>
                <input
                  type="text"
                  placeholder="Ex: Troco inicial deixado na gaveta"
                  value={obsAberturaInput}
                  onChange={(e) => setObsAberturaInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAbrirModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/20"
                >
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FECHAMENTO DE CAIXA */}
      {showFecharModal && selectedCaixa && (() => {
        const diff = valorInformadoInput - esperadoDinheiro;
        const faltou = diff < -0.001;
        const sobrou = diff > 0.001;
        const valorFaltante = Math.abs(diff);

        return (
          <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="font-black text-zinc-100 text-base">Fechamento de Caixa</h3>
                <button onClick={() => setShowFecharModal(false)} className="text-zinc-500 hover:text-zinc-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmFechar} className="space-y-4">
                <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block">Saldo Esperado em Dinheiro</span>
                  <span className="text-lg font-black text-orange-400">R$ {esperadoDinheiro.toFixed(2)}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Valor em Dinheiro Contado na Gaveta (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={valorInformadoInput}
                    onChange={(e) => setValorInformadoInput(parseFloat(e.target.value) || 0)}
                    className={`w-full bg-zinc-950 border rounded-xl px-3 py-2.5 text-base font-black outline-none transition-colors ${
                      faltou 
                        ? 'border-rose-500 text-rose-400 focus:border-rose-500' 
                        : sobrou 
                          ? 'border-amber-500 text-amber-400 focus:border-amber-500'
                          : 'border-zinc-800 text-zinc-100 focus:border-orange-500'
                    }`}
                  />
                </div>

                {/* ALERTAS DINÂMICOS DE DIVERGÊNCIA / QUEBRA DE CAIXA */}
                {faltou && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 space-y-1 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 text-rose-400 font-black">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>FALTOU R$ {valorFaltante.toFixed(2)} NA GAVETA</span>
                    </div>
                    <p className="text-zinc-300 text-[11px] font-medium leading-relaxed">
                      O valor informado (R$ {valorInformadoInput.toFixed(2)}) é <strong>menor</strong> que o esperado (R$ {esperadoDinheiro.toFixed(2)}). O fechamento é permitido e registrará a quebra de caixa de R$ {valorFaltante.toFixed(2)}.
                    </p>
                  </div>
                )}

                {sobrou && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-1 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 text-amber-400 font-black">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>SOBROU R$ {diff.toFixed(2)} NA GAVETA</span>
                    </div>
                    <p className="text-zinc-300 text-[11px] font-medium leading-relaxed">
                      O valor informado (R$ {valorInformadoInput.toFixed(2)}) é <strong>maior</strong> que o saldo esperado (R$ {esperadoDinheiro.toFixed(2)}).
                    </p>
                  </div>
                )}

                {!faltou && !sobrou && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-xs flex items-center gap-2 text-emerald-400 font-bold">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Valor informado bate 100% com o saldo esperado em dinheiro.</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Observação de Fechamento</label>
                  <input
                    type="text"
                    placeholder={faltou ? `Ex: Quebra de caixa de R$ ${valorFaltante.toFixed(2)}` : "Ex: Conferido sem divergências"}
                    value={obsFechamentoInput}
                    onChange={(e) => setObsFechamentoInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowFecharModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2.5 font-black text-xs rounded-xl shadow-lg transition-all ${
                      faltou
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                        : 'bg-orange-500 hover:bg-orange-600 text-zinc-950 shadow-orange-500/20'
                    }`}
                  >
                    {faltou ? `Fechar Caixa (Faltou R$ ${valorFaltante.toFixed(2)})` : 'Confirmar Fechamento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL NOVA ENTRADA (SUPRIMENTO) */}
      {showEntradaModal && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <span>Nova Entrada (Suprimento)</span>
              </h3>
              <button onClick={() => setShowEntradaModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmEntrada} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Valor da Entrada (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={valorMovInput || ''}
                  onChange={(e) => setValorMovInput(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-base font-black text-emerald-400 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Descrição / Motivo</label>
                <input
                  type="text"
                  placeholder="Ex: Suprimento adicional de troco"
                  value={descMovInput}
                  onChange={(e) => setDescMovInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowEntradaModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Adicionar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA DESPESA (SANGRIA) */}
      {showDespesaModal && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
                <MinusCircle className="w-5 h-5 text-rose-400" />
                <span>Nova Despesa (Sangria)</span>
              </h3>
              <button onClick={() => setShowDespesaModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDespesa} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Valor da Despesa / Retirada (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={valorMovInput || ''}
                  onChange={(e) => setValorMovInput(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-base font-black text-rose-400 focus:border-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Descrição / Motivo</label>
                <input
                  type="text"
                  placeholder="Ex: Pagamento fornecedor de gelo"
                  value={descMovInput}
                  onChange={(e) => setDescMovInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-rose-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowDespesaModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-500/20"
                >
                  Adicionar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DO CAIXA */}
      {showDetalhesModal && selectedCaixa && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-black text-zinc-100 text-base">Lançamentos do Caixa — {selectedCaixa.data}</h3>
                <p className="text-xs text-zinc-400">Aberto por: {selectedCaixa.usuario_abertura}</p>
              </div>
              <button onClick={() => setShowDetalhesModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {(selectedCaixa.movimentacoes || []).length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">Nenhum lançamento registrado neste caixa.</p>
              ) : (
                selectedCaixa.movimentacoes.map((mov) => (
                  <div key={mov.id} className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-zinc-200 block">{mov.descricao}</span>
                      <span className="text-[10px] text-zinc-500">{mov.hora} • {mov.forma_pagamento || 'Dinheiro'}</span>
                    </div>
                    <span className={`font-black ${mov.tipo === 'Entrada' || mov.tipo === 'Venda' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      R$ {mov.valor.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => handleExportCaixaPdf(selectedCaixa)}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs flex items-center gap-2 shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Baixar PDF do Caixa</span>
              </button>
              <button
                onClick={() => setShowDetalhesModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: EXCLUIR VENDA INDEVIDA */}
      {vendaParaExcluir && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-zinc-100 text-base">Excluir Venda Indevida?</h3>
                <p className="text-xs text-zinc-400">Esta venda será removida do caixa diário.</p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400 font-medium">Venda:</span>
                <span className="font-bold text-zinc-100">#{vendaParaExcluir.numero_venda || vendaParaExcluir.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-medium">Valor Total:</span>
                <span className="font-black text-rose-400">R$ {vendaParaExcluir.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-medium">Pagamento:</span>
                <span className="text-zinc-300 font-semibold">{vendaParaExcluir.forma_pagamento}</span>
              </div>
              {vendaParaExcluir.cliente_nome && (
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-medium">Cliente:</span>
                  <span className="text-zinc-300">{vendaParaExcluir.cliente_nome}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVendaParaExcluir(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onExcluirVenda) {
                    onExcluirVenda(vendaParaExcluir.id);
                  } else if (onCancelarVenda) {
                    onCancelarVenda(vendaParaExcluir.id);
                  }
                  setVendaParaExcluir(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir do Caixa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: LIMPAR TODAS AS VENDAS DESTE CAIXA */}
      {showConfirmLimparVendas && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-zinc-100 text-base">Limpar Todas as Vendas?</h3>
                <p className="text-xs text-zinc-400">Todas as {vendasCaixa.length} vendas registradas neste caixa serão excluídas.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl leading-relaxed">
              Use esta opção para remover vendas de teste ou lançadas indevidamente que não foram feitas. O saldo e as métricas do caixa serão recalculados para R$ 0,00.
            </p>

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmLimparVendas(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  vendasCaixa.forEach(v => {
                    if (onExcluirVenda) {
                      onExcluirVenda(v.id);
                    } else if (onCancelarVenda) {
                      onCancelarVenda(v.id);
                    }
                  });
                  setShowConfirmLimparVendas(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar e Limpar Vendas</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
