import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Produto010, ItemCarrinho010, Venda010, PagamentoItem, ContaComanda010, Caixa010 } from '../types/010types';
import { getVendasDoCaixa } from '../lib/caixaUtils';
import { round2 } from '../utils/money';
import { getNowIsoWithTimezone, formatTimeLocal, formatDateTimeLocal, isSameDayLocal } from '../utils/dateUtils';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  DollarSign, 
  Printer, 
  CheckCircle2, 
  X, 
  Camera, 
  Barcode, 
  CreditCard,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowDown,
  Zap,
  Landmark,
  AlertCircle,
  History,
  LayoutGrid,
  List,
  Receipt
} from 'lucide-react';

interface Pdv010Props {
  produtos: Produto010[];
  vendas?: Venda010[];
  caixas?: Caixa010[];
  onFinalizarVenda: (venda: Partial<Venda010>, itens: ItemCarrinho010[]) => void;
  usuarioAtual: string;
  isCaixaAberto?: boolean;
  onNavigateCaixa?: () => void;
  carrinho?: ItemCarrinho010[];
  setCarrinho?: React.Dispatch<React.SetStateAction<ItemCarrinho010[]>>;
  comandaEmFinalizacao?: ContaComanda010 | null;
  onCancelarComandaFinalizacao?: () => void;
  termoBipado?: string;
  onLimparTermoBipado?: () => void;
}

