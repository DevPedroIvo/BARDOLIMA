import React, { useState, useMemo, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { 
  Receipt, 
  Plus, 
  Search, 
  Clock, 
  User, 
  ShoppingCart, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  X, 
  Minus, 
  Calendar, 
  DollarSign, 
  Layers, 
  Barcode, 
  ArrowRight,
  History,
  FileText,
  Banknote,
  QrCode,
  CreditCard,
  Percent,
  Wallet,
  Check,
  CheckSquare,
  Square,
  ListChecks
} from 'lucide-react';
import { ContaComanda010, ItemContaComanda010, Produto010, PagamentoContaComanda010, ItemPagoComanda } from '../types/010types';
import { round2 } from '../utils/money';
import { formatDateTimeLocal, formatTimeLocal } from '../utils/dateUtils';

export interface ItemSelecionadoParaPagamento {
  itemId: string;
  produtoId: string;
  nome: string;
  codigo?: string;
  quantidadeTotal: number;
  quantidadePagar: number;
  precoUnitario: number;
  subtotal: number;
  selecionado: boolean;
}

interface Contas010Props {
  contas: ContaComanda010[];
  produtos: Produto010[];
  usuarioAtual: string;
  isCaixaAberto?: boolean;
  onCriarConta: (clienteNome: string, observacao?: string) => Promise<ContaComanda010>;
  onAdicionarItemConta: (contaId: string, produto: Produto010, quantidade: number) => Promise<void>;
  onAlterarQuantidadeItem: (contaId: string, itemId: string, delta: number) => Promise<void>;
  onRemoverItemConta: (contaId: string, itemId: string) => Promise<void>;
  onEncaminharParaPdv: (conta: ContaComanda010) => void;
  onPagarConta?: (
    contaId: string,
    valorPago: number,
    formaPagamento: 'Dinheiro' | 'Pix' | 'Cartão de Débito' | 'Cartão de Crédito',
    valorRecebido?: number,
    troco?: number,
    observacao?: string,
    itensPagos?: ItemPagoComanda[]
  ) => Promise<{ success: boolean; message: string }>;
  onEncerrarApagarConta?: (contaId: string) => Promise<void>;
}

export const Contas010: React.FC<Contas010Props> = ({
  contas,
  produtos,
  usuarioAtual,
  isCaixaAberto = true,
  onCriarConta,
  onAdicionarItemConta,
  onAlterarQuantidadeItem,
  onRemoverItemConta,
  onEncaminharParaPdv,
  onPagarConta,
  onEncerrarApagarConta
}) => {
  // Aba ativa: Contas Abertas vs Histórico Encerradas
  const [tabFiltro, setTabFiltro] = useState<'abertas' | 'encerradas'>('abertas');
  const [searchTerm, setSearchTerm] = useState('');

  // Modais
  const [showNovaContaModal, setShowNovaContaModal] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novaObservacao, setNovaObservacao] = useState('');
  const [isSubmittingNovaConta, setIsSubmittingNovaConta] = useState(false);

  // Pop-up de Confirmação para Encerrar e Apagar Comanda por Completo (sem ir para o PDV)
  const [contaParaEncerrar, setContaParaEncerrar] = useState<ContaComanda010 | null>(null);
  const [isEncerrando, setIsEncerrando] = useState(false);

  // Comanda Selecionada para Detalhes / Lançamento
  const [selectedContaId, setSelectedContaId] = useState<string | null>(null);

  // Modal de Pagamento de Comanda (Inteira, Metade, Por Itens ou Parcial)
  const [contaParaPagar, setContaParaPagar] = useState<ContaComanda010 | null>(null);
  const [tipoValorPagamento, setTipoValorPagamento] = useState<'inteira' | 'metade' | 'itens' | 'personalizado'>('inteira');
  const [valorPagamentoInput, setValorPagamentoInput] = useState<number>(0);
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState<'Dinheiro' | 'Pix' | 'Cartão de Débito' | 'Cartão de Crédito'>('Dinheiro');
  const [valorRecebidoDinheiro, setValorRecebidoDinheiro] = useState<number>(0);
  const [obsPagamento, setObsPagamento] = useState<string>('');
  const [isSubmittingPagamento, setIsSubmittingPagamento] = useState(false);
  const [pagamentoFeedback, setPagamentoFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  // Lista de itens disponíveis para pagamento por seleção
  const [itensParaPagar, setItensParaPagar] = useState<ItemSelecionadoParaPagamento[]>([]);

  // Estado do formulário de adição de produto na comanda
  const [prodSearchTerm, setProdSearchTerm] = useState('');
  const [selectedProdutoId, setSelectedProdutoId] = useState<string>('');
  const [qtdAdicionar, setQtdAdicionar] = useState<number>(1);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addItemFeedback, setAddItemFeedback] = useState<string | null>(null);

  // Mapa de itens sob demanda para garantia de exibição dos itens consumidos
  const [itensExtrasMap, setItensExtrasMap] = useState<Record<string, ItemContaComanda010[]>>({});

  // Conta atualmente selecionada para o modal
  const selectedConta = useMemo(() => {
    const found = contas.find(c => c.id === selectedContaId);
    if (!found) return null;
    const extras = itensExtrasMap[found.id];
    if (extras && extras.length > 0 && (!found.itens || found.itens.length === 0)) {
      return { ...found, itens: extras };
    }
    return found;
  }, [contas, selectedContaId, itensExtrasMap]);

  // Sempre que uma comanda for aberta no modal, garante a busca imediata dos itens consumidos se estiverem vazios
  useEffect(() => {
    if (selectedContaId) {
      const conta = contas.find(c => c.id === selectedContaId);
      if (!conta || !conta.itens || conta.itens.length === 0) {
        supabaseService.fetchItensContaComanda(selectedContaId).then(itens => {
          if (itens && itens.length > 0) {
            setItensExtrasMap(prev => ({ ...prev, [selectedContaId]: itens }));
          }
        }).catch(() => {});
      }
    }
  }, [selectedContaId, contas]);

  // Contas Abertas e Encerradas
  const contasAbertas = useMemo(() => {
    return contas.filter(c => c.status === 'ABERTA');
  }, [contas]);

  const contasEncerradas = useMemo(() => {
    return contas.filter(c => c.status === 'ENCERRADA');
  }, [contas]);

  // Totais Gerais para os Cards de Resumo
  const totalValorAberto = useMemo(() => {
    return contasAbertas.reduce((acc, c) => {
      const total = round2(c.total || c.itens.reduce((iAcc, it) => iAcc + it.subtotal, 0));
      const jaPago = round2(c.total_pago || (c.pagamentos || []).reduce((pAcc, p) => pAcc + p.valor, 0));
      return round2(acc + Math.max(0, total - jaPago));
    }, 0);
  }, [contasAbertas]);

  const totalValorRecebidoAbertas = useMemo(() => {
    return contasAbertas.reduce((acc, c) => {
      const jaPago = round2(c.total_pago || (c.pagamentos || []).reduce((pAcc, p) => pAcc + p.valor, 0));
      return round2(acc + jaPago);
    }, 0);
  }, [contasAbertas]);

  // Abre o modal de pagamento configurando valor (inteira, metade, por itens ou personalizado)
  const handleOpenPagamento = (conta: ContaComanda010, opcao: 'inteira' | 'metade' | 'itens' = 'inteira') => {
    const total = round2(conta.total || conta.itens.reduce((acc, it) => acc + it.subtotal, 0));
    const jaPago = round2(conta.total_pago || (conta.pagamentos || []).reduce((acc, p) => acc + p.valor, 0));
    const saldo = round2(Math.max(0, total - jaPago));

    // Inicializa a lista de itens da comanda disponíveis para pagamento
    const itensMapeados: ItemSelecionadoParaPagamento[] = (conta.itens || []).map(it => ({
      itemId: it.id,
      produtoId: it.produto_id,
      nome: it.produto_nome,
      codigo: it.produto_codigo,
      quantidadeTotal: it.quantidade,
      quantidadePagar: it.quantidade,
      precoUnitario: it.preco_unitario,
      subtotal: round2(it.quantidade * it.preco_unitario),
      selecionado: true
    }));
    setItensParaPagar(itensMapeados);

    setContaParaPagar(conta);
    setTipoValorPagamento(opcao);

    let valorInicial = saldo;
    if (opcao === 'metade') {
      valorInicial = round2(saldo / 2);
    } else if (opcao === 'itens') {
      valorInicial = round2(itensMapeados.reduce((acc, it) => acc + it.subtotal, 0));
    }

    setValorPagamentoInput(valorInicial);
    setValorRecebidoDinheiro(valorInicial);
    setFormaPagamentoSelecionada('Dinheiro');
    setObsPagamento('');
    setPagamentoFeedback(null);
  };

  const handleSelecionarTipoValor = (tipo: 'inteira' | 'metade' | 'itens' | 'personalizado') => {
    if (!contaParaPagar) return;
    const total = round2(contaParaPagar.total || contaParaPagar.itens.reduce((acc, it) => acc + it.subtotal, 0));
    const jaPago = round2(contaParaPagar.total_pago || (contaParaPagar.pagamentos || []).reduce((acc, p) => acc + p.valor, 0));
    const saldo = round2(Math.max(0, total - jaPago));

    setTipoValorPagamento(tipo);
    if (tipo === 'inteira') {
      setValorPagamentoInput(saldo);
      setValorRecebidoDinheiro(saldo);
    } else if (tipo === 'metade') {
      const metade = round2(saldo / 2);
      setValorPagamentoInput(metade);
      setValorRecebidoDinheiro(metade);
    } else if (tipo === 'itens') {
      const totalDosItens = round2(itensParaPagar.filter(i => i.selecionado).reduce((acc, it) => acc + (it.quantidadePagar * it.precoUnitario), 0));
      setValorPagamentoInput(totalDosItens);
      setValorRecebidoDinheiro(totalDosItens);
    }
  };

  // Funções para manipulação dos itens a serem pagos
  const handleToggleItemSelecionado = (itemId: string) => {
    setItensParaPagar(prev => {
      const updated = prev.map(item => 
        item.itemId === itemId ? { ...item, selecionado: !item.selecionado } : item
      );
      const totalItens = round2(updated.filter(i => i.selecionado).reduce((acc, it) => acc + (it.quantidadePagar * it.precoUnitario), 0));
      setValorPagamentoInput(totalItens);
      if (formaPagamentoSelecionada === 'Dinheiro') {
        setValorRecebidoDinheiro(totalItens);
      }
      return updated;
    });
  };

  const handleAlterarQtdItemPagar = (itemId: string, delta: number) => {
    setItensParaPagar(prev => {
      const updated = prev.map(item => {
        if (item.itemId === itemId) {
          const novaQtd = Math.min(item.quantidadeTotal, Math.max(1, item.quantidadePagar + delta));
          return {
            ...item,
            quantidadePagar: novaQtd,
            subtotal: round2(novaQtd * item.precoUnitario)
          };
        }
        return item;
      });
      const totalItens = round2(updated.filter(i => i.selecionado).reduce((acc, it) => acc + (it.quantidadePagar * it.precoUnitario), 0));
      setValorPagamentoInput(totalItens);
      if (formaPagamentoSelecionada === 'Dinheiro') {
        setValorRecebidoDinheiro(totalItens);
      }
      return updated;
    });
  };

  const handleMarcarTodosItens = (marcar: boolean) => {
    setItensParaPagar(prev => {
      const updated = prev.map(item => ({ ...item, selecionado: marcar }));
      const totalItens = marcar 
        ? round2(updated.reduce((acc, it) => acc + (it.quantidadePagar * it.precoUnitario), 0))
        : 0;
      setValorPagamentoInput(totalItens);
      if (formaPagamentoSelecionada === 'Dinheiro') {
        setValorRecebidoDinheiro(totalItens);
      }
      return updated;
    });
  };

  const handleConfirmarPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaParaPagar || !onPagarConta || isSubmittingPagamento) return;
    if (valorPagamentoInput <= 0) {
      setPagamentoFeedback({ tipo: 'erro', texto: 'Informe ou selecione um valor maior que R$ 0,00 para o pagamento.' });
      return;
    }

    const troco = formaPagamentoSelecionada === 'Dinheiro' && valorRecebidoDinheiro > valorPagamentoInput
      ? valorRecebidoDinheiro - valorPagamentoInput
      : 0;

    const itensEscolhidos = tipoValorPagamento === 'itens'
      ? itensParaPagar
          .filter(i => i.selecionado && i.quantidadePagar > 0)
          .map(i => ({
            itemId: i.itemId,
            produtoId: i.produtoId,
            nome: i.nome,
            codigo: i.codigo,
            quantidade: i.quantidadePagar,
            precoUnitario: i.precoUnitario,
            subtotal: round2(i.quantidadePagar * i.precoUnitario)
          }))
      : undefined;

    if (tipoValorPagamento === 'itens' && (!itensEscolhidos || itensEscolhidos.length === 0)) {
      setPagamentoFeedback({ tipo: 'erro', texto: 'Selecione pelo menos um item para realizar o pagamento.' });
      return;
    }

    try {
      setIsSubmittingPagamento(true);
      const res = await onPagarConta(
        contaParaPagar.id,
        valorPagamentoInput,
        formaPagamentoSelecionada,
        formaPagamentoSelecionada === 'Dinheiro' ? valorRecebidoDinheiro : valorPagamentoInput,
        troco,
        obsPagamento,
        itensEscolhidos
      );

      if (res.success) {
        setPagamentoFeedback({ tipo: 'sucesso', texto: res.message });
        setTimeout(() => {
          setContaParaPagar(null);
          setPagamentoFeedback(null);
        }, 1200);
      } else {
        setPagamentoFeedback({ tipo: 'erro', texto: res.message });
      }
    } catch (err: any) {
      setPagamentoFeedback({ tipo: 'erro', texto: err.message || 'Erro ao processar pagamento.' });
    } finally {
      setIsSubmittingPagamento(false);
    }
  };

  // Filtro de Pesquisa
  const contasFiltradas = useMemo(() => {
    const list = tabFiltro === 'abertas' ? contasAbertas : contasEncerradas;
    if (!searchTerm.trim()) return list;

    const term = searchTerm.toLowerCase().trim();
    return list.filter(c => 
      c.cliente_nome.toLowerCase().includes(term) ||
      String(c.numero_conta).includes(term) ||
      (c.venda_numero && String(c.venda_numero).includes(term)) ||
      (c.observacao && c.observacao.toLowerCase().includes(term))
    );
  }, [tabFiltro, contasAbertas, contasEncerradas, searchTerm]);

  // Produtos filtrados para o dropdown de adição na comanda
  const produtosDisponiveis = useMemo(() => {
    if (!prodSearchTerm.trim()) {
      return produtos.slice(0, 15);
    }
    const term = prodSearchTerm.toLowerCase().trim();
    return produtos.filter(p => 
      p.nome.toLowerCase().includes(term) ||
      p.codigo.toLowerCase().includes(term) ||
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(term))
    ).slice(0, 20);
  }, [produtos, prodSearchTerm]);

  const produtoSelecionadoObj = useMemo(() => {
    return produtos.find(p => p.id === selectedProdutoId) || null;
  }, [produtos, selectedProdutoId]);

  // Handler para criar nova conta
  const handleConfirmarNovaConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoClienteNome.trim() || isSubmittingNovaConta) return;

    try {
      setIsSubmittingNovaConta(true);
      const novaConta = await onCriarConta(novoClienteNome.trim(), novaObservacao.trim());
      setNovoClienteNome('');
      setNovaObservacao('');
      setShowNovaContaModal(false);
      // Abre imediatamente o modal de detalhes para o operador poder lançar itens
      setSelectedContaId(novaConta.id);
    } catch {
      // Silencioso
    } finally {
      setIsSubmittingNovaConta(false);
    }
  };

  // Handler para adicionar item à comanda de forma instantânea
  const handleAdicionarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContaId || !selectedProdutoId || qtdAdicionar < 1) return;

    const prod = produtos.find(p => p.id === selectedProdutoId);
    if (!prod) return;

    const qtd = qtdAdicionar;
    const contaId = selectedContaId;

    // Feedback e reset imediatos da busca para o operador já poder lançar o próximo item
    setSelectedProdutoId('');
    setProdSearchTerm('');
    setQtdAdicionar(1);
    setAddItemFeedback(`+ ${qtd}x ${prod.nome} lançado!`);
    setTimeout(() => setAddItemFeedback(null), 2500);

    try {
      await onAdicionarItemConta(contaId, prod, qtd);
    } catch {
      // Silencioso
    }
  };

  // Formatação de data/hora
  const formatarDataHora = (dataIso?: string) => {
    if (!dataIso) return '-';
    return formatDateTimeLocal(dataIso);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-16 animate-in fade-in select-none">
      {/* 1. CABEÇALHO DA ABA CONTAS & COMANDAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-md shadow-orange-500/10">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
                Contas e Comandas
              </h1>
              <p className="text-xs text-zinc-400 font-medium">
                Controle de consumo no balcão e mesas com encerramento direto no PDV
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowNovaContaModal(true)}
          className="px-5 py-3 bg-orange-500 hover:bg-orange-600 active:scale-95 text-zinc-950 font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Conta</span>
        </button>
      </div>

      {/* 2. CARDS RESUMO / INDICADORES RÁPIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Contas Abertas
            </span>
            <div className="text-2xl font-black text-zinc-100 flex items-center gap-2">
              <span>{contasAbertas.length}</span>
              {contasAbertas.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-800 text-orange-400 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Saldo a Receber
            </span>
            <div className="text-2xl font-black text-orange-400">
              R$ {totalValorAberto.toFixed(2)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Recebido nas Abertas
            </span>
            <div className="text-2xl font-black text-emerald-400">
              R$ {totalValorRecebidoAbertas.toFixed(2)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Histórico Encerradas
            </span>
            <div className="text-2xl font-black text-zinc-300">
              {contasEncerradas.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. BARRA DE PESQUISA & SELETOR DE ABA (ABERTAS VS ENCERRADAS) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        {/* Input de Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Pesquisar por cliente, número da comanda (#1001)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 font-medium transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Botões de Filtro / Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
          <button
            onClick={() => setTabFiltro('abertas')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
              tabFiltro === 'abertas'
                ? 'bg-orange-500 text-zinc-950 shadow-md shadow-orange-500/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Abertas ({contasAbertas.length})</span>
          </button>

          <button
            onClick={() => setTabFiltro('encerradas')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
              tabFiltro === 'encerradas'
                ? 'bg-orange-500 text-zinc-950 shadow-md shadow-orange-500/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Encerradas ({contasEncerradas.length})</span>
          </button>
        </div>
      </div>

      {/* 4. LISTA DE CONTAS EM FORMATO DE CARDS */}
      {contasFiltradas.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-zinc-800 text-zinc-500 flex items-center justify-center">
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-black text-zinc-200 text-base">
              {tabFiltro === 'abertas' ? 'Nenhuma comanda aberta no momento' : 'Nenhuma conta encerrada encontrada'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
              {tabFiltro === 'abertas' 
                ? 'Abra uma nova comanda para clientes consumindo no balcão ou proximidades.'
                : 'Quando uma conta for finalizada no PDV, ela ficará registrada aqui no histórico.'}
            </p>
          </div>
          {tabFiltro === 'abertas' && (
            <button
              onClick={() => setShowNovaContaModal(true)}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/20 inline-flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Criar Primeira Conta</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contasFiltradas.map((conta) => {
            const isAberta = conta.status === 'ABERTA';
            const totalItens = conta.itens.reduce((acc, it) => acc + it.quantidade, 0);
            const totalConta = round2(conta.total || conta.itens.reduce((acc, it) => acc + it.subtotal, 0));
            const totalPago = round2(conta.total_pago || (conta.pagamentos || []).reduce((acc, p) => acc + p.valor, 0));
            const saldoRestante = round2(Math.max(0, totalConta - totalPago));
            const isParcial = isAberta && totalPago > 0 && saldoRestante > 0;
            const pctPago = totalConta > 0 ? Math.min(100, Math.round((totalPago / totalConta) * 100)) : 0;

            return (
              <div
                key={conta.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-xl transition-all group relative"
              >
                {/* Topo do Card: Número da Comanda & Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-zinc-950 text-orange-400 border border-zinc-800">
                      #{conta.numero_conta}
                    </span>

                    {/* Badge de Status Inteligente */}
                    {isAberta ? (
                      isParcial ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                          <span>{pctPago}% Pago</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Aberta</span>
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Encerrada</span>
                      </span>
                    )}
                  </div>

                  {/* Nome do Cliente (completo sem corte!) */}
                  <div>
                    <h3 className="font-black text-zinc-100 text-base leading-snug break-words whitespace-normal group-hover:text-orange-400 transition-colors">
                      {conta.cliente_nome}
                    </h3>
                    {conta.observacao && (
                      <p className="text-[11px] text-zinc-400 mt-0.5 break-words">
                        {conta.observacao}
                      </p>
                    )}
                  </div>

                  {/* Detalhes de Abertura & Operador */}
                  <div className="space-y-1 text-xs text-zinc-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>Aberta: {formatarDataHora(conta.data_abertura)}</span>
                    </div>
                    {conta.data_encerramento && (
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Encerrada: {formatarDataHora(conta.data_encerramento)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span>Op: {conta.usuario_abertura || 'admin'}</span>
                    </div>
                  </div>
                </div>

                {/* Bloco de Valor e Saldo Restante */}
                <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-500 uppercase block">
                        {totalPago > 0 ? "Falta Pagar (Saldo)" : "Total da Conta"}
                      </span>
                      <div className={`text-xl font-black ${totalPago > 0 ? "text-amber-400" : "text-orange-500"}`}>
                        R$ {saldoRestante.toFixed(2)}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Consumo</span>
                      <div className="text-xs font-bold text-zinc-200">
                        <span className="font-black text-sm text-zinc-100">{totalItens}</span> {totalItens === 1 ? 'item' : 'itens'}
                      </div>
                    </div>
                  </div>

                  {/* Detalhamento se houver pagamento parcial */}
                  {totalPago > 0 && (
                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">
                        Total Original: <strong className="text-zinc-200">R$ {totalConta.toFixed(2)}</strong>
                      </span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Já Pago: R$ {totalPago.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Vínculo de Venda quando Encerrada */}
                {conta.venda_numero && (
                  <div className="text-[11px] text-zinc-400 font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <span>Venda Associada:</span>
                    <span className="text-orange-400 font-bold">#{conta.venda_numero}</span>
                  </div>
                )}

                {/* Botões de Ação do Card */}
                <div className="pt-2 border-t border-zinc-800/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedContaId(conta.id)}
                      className="flex-1 py-2 px-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border border-zinc-700"
                      title="Ver detalhes dos produtos e histórico"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Ver Detalhes</span>
                    </button>

                    {isAberta && (
                      <button
                        onClick={() => handleOpenPagamento(conta, 'inteira')}
                        disabled={saldoRestante <= 0 && totalConta <= 0}
                        className={`py-2 px-3 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all ${
                          saldoRestante <= 0 && totalConta <= 0
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-800'
                            : 'bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 border border-emerald-500/30'
                        }`}
                        title="Pagar inteira, metade ou qualquer valor direto no Caixa"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Pagar</span>
                      </button>
                    )}
                  </div>

                  {isAberta && (
                    <button
                      onClick={() => setContaParaEncerrar(conta)}
                      className="w-full py-2.5 px-3 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 active:scale-95"
                      title="Encerrar e apagar a conta por completo sem ir para o PDV"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Encerrar Conta</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL: CRIAR NOVA CONTA */}
      {/* ========================================================= */}
      {showNovaContaModal && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-500" />
                <span>Abrir Nova Comanda</span>
              </h3>
              <button 
                onClick={() => setShowNovaContaModal(false)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarNovaConta} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: João Silva, Mesa 4, Carlinhos..."
                  value={novoClienteNome}
                  onChange={(e) => setNovoClienteNome(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-medium focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Observação / Localização (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Balcão externo, mesa em frente à distribuidora..."
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-medium focus:border-orange-500 outline-none"
                />
              </div>

              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs text-zinc-300 space-y-1">
                <div className="font-bold text-orange-400">Informações Automáticas:</div>
                <div className="text-[11px] text-zinc-400">
                  • Status inicial: <strong>ABERTA</strong><br />
                  • Operador responsável: <strong>{usuarioAtual || 'admin'}</strong><br />
                  • Não exige pagamento imediato; os itens serão somados até o encerramento.
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowNovaContaModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!novoClienteNome.trim() || isSubmittingNovaConta}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmittingNovaConta ? 'Abrindo...' : 'Abrir Comanda'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* 6. MODAL: DETALHES DA CONTA (LAYOUT EM 2 COLUNAS COMPACTO) */}
      {/* ========================================================= */}
      {selectedConta && (() => {
        const totalSel = selectedConta.total || selectedConta.itens.reduce((acc, it) => acc + it.subtotal, 0);
        const pagoSel = selectedConta.total_pago || (selectedConta.pagamentos || []).reduce((acc, p) => acc + p.valor, 0);
        const saldoSel = Math.max(0, totalSel - pagoSel);
        const isAberta = selectedConta.status === 'ABERTA';
        const temPagamentos = (selectedConta.pagamentos || []).length > 0;
        const totalItens = selectedConta.itens.reduce((acc, it) => acc + it.quantidade, 0);

        return (
          <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-5xl w-full p-4 sm:p-5 shadow-2xl max-h-[92vh] flex flex-col relative overflow-hidden">
              
              {/* CABEÇALHO COMPACTO */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-zinc-950 text-orange-400 border border-zinc-800 shrink-0">
                    #{selectedConta.numero_conta}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-zinc-100 text-base sm:text-lg leading-tight truncate">
                        {selectedConta.cliente_nome}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isAberta
                          ? pagoSel > 0 
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {isAberta ? (pagoSel > 0 ? 'Parcialmente Paga' : 'Aberta') : 'Encerrada'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      Aberta: {formatarDataHora(selectedConta.data_abertura)} • Op: {selectedConta.usuario_abertura || 'admin'}
                      {selectedConta.observacao && <span className="italic"> — {selectedConta.observacao}</span>}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedContaId(null)}
                  className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-xl hover:bg-zinc-800 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* FEEDBACK DE ADIÇÃO RÁPIDA */}
              {addItemFeedback && (
                <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in shrink-0 mt-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{addItemFeedback}</span>
                </div>
              )}

              {/* CORPO EM 2 COLUNAS (ORGANIZADO PARA CABER TUDO NA TELA) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0 overflow-hidden pt-3">
                
                {/* COLUNA ESQUERDA: PRODUTOS CONSUMIDOS & LANÇAMENTO (7 COLUNAS) */}
                <div className="lg:col-span-7 flex flex-col min-h-0 bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 shrink-0">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Itens Consumidos ({totalItens} un)
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">
                      Subtotal
                    </span>
                  </div>

                  {/* FORMULÁRIO COMPACTO DE ADICIONAR PRODUTO (1 LINHA) */}
                  {isAberta && (
                    <form onSubmit={handleAdicionarItem} className="py-2.5 border-b border-zinc-800/60 shrink-0 space-y-2">
                      <div className="flex items-center gap-2">
                        {/* Campo de Busca de Produto com Dropdown */}
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Buscar produto por nome ou código..."
                            value={prodSearchTerm}
                            onChange={(e) => {
                              setProdSearchTerm(e.target.value);
                              setSelectedProdutoId('');
                            }}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 outline-none"
                          />

                          {produtosDisponiveis.length > 0 && !selectedProdutoId && prodSearchTerm.trim().length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-xl divide-y divide-zinc-800 shadow-2xl z-30">
                              {produtosDisponiveis.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedProdutoId(p.id);
                                    setProdSearchTerm(p.nome);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 transition-colors flex items-center justify-between"
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="font-bold text-zinc-200 truncate">{p.nome}</div>
                                    <div className="text-[10px] text-zinc-500">{p.codigo}</div>
                                  </div>
                                  <span className="font-black text-orange-400 shrink-0">
                                    R$ {p.preco.toFixed(2)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Quantidade */}
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setQtdAdicionar(prev => Math.max(1, prev - 1))}
                            className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={qtdAdicionar}
                            onChange={(e) => setQtdAdicionar(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-8 text-center bg-transparent text-xs font-black text-zinc-100 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setQtdAdicionar(prev => prev + 1)}
                            className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Botão de Adicionar */}
                        <button
                          type="submit"
                          disabled={!selectedProdutoId || isAddingItem}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all shrink-0 ${
                            !selectedProdutoId || isAddingItem
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              : 'bg-orange-500 hover:bg-orange-600 active:scale-95 text-zinc-950 shadow-md shadow-orange-500/20'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isAddingItem ? 'Lançando...' : 'Lançar'}</span>
                        </button>
                      </div>

                      {produtoSelecionadoObj && (
                        <div className="text-[11px] text-zinc-400 flex items-center justify-between px-1">
                          <span>Item selecionado: <strong className="text-zinc-200">{produtoSelecionadoObj.nome}</strong></span>
                          <span>Subtotal: <strong className="text-orange-400">R$ {(produtoSelecionadoObj.preco * qtdAdicionar).toFixed(2)}</strong></span>
                        </div>
                      )}
                    </form>
                  )}

                  {/* LISTA DE ITENS CONSUMIDOS COM SCROLL */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-zinc-900/80 min-h-0 pt-1">
                    {selectedConta.itens.length === 0 ? (
                      <div className="text-center py-10 text-zinc-500 text-xs">
                        Nenhum produto adicionado nesta comanda ainda.
                      </div>
                    ) : (
                      selectedConta.itens.map((item) => (
                        <div
                          key={item.id}
                          className="pt-1.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-zinc-100 truncate">
                              {item.produto_nome}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              R$ {item.preco_unitario.toFixed(2)} un • {item.quantidade}x
                            </div>
                          </div>

                          {/* Controles de Quantidade */}
                          {isAberta ? (
                            <div className="flex items-center gap-1 shrink-0 bg-zinc-900 px-1 py-0.5 rounded-lg border border-zinc-800">
                              <button
                                onClick={() => onAlterarQuantidadeItem(selectedConta.id, item.id, -1)}
                                className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center"
                                title="Diminuir"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-black text-zinc-100 text-[11px]">
                                {item.quantidade}
                              </span>
                              <button
                                onClick={() => onAlterarQuantidadeItem(selectedConta.id, item.id, 1)}
                                className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center"
                                title="Aumentar"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-bold text-zinc-400 text-xs">
                              {item.quantidade}x
                            </span>
                          )}

                          {/* Subtotal */}
                          <div className="text-right shrink-0 min-w-[70px]">
                            <span className="font-black text-orange-400 text-xs">
                              R$ {item.subtotal.toFixed(2)}
                            </span>
                          </div>

                          {/* Remover */}
                          {isAberta && (
                            <button
                              onClick={() => onRemoverItemConta(selectedConta.id, item.id)}
                              className="text-zinc-600 hover:text-rose-400 p-1 rounded transition-colors shrink-0"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* COLUNA DIREITA: PAINEL FINANCEIRO & AÇÕES (5 COLUNAS) */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-3 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 min-h-0">
                  
                  {/* Bloco de Totais */}
                  <div className="space-y-3 shrink-0">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Resumo Financeiro
                    </span>

                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Total Consumido:</span>
                        <span className="font-bold text-zinc-200">R$ {totalSel.toFixed(2)}</span>
                      </div>

                      {pagoSel > 0 && (
                        <div className="flex items-center justify-between text-xs text-emerald-400">
                          <span>Total Já Pago:</span>
                          <span className="font-bold">+ R$ {pagoSel.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                        <span className="text-xs font-black text-orange-400 uppercase">
                          Saldo a Pagar:
                        </span>
                        <span className={`text-2xl font-black ${
                          saldoSel <= 0.001 ? 'text-emerald-400' : 'text-orange-400'
                        }`}>
                          R$ {saldoSel.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Histórico Compacto de Pagamentos Recebidos */}
                    {temPagamentos && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                          Pagamentos Realizados ({selectedConta.pagamentos?.length})
                        </span>
                        <div className="max-h-28 overflow-y-auto space-y-1 pr-1 divide-y divide-zinc-900 bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/60">
                          {selectedConta.pagamentos?.map((pag) => (
                            <div key={pag.id} className="pt-1 flex items-center justify-between text-[11px]">
                              <div className="truncate pr-1">
                                <span className="font-bold text-emerald-400">{pag.forma_pagamento}</span>
                                <span className="text-zinc-500 ml-1">({formatTimeLocal(pag.data_hora)})</span>
                              </div>
                              <span className="font-black text-emerald-400 shrink-0">
                                R$ {Number(pag.valor || 0).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BOTÕES DE AÇÃO PRINCIPAIS (EM DESTAQUE, SEM CORTES) */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800/80 shrink-0">
                    {isAberta && (
                      <button
                        type="button"
                        onClick={() => {
                          const c = selectedConta;
                          handleOpenPagamento(c, 'inteira');
                        }}
                        disabled={saldoSel <= 0 && totalSel <= 0}
                        className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                          saldoSel <= 0 && totalSel <= 0
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-800'
                            : 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-zinc-950 shadow-emerald-500/20'
                        }`}
                      >
                        <Banknote className="w-4 h-4" />
                        <span>Pagar Conta (Inteira ou Metade)</span>
                      </button>
                    )}

                    {isAberta && (
                      <button
                        type="button"
                        onClick={() => {
                          setContaParaEncerrar(selectedConta);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 active:scale-95"
                        title="Encerrar e apagar comanda por completo sem ir para o PDV"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Encerrar Conta</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedContaId(null)}
                      className="w-full py-2 px-3 rounded-xl bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold text-xs transition-colors"
                    >
                      Fechar Detalhes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* 7. MODAL: PAGAR CONTA (COMPACTO, CABE TUDO NA TELA) */}
      {/* ========================================================= */}
      {contaParaPagar && (() => {
        const totalConta = contaParaPagar.total || contaParaPagar.itens.reduce((acc, it) => acc + it.subtotal, 0);
        const jaPago = contaParaPagar.total_pago || (contaParaPagar.pagamentos || []).reduce((acc, p) => acc + p.valor, 0);
        const saldoDevedor = Math.max(0, totalConta - jaPago);
        const metadeValor = Number((saldoDevedor / 2).toFixed(2));
        const trocoCalculado = formaPagamentoSelecionada === 'Dinheiro' && valorRecebidoDinheiro > valorPagamentoInput
          ? valorRecebidoDinheiro - valorPagamentoInput
          : 0;
        const quitaraConta = valorPagamentoInput >= saldoDevedor - 0.001;
        const saldoAposEstePagamento = Math.max(0, saldoDevedor - valorPagamentoInput);

        return (
          <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-4 sm:p-5 space-y-3.5 shadow-2xl relative max-h-[94vh] flex flex-col justify-between overflow-y-auto">
              
              {/* CABEÇALHO */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-zinc-100 text-base leading-tight">
                      Receber Pagamento
                    </h3>
                    <p className="text-[11px] text-zinc-400 truncate max-w-[280px]">
                      #{contaParaPagar.numero_conta} • {contaParaPagar.cliente_nome}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setContaParaPagar(null);
                    setPagamentoFeedback(null);
                  }}
                  className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* FEEDBACK */}
              {pagamentoFeedback && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 ${
                  pagamentoFeedback.tipo === 'sucesso'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                }`}>
                  {pagamentoFeedback.tipo === 'sucesso' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{pagamentoFeedback.texto}</span>
                </div>
              )}

              {/* CARD DE SALDO COMPACTO */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] font-bold text-amber-500 uppercase block">
                    {jaPago > 0 ? "Falta Pagar (Saldo)" : "Total a Pagar"}
                  </span>
                  <div className="text-2xl font-black text-amber-400">
                    R$ {saldoDevedor.toFixed(2)}
                  </div>
                </div>
                {jaPago > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase block">Total Original</span>
                    <div className="text-xs font-bold text-zinc-300">
                      R$ {totalConta.toFixed(2)}
                    </div>
                    <div className="text-[11px] font-bold text-emerald-400 mt-0.5">
                      ✓ Já Pago: R$ {jaPago.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleConfirmarPagamento} className="space-y-3 shrink-0">
                
                {/* 1. ATALHOS RÁPIDOS: INTEIRA (100%), METADE (50%), POR ITENS OU OUTRO */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-zinc-400">
                    Opção de Pagamento:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelecionarTipoValor('inteira')}
                      className={`py-2 px-1.5 rounded-xl text-xs font-black flex flex-col items-center justify-center transition-all border ${
                        tipoValorPagamento === 'inteira'
                          ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                          : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                      }`}
                    >
                      <span>{jaPago > 0 ? "Quitar Tudo" : "Inteira (100%)"}</span>
                      <span className="text-[10px] opacity-90">R$ {saldoDevedor.toFixed(2)}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelecionarTipoValor('metade')}
                      className={`py-2 px-1.5 rounded-xl text-xs font-black flex flex-col items-center justify-center transition-all border ${
                        tipoValorPagamento === 'metade'
                          ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                          : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                      }`}
                    >
                      <span>Metade (50%)</span>
                      <span className="text-[10px] opacity-90">R$ {metadeValor.toFixed(2)}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelecionarTipoValor('itens')}
                      className={`py-2 px-1.5 rounded-xl text-xs font-black flex flex-col items-center justify-center transition-all border ${
                        tipoValorPagamento === 'itens'
                          ? 'bg-orange-500 text-zinc-950 border-orange-400 shadow-md shadow-orange-500/20'
                          : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Por Itens</span>
                      </span>
                      <span className="text-[10px] opacity-90">
                        {itensParaPagar.filter(i => i.selecionado).length} de {itensParaPagar.length} itens
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelecionarTipoValor('personalizado')}
                      className={`py-2 px-1.5 rounded-xl text-xs font-black flex flex-col items-center justify-center transition-all border ${
                        tipoValorPagamento === 'personalizado'
                          ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                          : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                      }`}
                    >
                      <span>Outro Valor</span>
                      <span className="text-[10px] opacity-90">Personalizar</span>
                    </button>
                  </div>
                </div>

                {/* 2. SELEÇÃO DE ITENS A SEREM PAGOS (QUANDO OPÇÃO "POR ITENS" ESTIVER SELECIONADA) */}
                {tipoValorPagamento === 'itens' ? (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80">
                      <div className="flex items-center gap-1.5">
                        <ListChecks className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-black text-zinc-200">Selecione os itens para pagar agora:</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleMarcarTodosItens(true)}
                          className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold border border-zinc-800"
                        >
                          Marcar Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarcarTodosItens(false)}
                          className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-medium border border-zinc-800"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    {/* Lista scrollável de itens da comanda */}
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {itensParaPagar.length === 0 ? (
                        <div className="text-center py-4 text-xs text-zinc-500 font-semibold">
                          Nenhum item pendente para pagamento.
                        </div>
                      ) : (
                        itensParaPagar.map((item) => (
                          <div
                            key={item.itemId}
                            onClick={() => handleToggleItemSelecionado(item.itemId)}
                            className={`p-2 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer border ${
                              item.selecionado
                                ? 'bg-orange-500/10 border-orange-500/40 text-zinc-100 shadow-sm'
                                : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                                item.selecionado
                                  ? 'bg-orange-500 border-orange-500 text-zinc-950 font-black'
                                  : 'bg-zinc-900 border-zinc-700 text-transparent'
                              }`}>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-xs block truncate leading-tight">
                                  {item.nome}
                                </span>
                                <span className="text-[10px] text-zinc-400 block mt-0.5">
                                  R$ {item.precoUnitario.toFixed(2)} un {item.codigo ? `• #${item.codigo}` : ''}
                                </span>
                              </div>
                            </div>

                            {/* Seletor de quantidade a pagar (se quantidadeTotal > 1) */}
                            <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {item.quantidadeTotal > 1 ? (
                                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleAlterarQtdItemPagar(item.itemId, -1)}
                                    disabled={!item.selecionado || item.quantidadePagar <= 1}
                                    className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-xs disabled:opacity-30"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-8 text-center text-xs font-black text-orange-400">
                                    {item.quantidadePagar}/{item.quantidadeTotal}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleAlterarQtdItemPagar(item.itemId, 1)}
                                    disabled={!item.selecionado || item.quantidadePagar >= item.quantidadeTotal}
                                    className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-xs disabled:opacity-30"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] font-bold text-zinc-400 px-2 py-0.5 bg-zinc-900 rounded-md">
                                  1 un
                                </span>
                              )}

                              <div className="text-right min-w-[65px]">
                                <span className={`text-xs font-black ${item.selecionado ? 'text-orange-400' : 'text-zinc-500'}`}>
                                  R$ {(item.quantidadePagar * item.precoUnitario).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Resumo dos itens marcados */}
                    <div className="p-2 bg-zinc-900/80 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs font-bold">
                      <span className="text-zinc-400">
                        Total de {itensParaPagar.filter(i => i.selecionado).length} produto(s) selecionado(s):
                      </span>
                      <span className="text-orange-400 font-black text-sm">
                        R$ {valorPagamentoInput.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* CAMPO DE VALOR A PAGAR COM FEEDBACK EM 1 LINHA (MODOS INTEIRA, METADE OU OUTRO VALOR) */
                  <div className="space-y-1">
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-black text-orange-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={saldoDevedor}
                        value={valorPagamentoInput || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setValorPagamentoInput(val);
                          if (formaPagamentoSelecionada === 'Dinheiro') {
                            setValorRecebidoDinheiro(val);
                          }
                          if (Math.abs(val - saldoDevedor) < 0.01) {
                            setTipoValorPagamento('inteira');
                          } else if (Math.abs(val - metadeValor) < 0.01) {
                            setTipoValorPagamento('metade');
                          } else {
                            setTipoValorPagamento('personalizado');
                          }
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm font-black text-zinc-100 focus:border-orange-500 outline-none"
                      />
                    </div>

                    <div className="text-[10px] px-1">
                      {quitaraConta ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>Quitará 100% da conta e encerrará a comanda.</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 font-medium">
                          Pagamento parcial. Restará <strong>R$ {saldoAposEstePagamento.toFixed(2)}</strong> na comanda.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* FORMAS DE PAGAMENTO EM GRADE COMPACTA (1 LINHA) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-zinc-400">
                    Forma de Pagamento:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { forma: 'Dinheiro' as const, label: 'Dinheiro' },
                      { forma: 'Pix' as const, label: 'Pix' },
                      { forma: 'Cartão de Débito' as const, label: 'Débito' },
                      { forma: 'Cartão de Crédito' as const, label: 'Crédito' }
                    ].map((item) => {
                      const isSelected = formaPagamentoSelecionada === item.forma;
                      return (
                        <button
                          key={item.forma}
                          type="button"
                          onClick={() => {
                            setFormaPagamentoSelecionada(item.forma);
                            if (item.forma === 'Dinheiro') {
                              setValorRecebidoDinheiro(valorPagamentoInput);
                            }
                          }}
                          className={`py-2 px-1 rounded-xl text-xs font-black text-center transition-all border ${
                            isSelected
                              ? 'bg-orange-500 text-zinc-950 border-orange-400 shadow-md shadow-orange-500/20'
                              : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SE DINHEIRO: RECEBIDO E TROCO LADO A LADO */}
                {formaPagamentoSelecionada === 'Dinheiro' && (
                  <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl grid grid-cols-2 gap-2 items-center">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 mb-0.5">
                        Valor Entregue (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={valorPagamentoInput}
                        value={valorRecebidoDinheiro || ''}
                        onChange={(e) => setValorRecebidoDinheiro(parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-black text-zinc-100 focus:border-orange-500 outline-none"
                      />
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-bold text-zinc-400 mb-0.5">Troco</span>
                      <div className="text-sm font-black text-emerald-400">
                        R$ {trocoCalculado.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {/* AVISO DO CAIXA COMPACTO */}
                <div className={`p-2 rounded-xl text-[11px] flex items-center gap-1.5 ${
                  isCaixaAberto
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-rose-500/15 text-rose-400'
                }`}>
                  {isCaixaAberto ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Lançamento automático no <strong>Caixa aberto</strong>.</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Caixa fechado! Abra o caixa para receber.</span>
                    </>
                  )}
                </div>

                {/* BOTÕES DE CONFIRMAÇÃO / CANCELAR */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setContaParaPagar(null);
                      setPagamentoFeedback(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      !isCaixaAberto || 
                      valorPagamentoInput <= 0 || 
                      isSubmittingPagamento || 
                      (tipoValorPagamento === 'itens' && itensParaPagar.filter(i => i.selecionado).length === 0)
                    }
                    className={`flex-1 py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg ${
                      !isCaixaAberto || 
                      valorPagamentoInput <= 0 || 
                      isSubmittingPagamento || 
                      (tipoValorPagamento === 'itens' && itensParaPagar.filter(i => i.selecionado).length === 0)
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : tipoValorPagamento === 'itens'
                        ? 'bg-orange-500 hover:bg-orange-600 active:scale-95 text-zinc-950 shadow-orange-500/20'
                        : 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-zinc-950 shadow-emerald-500/20'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isSubmittingPagamento 
                        ? 'Processando...' 
                        : tipoValorPagamento === 'itens'
                        ? `Pagar Itens Selecionados (R$ ${valorPagamentoInput.toFixed(2)})`
                        : `Confirmar R$ ${valorPagamentoInput.toFixed(2)}`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* 8. POP-UP / MODAL: CONFIRMAR ENCERRAMENTO E EXCLUSÃO DA CONTA */}
      {/* ========================================================= */}
      {contaParaEncerrar && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-zinc-100 text-base sm:text-lg leading-tight">
                  Encerrar Comanda?
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Você quer mesmo encerrar e apagar esta conta?
                </p>
              </div>
            </div>

            <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Cliente:</span>
                <span className="font-black text-zinc-100">{contaParaEncerrar.cliente_nome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Comanda:</span>
                <span className="font-mono font-bold text-orange-400">#{contaParaEncerrar.numero_conta}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Total Consumido:</span>
                <span className="font-black text-emerald-400">
                  R$ {(contaParaEncerrar.total || contaParaEncerrar.itens.reduce((acc, it) => acc + it.subtotal, 0)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Itens Consumidos:</span>
                <span className="font-bold text-zinc-300">
                  {contaParaEncerrar.itens.reduce((acc, it) => acc + it.quantidade, 0)} itens
                </span>
              </div>
            </div>

            <p className="text-xs text-rose-400/90 font-medium bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
              ⚠️ Esta comanda será <strong>encerrada e apagada por completo</strong> do sistema sem ser enviada para o PDV.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
              <button
                type="button"
                disabled={isEncerrando}
                onClick={() => setContaParaEncerrar(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isEncerrando}
                onClick={async () => {
                  setIsEncerrando(true);
                  try {
                    if (onEncerrarApagarConta) {
                      await onEncerrarApagarConta(contaParaEncerrar.id);
                    }
                    if (selectedContaId === contaParaEncerrar.id) {
                      setSelectedContaId(null);
                    }
                    setContaParaEncerrar(null);
                  } finally {
                    setIsEncerrando(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-rose-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isEncerrando ? 'Encerrando...' : 'Sim, Encerrar e Apagar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