export const Pdv010: React.FC<Pdv010Props> = ({
  produtos,
  vendas = [],
  caixas = [],
  onFinalizarVenda,
  usuarioAtual,
  isCaixaAberto = true,
  onNavigateCaixa,
  carrinho: externalCarrinho,
  setCarrinho: externalSetCarrinho,
  comandaEmFinalizacao,
  onCancelarComandaFinalizacao,
  termoBipado,
  onLimparTermoBipado
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localCarrinho, setLocalCarrinho] = useState<ItemCarrinho010[]>([]);
  const carrinho = externalCarrinho !== undefined ? externalCarrinho : localCarrinho;
  const setCarrinho = externalSetCarrinho || setLocalCarrinho;

  // Quando bipar via leitor físico global ou câmera, preenche o campo de busca para o operador selecionar
  useEffect(() => {
    if (termoBipado) {
      setSearchTerm(termoBipado);
      if (onLimparTermoBipado) {
        onLimparTermoBipado();
      }
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [termoBipado, onLimparTermoBipado]);

  // Vendas do turno atual (se houver caixa aberto) ou do dia corrente no PDV
  const vendasHoje = useMemo(() => {
    if (!vendas || vendas.length === 0) return [];

    const caixaAberto = caixas.find(c => c.status === 'Aberto');
    let lista: Venda010[] = [];
    if (caixaAberto) {
      lista = getVendasDoCaixa(vendas, caixaAberto, caixas);
    } else {
      lista = vendas.filter(v => isSameDayLocal(v.data_hora));
    }

    return lista
      .filter(v => v.status !== 'Cancelada')
      .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
  }, [vendas, caixas]);

  const vendasHojeTotal = vendasHoje.reduce((acc, v) => acc + (v.total || 0), 0);
  
  // Descontos & Taxa de Deslocamento
  const [abaAjusteCarrinho, setAbaAjusteCarrinho] = useState<'desconto' | 'deslocamento'>('deslocamento');
  const [tipoDesconto, setTipoDesconto] = useState<'valor' | 'porcentagem'>('valor');
  const [descontoInput, setDescontoInput] = useState<number>(0);
  const [taxaDeslocamentoInput, setTaxaDeslocamentoInput] = useState<number>(0);

  // Modal Leitor de Câmera
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Modal Pagamento
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [modoPagamento, setModoPagamento] = useState<'unico' | 'multiplo'>('unico');
  
  // Pagamento Único
  const [formaPagamentoUnico, setFormaPagamentoUnico] = useState<'Dinheiro' | 'Pix' | 'Cartão de Débito' | 'Cartão de Crédito'>('Pix');
  const [parcelasCredito, setParcelasCredito] = useState<number>(1);
  const [valorRecebidoDinheiro, setValorRecebidoDinheiro] = useState<number>(0);

  // Pagamento Múltiplo Direto e Otimizado (Inputs Imediatos por Forma)
  const [valPix, setValPix] = useState<number>(0);
  const [valDinheiro, setValDinheiro] = useState<number>(0);
  const [valDebito, setValDebito] = useState<number>(0);
  const [valCredito, setValCredito] = useState<number>(0);
  const [parcelasCreditoMultiplo, setParcelasCreditoMultiplo] = useState<number>(1);

  // Recibo Modal
  const [showReciboModal, setShowReciboModal] = useState(false);
  const [vendaConcluida, setVendaConcluida] = useState<Venda010 | null>(null);

  // Modo de exibição do catálogo de produtos (cards 5x3 ou lista)
  const [modoExibicao, setModoExibicao] = useState<'cards' | 'lista'>('cards');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Produtos filtrados (aparece somente após pesquisar ou bipar um código)
  const produtosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];

    return (produtos || []).filter(p => {
      if (!p) return false;
      const nome = String(p.nome || '').toLowerCase();
      const codigo = String(p.codigo || '').toLowerCase();
      const codigoBarras = String(p.codigo_barras || '').toLowerCase();

      return nome.includes(term) || codigo.includes(term) || codigoBarras.includes(term);
    });
  }, [produtos, searchTerm]);

  // Cálculos do Carrinho com arredondamento monetário estrito
  const subtotal = round2(carrinho.reduce((acc, item) => acc + item.subtotal, 0));
  
  const descontoValor = tipoDesconto === 'valor' 
    ? round2(Math.min(subtotal, descontoInput))
    : round2(Math.min(subtotal, (subtotal * descontoInput) / 100));

  const descontoPorcentagem = subtotal > 0 && tipoDesconto === 'valor'
    ? round2((descontoValor / subtotal) * 100)
    : descontoInput;

  const taxaDeslocamentoValor = round2(Math.max(0, taxaDeslocamentoInput || 0));

  const total = round2(Math.max(0, subtotal - descontoValor + taxaDeslocamentoValor));

  // Cálculos de Pagamento Múltiplo Otimizado
  const totalPagoMultiplo = round2(valPix + valDinheiro + valDebito + valCredito);
  const saldoRestanteMultiplo = round2(Math.max(0, total - totalPagoMultiplo));

  // Troco em dinheiro no pagamento único ou múltiplo
  const trocoDinheiroUnico = formaPagamentoUnico === 'Dinheiro' ? round2(Math.max(0, valorRecebidoDinheiro - total)) : 0;
  const trocoMultiplo = totalPagoMultiplo > total ? round2(totalPagoMultiplo - total) : 0;

  // Detecção de Dispositivo Mobile
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const smallScreen = window.innerWidth < 768;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return userAgentMobile || (smallScreen && isTouch);
  });

  useEffect(() => {
    const handleResize = () => {
      const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const smallScreen = window.innerWidth < 768;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(userAgentMobile || (smallScreen && isTouch));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Atalhos de teclado (Desativados em dispositivos móveis)
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (carrinho.length > 0) {
          setValorRecebidoDinheiro(total);
          setValPix(0);
          setValDinheiro(0);
          setValDebito(0);
          setValCredito(0);
          setShowPagamentoModal(true);
        }
      } else if (e.key === 'Escape') {
        setShowPagamentoModal(false);
        setShowReciboModal(false);
        setShowCameraModal(false);
        stopCamera();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carrinho, total, isMobile]);

  // Câmera Barcode Scanner
  const startCamera = async () => {
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch {
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const handleSimularScan = (codigoOuEan: string) => {
    setSearchTerm(codigoOuEan);
    setShowCameraModal(false);
    stopCamera();
    setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 50);
  };

  // Funções do Carrinho
  const adicionarAoCarrinho = (produto: Produto010) => {
    if (produto.quantidade <= 0) {
      alert(`O produto "${produto.nome}" está sem estoque no momento!`);
      return;
    }

    const index = carrinho.findIndex(i => i.produto_id === produto.id);

    if (index >= 0) {
      const novosItens = [...carrinho];
      const novaQtd = novosItens[index].quantidade + 1;
      novosItens[index].quantidade = novaQtd;
      novosItens[index].subtotal = novaQtd * novosItens[index].preco_unitario;
      setCarrinho(novosItens);
    } else {
      setCarrinho([
        ...carrinho,
        {
          produto_id: produto.id,
          nome: produto.nome,
          codigo: produto.codigo,
          quantidade: 1,
          preco_unitario: produto.preco,
          subtotal: produto.preco
        }
      ]);
    }
  };

  const alterarQuantidade = (index: number, delta: number) => {
    const novosItens = [...carrinho];
    const novaQtd = novosItens[index].quantidade + delta;
    if (novaQtd <= 0) {
      novosItens.splice(index, 1);
    } else {
      novosItens[index].quantidade = novaQtd;
      novosItens[index].subtotal = novaQtd * novosItens[index].preco_unitario;
    }
    setCarrinho(novosItens);
  };

  const removerDoCarrinho = (index: number) => {
    const novosItens = [...carrinho];
    novosItens.splice(index, 1);
    setCarrinho(novosItens);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && produtosFiltrados.length === 1) {
      adicionarAoCarrinho(produtosFiltrados[0]);
      setSearchTerm('');
    }
  };

  // Finalizar Pagamento
  const handleConfirmarPagamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (carrinho.length === 0) return;

    let pagamentosFinais: PagamentoItem[] = [];
    let textoFormaPagamento = '';

    if (modoPagamento === 'unico') {
      if (formaPagamentoUnico === 'Dinheiro' && valorRecebidoDinheiro < total) {
        alert('O valor recebido em dinheiro é inferior ao total da venda!');
        return;
      }

      textoFormaPagamento = formaPagamentoUnico === 'Cartão de Crédito' 
        ? `Cartão de Crédito (${parcelasCredito}x)` 
        : formaPagamentoUnico;

      pagamentosFinais = [
        {
          forma: formaPagamentoUnico,
          valor: total,
          parcelas: formaPagamentoUnico === 'Cartão de Crédito' ? parcelasCredito : undefined
        }
      ];
    } else {
      if (totalPagoMultiplo < total) {
        alert(`Ainda resta R$ ${saldoRestanteMultiplo.toFixed(2)} a pagar para concluir a venda!`);
        return;
      }

      if (valPix > 0) pagamentosFinais.push({ forma: 'Pix', valor: valPix });
      if (valDinheiro > 0) pagamentosFinais.push({ forma: 'Dinheiro', valor: valDinheiro });
      if (valDebito > 0) pagamentosFinais.push({ forma: 'Cartão de Débito', valor: valDebito });
      if (valCredito > 0) pagamentosFinais.push({ forma: 'Cartão de Crédito', valor: valCredito, parcelas: parcelasCreditoMultiplo });

      textoFormaPagamento = `Múltiplo (${pagamentosFinais.map(p => p.forma).join(' + ')})`;
    }

    const numeroVendaGerado = Math.floor(1000 + Math.random() * 9000);
    const produtosVendaFinal: ItemCarrinho010[] = taxaDeslocamentoValor > 0
      ? [
          ...carrinho,
          {
            produto_id: 'taxa-deslocamento',
            nome: 'Taxa de Deslocamento',
            codigo: 'TAXA',
            quantidade: 1,
            preco_unitario: taxaDeslocamentoValor,
            subtotal: taxaDeslocamentoValor
          }
        ]
      : carrinho;

    const novaVenda: Venda010 = {
      id: `v-${Date.now()}`,
      numero_venda: numeroVendaGerado,
      data_hora: getNowIsoWithTimezone(),
      usuario: usuarioAtual,
      cliente_nome: comandaEmFinalizacao?.cliente_nome || 'Cliente Balcão',
      comanda_id: comandaEmFinalizacao?.id,
      comanda_numero: comandaEmFinalizacao?.numero_conta,
      produtos: produtosVendaFinal,
      subtotal,
      desconto_valor: descontoValor,
      desconto_porcentagem: descontoPorcentagem,
      taxa_deslocamento: taxaDeslocamentoValor > 0 ? taxaDeslocamentoValor : undefined,
      total,
      forma_pagamento: textoFormaPagamento,
      pagamentos: pagamentosFinais,
      parcelas_credito: formaPagamentoUnico === 'Cartão de Crédito' ? parcelasCredito : undefined,
      valor_recebido: modoPagamento === 'unico' ? (formaPagamentoUnico === 'Dinheiro' ? valorRecebidoDinheiro : total) : totalPagoMultiplo,
      troco: modoPagamento === 'unico' ? (formaPagamentoUnico === 'Dinheiro' ? trocoDinheiroUnico : 0) : trocoMultiplo,
      status: 'Concluída'
    };

    onFinalizarVenda(novaVenda, carrinho);

    setVendaConcluida(novaVenda);
    setShowPagamentoModal(false);
    setShowReciboModal(true);

    // Reset Carrinho & Inputs
    setCarrinho([]);
    setDescontoInput(0);
    setTaxaDeslocamentoInput(0);
    setSearchTerm('');
    setValPix(0);
    setValDinheiro(0);
    setValDebito(0);
    setValCredito(0);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-4 pb-12 select-none animate-in fade-in duration-150">
      {/* TELA PRINCIPAL OPERACIONAL DO PDV (1ª DOBRA DA TELA) */}
      <div className="min-h-[calc(100vh-130px)] flex flex-col justify-between space-y-3 pb-2">
        <div className="space-y-3 flex-1 flex flex-col">
          {/* Alerta de Caixa Fechado */}
          {!isCaixaAberto && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-lg animate-in fade-in shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-zinc-100 text-xs sm:text-sm">Nenhum Caixa Aberto no Momento!</h4>
              <p className="text-[11px] text-orange-400/90 font-medium">
                É necessário realizar a abertura do caixa para registrar vendas e pagamentos no PDV.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateCaixa}
            className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-zinc-950 font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all shrink-0 w-full sm:w-auto"
          >
            <Landmark className="w-4 h-4" />
            <span>Abrir Caixa Agora</span>
          </button>
        </div>
      )}

      {/* Banner de Encerramento de Comanda Vinculada */}
      {comandaEmFinalizacao && (
        <div className="bg-orange-500/15 border border-orange-500/50 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-lg shadow-orange-500/10 animate-in fade-in shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-500 text-zinc-950 flex items-center justify-center font-black shrink-0 shadow-md">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] font-black bg-zinc-950 px-2 py-0.5 rounded-md text-orange-400 border border-zinc-800">
                  Comanda #{comandaEmFinalizacao.numero_conta}
                </span>
                <span className="text-[11px] font-black text-orange-400 uppercase tracking-wider">
                  Encerramento da Conta em Andamento
                </span>
              </div>
              <p className="text-xs font-bold text-zinc-100 truncate mt-0.5">
                Cliente: <span className="text-orange-300 font-black">{comandaEmFinalizacao.cliente_nome}</span> • Total da Comanda: <span className="text-emerald-400 font-mono font-black">R$ {Number(comandaEmFinalizacao.total || 0).toFixed(2)}</span>
              </p>
            </div>
          </div>

          {onCancelarComandaFinalizacao && (
            <button
              onClick={onCancelarComandaFinalizacao}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold transition-all shrink-0 active:scale-95 w-full sm:w-auto"
            >
              Cancelar Encerramento (Manter Conta Aberta)
            </button>
          )}
        </div>
      )}

      {/* Barra de Atalhos F2 / F4 / ESC (Apenas no Desktop) */}
      {!isMobile && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-1.5 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-4 whitespace-nowrap overflow-x-auto">
            <span className="flex items-center gap-1.5 font-bold"><kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-orange-400">F2</kbd> Buscar Produto</span>
            <span className="flex items-center gap-1.5 font-bold"><kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-orange-400">F4</kbd> Ir para Pagamento</span>
            <span className="flex items-center gap-1.5 font-bold"><kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-300">ESC</kbd> Fechar Modal</span>
          </div>
          <span className="text-orange-500 font-bold hidden md:inline text-[11px]">Operação Otimizada PDV</span>
        </div>
      )}

      {/* Grid Principal: Esquerda Produtos | Direita Carrinho */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0">
        {/* Lado Esquerdo: Busca, Câmera & Catálogo (7 colunas) */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col space-y-3 min-h-0">
          {/* Barra de Busca, Alternador de Exibição (Grade 5x3 / Lista) e Câmera */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Campo de Busca por Nome / Código / Código de Barras */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={isMobile ? "Buscar produto ou bipar código..." : "Digite o nome, código (ex: 1001) ou bipar Código de Barras... [F2]"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500 font-medium"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-200">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Botões de Alternância: Cards (Grade 5x3) vs Lista */}
              <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModoExibicao('cards')}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    modoExibicao === 'cards' 
                      ? 'bg-orange-500 text-zinc-950 shadow-sm' 
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Visualização em Cards Espaçados"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px]">Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModoExibicao('lista')}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    modoExibicao === 'lista' 
                      ? 'bg-orange-500 text-zinc-950 shadow-sm' 
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Visualização em Lista Compacta"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px]">Lista</span>
                </button>
              </div>

              {/* BOTÃO ABRIR CÂMERA DE CÓDIGO DE BARRAS */}
              <button
                onClick={startCamera}
                title="Abrir Câmera para Ler Código de Barras"
                className="px-3.5 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-zinc-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 shrink-0 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Ler Câmera</span>
              </button>
            </div>
          </div>

          {/* Catálogo de Produtos com Rolar para Baixo (Scroll) */}
          <div className="flex-1 overflow-y-auto max-h-[550px] pr-1">
            {!searchTerm.trim() ? (
              <div className="text-center py-16 px-4 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500 shadow-md">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-zinc-200 text-sm">Pesquise ou bipe um produto</h4>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1">
                    Digite o nome, código ou use o leitor de código de barras [F2] para listar os itens no PDV.
                  </p>
                </div>
              </div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-xs font-semibold bg-zinc-950/60 rounded-2xl border border-zinc-800/80">
                Nenhum produto encontrado com a busca "{searchTerm}".
              </div>
            ) : modoExibicao === 'cards' ? (
              /* MODO 1: CARDS ESPAÇADOS E LEGÍVEIS COM LEITURA FÁCIL DO NOME */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3.5">
                {produtosFiltrados.map((prod) => {
                  const semEstoque = prod.quantidade === 0;

                  return (
                    <button
                      key={prod.id}
                      disabled={semEstoque}
                      onClick={() => adicionarAoCarrinho(prod)}
                      className={`bg-zinc-950 border rounded-2xl p-3.5 flex flex-col justify-between text-left transition-all active:scale-[0.98] min-h-[125px] ${
                        semEstoque 
                          ? 'border-zinc-800/50 opacity-50 cursor-not-allowed' 
                          : 'border-zinc-800 hover:border-orange-500/60 hover:bg-zinc-900 shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs sm:text-sm font-black text-zinc-100 break-words whitespace-normal leading-snug" title={prod.nome}>
                            {prod.nome}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-400 shrink-0">
                            #{prod.codigo}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {prod.tipo_embalagem === 'Caixa' || prod.tipo_embalagem === 'Fardo' || prod.nome.toLowerCase().includes('(caixa') ? (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              📦 Caixa {prod.unidades_por_caixa ? `c/ ${prod.unidades_por_caixa}` : ''}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              🏷️ Unidade
                            </span>
                          )}
                          <span className="text-[11px] text-zinc-400 font-medium break-words">{prod.categoria || 'Geral'}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-end justify-between">
                        <span className={`text-xs font-bold block ${semEstoque ? 'text-rose-400' : 'text-zinc-400'}`}>
                          {semEstoque ? 'Sem Estoque' : `${prod.quantidade} un`}
                        </span>
                        <span className="text-base font-black text-orange-500">
                          R$ {prod.preco.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* MODO 2: LISTA COMPACTA EM LINHAS */
              <div className="space-y-1.5">
                {produtosFiltrados.map((prod) => {
                  const semEstoque = prod.quantidade === 0;

                  return (
                    <div
                      key={prod.id}
                      className={`bg-zinc-950 border rounded-xl p-2.5 flex items-center justify-between text-xs transition-all ${
                        semEstoque ? 'border-zinc-800/50 opacity-50' : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 font-mono text-[10px] font-bold shrink-0">
                          #{prod.codigo}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-zinc-100 block break-words whitespace-normal">{prod.nome}</span>
                          <span className="text-[10px] text-zinc-400">{prod.categoria} {prod.codigo_barras ? `• EAN: ${prod.codigo_barras}` : ''}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 pl-3">
                        <span className={`text-[11px] font-bold ${semEstoque ? 'text-rose-400' : 'text-zinc-400'}`}>
                          {semEstoque ? 'Sem Estoque' : `${prod.quantidade} un`}
                        </span>

                        <span className="font-black text-orange-500 text-sm">
                          R$ {prod.preco.toFixed(2)}
                        </span>

                        <button
                          disabled={semEstoque}
                          onClick={() => adicionarAoCarrinho(prod)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                            semEstoque
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              : 'bg-orange-500 hover:bg-orange-600 text-zinc-950 active:scale-95 shadow-sm'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Carrinho & Totais (5 colunas) */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between space-y-2 min-h-0">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h3 className="font-black text-zinc-100 text-sm sm:text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              <span>Carrinho da Venda</span>
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 bg-zinc-950 rounded-lg text-orange-400 border border-zinc-800">
              {carrinho.length} itens
            </span>
          </div>

          {/* Lista de Itens do Carrinho */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[70px] max-h-[190px]">
            {carrinho.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs font-semibold">
                Clique nos produtos ao lado para adicionar ao carrinho.
              </div>
            ) : (
              carrinho.map((item, idx) => (
                <div key={idx} className="bg-zinc-950 p-2 sm:p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between text-xs space-x-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-zinc-200 block break-words whitespace-normal leading-snug">{item.nome}</span>
                    <span className="text-[10px] text-zinc-400">R$ {item.preco_unitario.toFixed(2)} un</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => alterarQuantidade(idx, -1)}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-black text-zinc-100 w-5 sm:w-6 text-center text-xs">{item.quantidade}</span>
                    <button
                      onClick={() => alterarQuantidade(idx, 1)}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    <span className="font-black text-orange-500 w-14 sm:w-16 text-right text-xs">
                      R$ {item.subtotal.toFixed(2)}
                    </span>

                    <button
                      onClick={() => removerDoCarrinho(idx)}
                      className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Remover produto"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Abas de Ajuste: Taxa de Deslocamento e Desconto */}
          <div className="space-y-2 pt-2 border-t border-zinc-800 text-xs">
            <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setAbaAjusteCarrinho('deslocamento')}
                className={`py-1.5 px-2 rounded-lg font-black text-[11px] flex items-center justify-center gap-1 transition-all ${
                  abaAjusteCarrinho === 'deslocamento'
                    ? 'bg-orange-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>🛵 Taxa Deslocamento</span>
                {taxaDeslocamentoValor > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-950 text-emerald-400 text-[9px] font-black">
                    +R${taxaDeslocamentoValor.toFixed(0)}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setAbaAjusteCarrinho('desconto')}
                className={`py-1.5 px-2 rounded-lg font-black text-[11px] flex items-center justify-center gap-1 transition-all ${
                  abaAjusteCarrinho === 'desconto'
                    ? 'bg-orange-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>🏷️ Desconto</span>
                {descontoValor > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-950 text-orange-400 text-[9px] font-black">
                    -R${descontoValor.toFixed(0)}
                  </span>
                )}
              </button>
            </div>

            {abaAjusteCarrinho === 'deslocamento' ? (
              <div className="bg-zinc-950 px-2.5 py-2 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-zinc-300 text-xs">🛵 Taxa de Deslocamento (R$):</span>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-orange-400 font-bold rounded-lg shrink-0 text-xs">
                      R$
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={taxaDeslocamentoInput || ''}
                      onChange={(e) => setTaxaDeslocamentoInput(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-20 sm:w-24 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 text-xs text-zinc-100 font-black text-right focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[3, 5, 7, 10, 15].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTaxaDeslocamentoInput(val)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                        taxaDeslocamentoInput === val
                          ? 'bg-orange-500 text-zinc-950 border-orange-500'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-orange-500/50'
                      }`}
                    >
                      +R$ {val}
                    </button>
                  ))}
                  {taxaDeslocamentoInput > 0 && (
                    <button
                      type="button"
                      onClick={() => setTaxaDeslocamentoInput(0)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 ml-auto"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-zinc-950 px-2.5 py-2 rounded-xl border border-zinc-800">
                <span className="font-bold text-zinc-400 text-xs">🏷️ Desconto na Venda:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTipoDesconto(tipoDesconto === 'valor' ? 'porcentagem' : 'valor')}
                    className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-orange-400 font-bold rounded-lg shrink-0 text-xs"
                  >
                    {tipoDesconto === 'valor' ? 'R$' : '%'}
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={descontoInput || ''}
                    onChange={(e) => setDescontoInput(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-20 sm:w-24 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 text-xs text-zinc-200 text-right focus:border-orange-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Quadro de Resumo de Totais */}
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 space-y-1 font-semibold">
              <div className="flex justify-between text-zinc-400 text-xs">
                <span>Subtotal Produtos:</span>
                <span className="text-zinc-200">R$ {subtotal.toFixed(2)}</span>
              </div>
              {taxaDeslocamentoValor > 0 && (
                <div className="flex justify-between text-emerald-400 text-xs font-bold">
                  <span>🛵 Taxa de Deslocamento:</span>
                  <span>+ R$ {taxaDeslocamentoValor.toFixed(2)}</span>
                </div>
              )}
              {descontoValor > 0 && (
                <div className="flex justify-between text-orange-400 text-xs">
                  <span>Desconto aplicado:</span>
                  <span>- R$ {descontoValor.toFixed(2)} ({descontoPorcentagem.toFixed(1)}%)</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-black text-zinc-100 pt-1 border-t border-zinc-800">
                <span>TOTAL:</span>
                <span className="text-lg sm:text-xl text-orange-500 font-mono">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <button
              disabled={carrinho.length === 0}
              onClick={() => {
                setValorRecebidoDinheiro(total);
                setValPix(0);
                setValDinheiro(0);
                setValDebito(0);
                setValCredito(0);
                setShowPagamentoModal(true);
              }}
              className={`w-full py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition-all ${
                carrinho.length > 0
                  ? 'bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-zinc-950 shadow-orange-500/20'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{isMobile ? `FINALIZAR PAGAMENTO — R$ ${total.toFixed(2)}` : `FINALIZAR PAGAMENTO [F4] — R$ ${total.toFixed(2)}`}</span>
            </button>
          </div>
        </div>
      </div>
      </div>

        {/* Indicador discreto para rolar até o histórico de vendas */}
        <div className="flex items-center justify-center gap-2 pt-2 text-zinc-500 text-xs font-semibold select-none opacity-75 hover:opacity-100 transition-opacity">
          <History className="w-3.5 h-3.5 text-orange-400" />
          <span>Role a tela para baixo para ver o histórico de vendas de hoje</span>
          <ArrowDown className="w-3.5 h-3.5 text-orange-400 animate-bounce" />
        </div>
      </div>

      {/* HISTÓRICO DE VENDAS DE HOJE NO PDV (Aparece somente após rolar a tela para baixo) */}
      <div className="mt-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
              <History className="w-5 h-5 text-orange-500" />
              <span>Histórico de Vendas de Hoje (PDV)</span>
            </h3>
            <p className="text-xs text-zinc-400">Role a tela para acompanhar as vendas registradas hoje no caixa</p>
          </div>

          <div className="px-3.5 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <span>{vendasHoje.length} venda(s) hoje</span>
            <span>•</span>
            <span className="font-black text-zinc-100">Total: R$ {vendasHojeTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
              <tr>
                <th className="py-3.5 px-4">Hora / Nº Venda</th>
                <th className="py-3.5 px-4">Produtos Vendidos</th>
                <th className="py-3.5 px-4">Forma de Pagamento</th>
                <th className="py-3.5 px-4">Total (R$)</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {vendasHoje.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-500 text-xs">
                    Nenhuma venda registrada no PDV hoje até o momento.
                  </td>
                </tr>
              ) : (
                vendasHoje.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-black text-zinc-100 block text-sm">Venda #{v.numero_venda}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {formatTimeLocal(v.data_hora)}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {(() => {
                        const prodsList = Array.isArray(v.produtos) 
                          ? v.produtos 
                          : (typeof v.produtos === 'string' ? (() => { try { return JSON.parse(v.produtos); } catch { return []; } })() : []);
                        
                        return (
                          <>
                            <div className="text-zinc-200 font-semibold max-w-sm line-clamp-2" title={prodsList.map(p => `${p.quantidade}x ${p.nome}`).join(', ')}>
                              {prodsList.length > 0
                                ? prodsList.map(p => `${p.quantidade}x ${p.nome}`).join(', ')
                                : 'Venda registrada'}
                            </div>
                            <span className="text-[10px] text-zinc-500">{prodsList.length} item(s) discriminado(s)</span>
                          </>
                        );
                      })()}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-950 border border-zinc-800 text-orange-400">
                        {v.forma_pagamento}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-black text-orange-500 text-sm">
                      R$ {v.total.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setVendaConcluida(v);
                          setShowReciboModal(true);
                        }}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-xl text-xs flex items-center gap-1.5 ml-auto border border-zinc-700 transition-colors"
                        title="Ver / Reimprimir Recibo"
                      >
                        <Printer className="w-3.5 h-3.5 text-orange-500" />
                        <span>Ver Recibo</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL LEITOR DE CÂMERA BARCODE */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-orange-500" />
                <span>Leitor de Código de Barras</span>
              </h3>
              <button 
                onClick={() => {
                  setShowCameraModal(false);
                  stopCamera();
                }}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Stream ou Simulador */}
            <div className="relative bg-zinc-950 rounded-2xl overflow-hidden aspect-video border border-zinc-800 flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" />
              {!isCameraActive && (
                <div className="text-center p-4 space-y-2">
                  <Barcode className="w-12 h-12 text-orange-500 mx-auto animate-pulse" />
                  <span className="text-xs text-zinc-400 font-bold block">Aponte o código de barras para a câmera</span>
                </div>
              )}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-orange-500/80 shadow-lg shadow-orange-500 animate-pulse" />
            </div>

            {/* Lista Rápida para Teste no Navegador */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase block">Ou escolha o código para bipar:</span>
              <div className="grid grid-cols-2 gap-2">
                {produtos.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSimularScan(p.codigo_barras || p.codigo)}
                    className="p-2 bg-zinc-950 border border-zinc-800 hover:border-orange-500 rounded-xl text-left text-xs font-bold text-zinc-200 transition-all truncate"
                  >
                    ⚡ Bipar {p.nome.slice(0, 15)}...
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGAMENTO (ÚNICO OU MÚLTIPLO DIRETO/ULTRARRÁPIDO SEM BOTÃO EXTRA) */}
      {showPagamentoModal && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-lg flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-orange-500" />
                <span>Finalizar Pagamento</span>
              </h3>
              <button onClick={() => setShowPagamentoModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternar Pagamento Único vs Múltiplas Formas */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setModoPagamento('unico')}
                className={`py-2 rounded-xl text-xs font-black transition-all ${
                  modoPagamento === 'unico' ? 'bg-orange-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                1 Forma de Pagamento
              </button>

              <button
                type="button"
                onClick={() => {
                  setModoPagamento('multiplo');
                  setValPix(0);
                  setValDinheiro(0);
                  setValDebito(0);
                  setValCredito(0);
                }}
                className={`py-2 rounded-xl text-xs font-black transition-all ${
                  modoPagamento === 'multiplo' ? 'bg-orange-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ⚡ Pagamento Misto (Múltiplo)
              </button>
            </div>

            <form onSubmit={handleConfirmarPagamento} className="space-y-4">
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-center space-y-1">
                <span className="text-xs font-bold text-zinc-400 uppercase">Valor Total a Pagar</span>
                <div className="text-3xl font-black text-orange-500">R$ {total.toFixed(2)}</div>
              </div>

              {/* MODO 1: PAGAMENTO ÚNICO */}
              {modoPagamento === 'unico' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Selecione a Forma</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Pix', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito'] as const).map((forma) => (
                        <button
                          key={forma}
                          type="button"
                          onClick={() => setFormaPagamentoUnico(forma)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                            formaPagamentoUnico === forma
                              ? 'bg-orange-500 text-zinc-950 border-orange-500 shadow-md'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          {forma}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SELEÇÃO DE PARCELAS DO CARTÃO DE CRÉDITO */}
                  {formaPagamentoUnico === 'Cartão de Crédito' && (
                    <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2">
                      <label className="block text-xs font-bold text-orange-400 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4" />
                        <span>Escolha a Quantidade de Parcelas</span>
                      </label>
                      <select
                        value={parcelasCredito}
                        onChange={(e) => setParcelasCredito(parseInt(e.target.value) || 1)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-100 focus:border-orange-500 outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                          <option key={n} value={n}>
                            {n === 1 ? '1x à vista' : `${n}x`} de R$ {(total / n).toFixed(2)} (Sem Juros)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* DINHEIRO / TROCO */}
                  {formaPagamentoUnico === 'Dinheiro' && (
                    <div className="space-y-3 p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1">Valor Recebido (R$)</label>
                        <input
                          type="number"
                          step="0.5"
                          required
                          value={valorRecebidoDinheiro || ''}
                          onChange={(e) => setValorRecebidoDinheiro(parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-base font-black text-emerald-400 focus:border-emerald-500 outline-none"
                        />
                      </div>

                      <div className="flex justify-between items-center text-sm font-black pt-1">
                        <span className="text-zinc-400">TROCO:</span>
                        <span className="text-lg text-emerald-400">R$ {trocoDinheiroUnico.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODO 2: PAGAMENTO MÚLTIPLO DIRETO E ULTRARRÁPIDO (INPUTS DIRETOS SEM BOTÃO INCLUIR) */}
              {modoPagamento === 'multiplo' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-orange-400 block flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span>Informe o valor para cada forma de pagamento usada:</span>
                  </span>

                  <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-3 text-xs font-bold">
                    {/* Linha 1: Pix */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-300 w-32">Pix (R$):</span>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="0.00"
                        value={valPix || ''}
                        onChange={(e) => setValPix(parseFloat(e.target.value) || 0)}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-right text-emerald-400 font-black focus:border-orange-500 outline-none"
                      />
                    </div>

                    {/* Linha 2: Dinheiro */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-300 w-32">Dinheiro (R$):</span>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="0.00"
                        value={valDinheiro || ''}
                        onChange={(e) => setValDinheiro(parseFloat(e.target.value) || 0)}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-right text-emerald-400 font-black focus:border-orange-500 outline-none"
                      />
                    </div>

                    {/* Linha 3: Cartão de Débito */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-300 w-32">Cartão Débito (R$):</span>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="0.00"
                        value={valDebito || ''}
                        onChange={(e) => setValDebito(parseFloat(e.target.value) || 0)}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-right text-emerald-400 font-black focus:border-orange-500 outline-none"
                      />
                    </div>

                    {/* Linha 4: Cartão de Crédito com Parcelas */}
                    <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-300 w-32">Cartão Crédito (R$):</span>
                        <input
                          type="number"
                          step="0.5"
                          placeholder="0.00"
                          value={valCredito || ''}
                          onChange={(e) => setValCredito(parseFloat(e.target.value) || 0)}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-right text-emerald-400 font-black focus:border-orange-500 outline-none"
                        />
                      </div>

                      {valCredito > 0 && (
                        <div className="flex items-center justify-between gap-2 pl-32">
                          <span className="text-[10px] text-orange-400 font-bold">Parcelas:</span>
                          <select
                            value={parcelasCreditoMultiplo}
                            onChange={(e) => setParcelasCreditoMultiplo(parseInt(e.target.value) || 1)}
                            className="bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs px-2 py-1 rounded-lg outline-none font-bold"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                              <option key={n} value={n}>{n}x de R$ {(valCredito / n).toFixed(2)}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumo Dinâmico do Pagamento Múltiplo */}
                  <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-1 text-xs font-black">
                    <div className="flex justify-between text-zinc-400">
                      <span>Total Pago:</span>
                      <span className="text-zinc-100">R$ {totalPagoMultiplo.toFixed(2)}</span>
                    </div>

                    {saldoRestanteMultiplo > 0 ? (
                      <div className="flex justify-between text-orange-400 font-bold">
                        <span>Falta Pagar:</span>
                        <span>R$ {saldoRestanteMultiplo.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Status Pagamento:</span>
                        <span>{trocoMultiplo > 0 ? `Troco: R$ ${trocoMultiplo.toFixed(2)}` : 'Total Quitado OK!'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPagamentoModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs"
                >
                  Cancelar (ESC)
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black rounded-xl text-xs shadow-lg shadow-orange-500/20"
                >
                  CONFIRMAR E GERAR RECIBO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE RECIBO DETALHADO (Item por item, Valores, Desconto, Botões: Imprimir, Nova Venda, FECHAR) */}
      {showReciboModal && vendaConcluida && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-1">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-black text-zinc-100 text-lg">Venda Realizada com Sucesso!</h3>
              <p className="text-xs text-orange-500 font-bold">Comprovante de Venda #{vendaConcluida.numero_venda}</p>
            </div>

            {/* RECIBO DETALHADO DO ITEM A ITEM */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 text-xs">
              <div className="text-center border-b border-zinc-800 pb-2 space-y-1">
                <div className="bg-white/95 p-2 rounded-xl inline-block mx-auto border border-blue-400/30">
                  <img src="/logo.png" alt="Bar do Lima" className="w-36 h-auto mx-auto object-contain" />
                </div>
                <span className="text-[10px] text-zinc-400 block pt-1">{new Date(vendaConcluida.data_hora).toLocaleString('pt-BR')} • Op: {vendaConcluida.usuario}</span>
              </div>

              {/* Tabela de Produtos Vendidos */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block border-b border-zinc-800 pb-1">Produtos Vendidos</span>
                {vendaConcluida.produtos.filter(p => p.produto_id !== 'taxa-deslocamento').map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center text-zinc-300 text-[11px]">
                    <div className="break-words whitespace-normal pr-2">
                      <span className="font-bold text-zinc-100">{p.quantidade}x</span> {p.nome}
                    </div>
                    <span className="font-mono font-bold text-zinc-200 shrink-0">R$ {p.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Resumo dos Valores, Taxa de Deslocamento e Desconto */}
              <div className="pt-2 border-t border-zinc-800 space-y-1 font-semibold">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal:</span>
                  <span>R$ {vendaConcluida.subtotal.toFixed(2)}</span>
                </div>

                {(() => {
                  const itemTaxa = (vendaConcluida.produtos || []).find(p => p.produto_id === 'taxa-deslocamento');
                  const valorTaxa = vendaConcluida.taxa_deslocamento || itemTaxa?.subtotal || 0;
                  return valorTaxa > 0 ? (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>🛵 Taxa de Deslocamento:</span>
                      <span>+ R$ {valorTaxa.toFixed(2)}</span>
                    </div>
                  ) : null;
                })()}

                {vendaConcluida.desconto_valor > 0 && (
                  <div className="flex justify-between text-orange-400">
                    <span>Desconto ({vendaConcluida.desconto_porcentagem.toFixed(1)}%):</span>
                    <span>- R$ {vendaConcluida.desconto_valor.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm font-black text-zinc-100 pt-1 border-t border-zinc-800">
                  <span>VALOR TOTAL:</span>
                  <span className="text-orange-500 text-base">R$ {vendaConcluida.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Detalhamento das Formas de Pagamento */}
              <div className="pt-2 border-t border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Forma(s) de Pagamento</span>
                {vendaConcluida.pagamentos && vendaConcluida.pagamentos.length > 0 ? (
                  vendaConcluida.pagamentos.map((pg, idx) => (
                    <div key={idx} className="flex justify-between text-zinc-300 text-[11px]">
                      <span>{pg.forma} {pg.parcelas ? `(${pg.parcelas}x)` : ''}</span>
                      <span className="font-bold text-emerald-400">R$ {pg.valor.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between text-zinc-300 text-[11px]">
                    <span>{vendaConcluida.forma_pagamento}</span>
                    <span className="font-bold text-emerald-400">R$ {vendaConcluida.total.toFixed(2)}</span>
                  </div>
                )}

                {vendaConcluida.troco !== undefined && vendaConcluida.troco > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold text-xs pt-1">
                    <span>Troco:</span>
                    <span>R$ {vendaConcluida.troco.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* BOTÕES SOLICITADOS: Imprimir Recibo, Nova Venda, FECHAR */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => window.print()}
                className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-zinc-700"
              >
                <Printer className="w-3.5 h-3.5 text-orange-500" />
                <span>Imprimir</span>
              </button>

              <button
                onClick={() => setShowReciboModal(false)}
                className="py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black rounded-xl text-xs shadow-md shadow-orange-500/20"
              >
                Nova Venda
              </button>

              <button
                onClick={() => setShowReciboModal(false)}
                className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs border border-zinc-700"
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
