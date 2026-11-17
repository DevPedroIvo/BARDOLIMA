import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Produto010, StatusEstoque } from '../types/010types';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  QrCode, 
  Camera, 
  Layers,
  Sparkles,
  Barcode,
  Box,
  ToggleLeft,
  ToggleRight,
  LayoutGrid,
  List,
  RotateCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Produtos010Props {
  produtos: Produto010[];
  onAddProduto: (prod: Partial<Produto010>) => Promise<void> | void;
  onUpdateProduto: (id: string, prod: Partial<Produto010>) => Promise<void> | void;
  onDeleteProduto: (id: string) => void;
  onRecarregarProdutos?: () => Promise<void>;
}

export const Produtos010: React.FC<Produtos010Props> = ({
  produtos,
  onAddProduto,
  onUpdateProduto,
  onDeleteProduto,
  onRecarregarProdutos
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipoFiltro, setSelectedTipoFiltro] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>('cards');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRecarregando, setIsRecarregando] = useState<boolean>(false);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);

  // Estados de vinculação precisa entre Unidade e Caixa
  const [idUnidadeVinculada, setIdUnidadeVinculada] = useState<string | null>(null);
  const [idCaixaVinculada, setIdCaixaVinculada] = useState<string | null>(null);
  const [codigoBarrasCaixa, setCodigoBarrasCaixa] = useState<string>('');
  const [scannerTarget, setScannerTarget] = useState<'unidade' | 'caixa'>('unidade');

  // Configuração da Caixa
  const [qtdPorCaixa, setQtdPorCaixa] = useState<number>(12);
  const [precoCaixa, setPrecoCaixa] = useState<number>(0);

  // Helpers de extração de nome e código
  const extrairNomePuro = (nome: string): string => {
    return (nome || '')
      .replace(/\s*\((Unidade|Caixa[^\)]*|Fardo[^\)]*)\)/gi, '')
      .trim();
  };

  const extrairCodigoBase = (cod: string): string => {
    return (cod || '')
      .replace(/-CX$/i, '')
      .trim();
  };

  // Form State
  const [formData, setFormData] = useState<Partial<Produto010>>({
    nome: '',
    codigo: '',
    codigo_barras: '',
    categoria: 'Bebidas',
    tipo_embalagem: 'Unidade',
    unidades_por_caixa: 12,
    quantidade: 0,
    preco: 0,
    preco_custo: 0,
    estoque_minimo: 5,
    controlar_estoque: true,
    descricao: ''
  });

  const [isSalvando, setIsSalvando] = useState(false);

  // Scanner Câmera / QR Code State
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedNotification, setScannedNotification] = useState<string | null>(null);
  const [manualScanInput, setManualScanInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-foco automático no campo de código de barras ao abrir o modal
  useEffect(() => {
    if (showModal) {
      const timer = setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [showModal]);

  const getStatusEstoque = (p: Produto010): StatusEstoque => {
    if (p.controlar_estoque === false) return 'Normal';
    if (p.quantidade === 0) return 'Sem Estoque';
    if (p.quantidade <= p.estoque_minimo) return 'Estoque Baixo';
    return 'Normal';
  };

  const produtosFiltrados = (produtos || []).filter(p => {
    if (!p) return false;
    const nome = String(p.nome || '').toLowerCase();
    const codigo = String(p.codigo || '');
    const codigoBarras = String(p.codigo_barras || '');
    const categoria = String(p.categoria || '').toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = !term || nome.includes(term) || codigo.includes(term) || codigoBarras.includes(term) || categoria.includes(term);
    
    const tipoEmbalagem = p.tipo_embalagem || 'Unidade';
    const matchesTipo = selectedTipoFiltro === 'todos' || 
                        (selectedTipoFiltro === 'Unidade' && tipoEmbalagem === 'Unidade') ||
                        (selectedTipoFiltro === 'Caixa' && tipoEmbalagem !== 'Unidade');
    
    return matchesSearch && matchesTipo;
  }).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', undefined, { numeric: true, sensitivity: 'base' }));

  const itensPorPagina = viewMode === 'cards' ? 24 : 30;
  const totalPaginas = Math.max(1, Math.ceil(produtosFiltrados.length / itensPorPagina));
  const produtosExibidos = useMemo(() => {
    const start = (paginaAtual - 1) * itensPorPagina;
    return produtosFiltrados.slice(start, start + itensPorPagina);
  }, [produtosFiltrados, paginaAtual, itensPorPagina]);

  // Reset de página ao alterar filtros ou busca
  useEffect(() => {
    setPaginaAtual(1);
  }, [searchTerm, selectedTipoFiltro, viewMode]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setIdUnidadeVinculada(null);
    setIdCaixaVinculada(null);
    setCodigoBarrasCaixa('');
    setQtdPorCaixa(12);
    setPrecoCaixa(0);
    setFormData({
      nome: '',
      codigo: '',
      codigo_barras: '',
      categoria: 'Bebidas',
      tipo_embalagem: 'Unidade',
      unidades_por_caixa: 12,
      quantidade: 0,
      preco: 0,
      preco_custo: 0,
      estoque_minimo: 5,
      controlar_estoque: true,
      descricao: ''
    });
    setScannedNotification(null);
    setShowModal(true);
  };

  const handleOpenEdit = (p: Produto010) => {
    setEditingId(p.id);

    const isCaixa = p.tipo_embalagem === 'Caixa' || p.tipo_embalagem === 'Fardo' || p.nome.toLowerCase().includes('caixa') || p.nome.toLowerCase().includes('fardo');

    const nomePuroP = extrairNomePuro(p.nome).toLowerCase();
    const codBaseP = extrairCodigoBase(p.codigo_barras || p.codigo || '');

    // Procura o par vinculado de forma abrangente
    const par = produtos.find(item => {
      if (item.id === p.id) return false;
      if (p.produto_pai_id && item.id === p.produto_pai_id) return true;
      if (item.produto_pai_id && item.produto_pai_id === p.id) return true;
      if (p.descricao && p.descricao.includes(`[PAI:${item.id}]`)) return true;
      if (item.descricao && item.descricao.includes(`[PAI:${p.id}]`)) return true;
      const codItem = extrairCodigoBase(item.codigo_barras || item.codigo || '');
      if (codBaseP && codItem && codBaseP === codItem) return true;
      if (nomePuroP.length > 2 && extrairNomePuro(item.nome).toLowerCase() === nomePuroP) return true;
      return false;
    });

    const prodUn = isCaixa ? par : p;
    const prodCx = isCaixa ? p : par;

    const idUn = prodUn ? prodUn.id : (isCaixa ? (par?.id || p.produto_pai_id || null) : p.id);
    const idCx = prodCx ? prodCx.id : (isCaixa ? p.id : (par?.id || null));

    setIdUnidadeVinculada(idUn);
    setIdCaixaVinculada(idCx);

    const uPorCx = prodCx?.unidades_por_caixa || prodUn?.unidades_por_caixa || p.unidades_por_caixa || 12;
    const finalUPorCx = uPorCx > 1 ? uPorCx : 12;
    setQtdPorCaixa(finalUPorCx);

    const vPrecoUn = prodUn ? (prodUn.preco || 0) : 0;
    const vPrecoCx = prodCx ? (prodCx.preco || 0) : (p.preco_fardo || 0);

    setPrecoCaixa(vPrecoCx);
    setCodigoBarrasCaixa(prodCx?.codigo_barras || prodCx?.codigo || (codBaseP ? `${codBaseP}-CX` : ''));

    let qtdUnidades = 0;
    if (prodUn && prodUn.quantidade !== undefined) {
      qtdUnidades = prodUn.quantidade;
    } else if (prodCx && prodCx.quantidade !== undefined) {
      qtdUnidades = prodCx.quantidade * finalUPorCx;
    } else {
      qtdUnidades = p.quantidade || 0;
    }

    const nomeExibicao = extrairNomePuro(prodUn?.nome || p.nome);

    setFormData({
      ...(prodUn || p),
      nome: nomeExibicao,
      preco: vPrecoUn,
      unidades_por_caixa: finalUPorCx,
      codigo_barras: codBaseP,
      codigo: codBaseP,
      categoria: prodUn?.categoria || p.categoria || 'Bebidas',
      tipo_embalagem: 'Unidade',
      quantidade: qtdUnidades,
      preco_custo: (prodUn?.preco_custo !== undefined && prodUn.preco_custo > 0)
        ? prodUn.preco_custo
        : ((prodCx?.preco_custo !== undefined && prodCx.preco_custo > 0 && finalUPorCx > 0)
            ? Number((prodCx.preco_custo / finalUPorCx).toFixed(2))
            : (prodUn?.preco_custo || prodCx?.preco_custo || p.preco_custo || 0)),
      controlar_estoque: (prodUn || p).controlar_estoque !== undefined ? (prodUn || p).controlar_estoque : true,
      estoque_minimo: (prodUn || p).estoque_minimo || 5
    });

    setScannedNotification(null);
    setShowModal(true);
  };

  // Controles da Câmera
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      // Silencioso
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleOpenScanner = () => {
    handleOpenScannerFor('unidade');
  };

  const handleOpenScannerFor = (target: 'unidade' | 'caixa') => {
    setScannerTarget(target);
    setShowScannerModal(true);
    startCamera();
  };

  const handleCloseScanner = () => {
    stopCamera();
    setShowScannerModal(false);
  };

  // Processa o código lido do QR Code / Câmera
  const processScannedCode = (scannedText: string) => {
    const cleanText = scannedText.trim();
    if (!cleanText) return;

    if (scannerTarget === 'caixa') {
      setCodigoBarrasCaixa(cleanText);
      setScannedNotification(`Código de Barras da Caixa capturado: ${cleanText}`);
    } else {
      setFormData(prev => ({
        ...prev,
        codigo: cleanText,
        codigo_barras: cleanText
      }));
      setScannedNotification(`Código de Barras da Unidade capturado: ${cleanText}`);
    }

    handleCloseScanner();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || isSalvando) return;

    setIsSalvando(true);
    try {
      const baseNome = extrairNomePuro(formData.nome);
      const codUn = formData.codigo_barras || formData.codigo || String(Math.floor(1000000000000 + Math.random() * 9000000000000));
      const codCx = codigoBarrasCaixa.trim() || `${codUn}-CX`;

      const caixasQueDa = qtdPorCaixa > 0 ? Math.floor((formData.quantidade || 0) / qtdPorCaixa) : 0;
      const valCaixa = precoCaixa !== undefined && precoCaixa !== null ? precoCaixa : 0;

      if (editingId) {
        // MODO EDIÇÃO: NUNCA DUPLICA! Atualiza os registros existentes mantendo rigorosamente seus IDs
        const idUn = idUnidadeVinculada || editingId;
        const idCx = idCaixaVinculada;

        // 1. Atualiza a Unidade
        await onUpdateProduto(idUn, {
          ...formData,
          id: idUn,
          nome: `${baseNome} (Unidade)`,
          codigo: codUn,
          codigo_barras: codUn,
          tipo_embalagem: 'Unidade',
          unidades_por_caixa: qtdPorCaixa,
          quantidade: formData.quantidade || 0,
          preco: formData.preco || 0,
          preco_custo: formData.preco_custo || 0,
          preco_fardo: valCaixa,
        });

        // 2. Se a Caixa já existe: ATUALIZA O VALOR E DADOS DA CAIXA AO INVÉS DE CRIAR OUTRO!
        if (idCx && idCx !== idUn) {
          await onUpdateProduto(idCx, {
            ...formData,
            id: idCx,
            nome: `${baseNome} (Caixa c/ ${qtdPorCaixa})`,
            codigo: codCx,
            codigo_barras: codCx,
            tipo_embalagem: 'Caixa',
            unidades_por_caixa: qtdPorCaixa,
            produto_pai_id: idUn,
            preco: valCaixa,
            preco_custo: (formData.preco_custo || 0) * qtdPorCaixa,
            quantidade: caixasQueDa,
            descricao: `Caixa contendo ${qtdPorCaixa} unidades [PAI:${idUn}]`
          });
        } else {
          // Se a Caixa ainda não existia no banco:
          await onAddProduto({
            ...formData,
            id: `p-${Date.now()}-cx`,
            nome: `${baseNome} (Caixa c/ ${qtdPorCaixa})`,
            codigo: codCx,
            codigo_barras: codCx,
            tipo_embalagem: 'Caixa',
            unidades_por_caixa: qtdPorCaixa,
            produto_pai_id: idUn,
            preco: valCaixa,
            preco_custo: (formData.preco_custo || 0) * qtdPorCaixa,
            quantidade: caixasQueDa,
            estoque_minimo: Math.max(1, Math.floor((formData.estoque_minimo || 5) / qtdPorCaixa)),
            descricao: `Caixa contendo ${qtdPorCaixa} unidades [PAI:${idUn}]`
          });
        }
      } else {
        // MODO NOVO: Cria Unidade e Caixa
        const timestamp = Date.now();
        const unidadeId = `p-${timestamp}`;
        const caixaId = `p-${timestamp}-cx`;

        // 1. Cadastra Unidade
        await onAddProduto({
          ...formData,
          id: unidadeId,
          nome: `${baseNome} (Unidade)`,
          codigo: codUn,
          codigo_barras: codUn,
          tipo_embalagem: 'Unidade',
          unidades_por_caixa: qtdPorCaixa,
          quantidade: formData.quantidade || 0,
          preco: formData.preco || 0,
          preco_custo: formData.preco_custo || 0,
          preco_fardo: valCaixa,
        });

        // 2. Cadastra Caixa
        await onAddProduto({
          ...formData,
          id: caixaId,
          nome: `${baseNome} (Caixa c/ ${qtdPorCaixa})`,
          codigo: codCx,
          codigo_barras: codCx,
          tipo_embalagem: 'Caixa',
          unidades_por_caixa: qtdPorCaixa,
          produto_pai_id: unidadeId,
          preco: valCaixa,
          preco_custo: (formData.preco_custo || 0) * qtdPorCaixa,
          quantidade: caixasQueDa,
          estoque_minimo: Math.max(1, Math.floor((formData.estoque_minimo || 5) / qtdPorCaixa)),
          descricao: `Caixa contendo ${qtdPorCaixa} unidades [PAI:${unidadeId}]`
        });
      }

      setShowModal(false);
      if (onRecarregarProdutos) {
        await onRecarregarProdutos();
      }
    } finally {
      setIsSalvando(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-in fade-in duration-150">
      {/* Header & Botões */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-zinc-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" />
            <span>Cadastro e Gerenciamento de Produtos</span>
          </h1>
          <p className="text-xs text-zinc-400">Bipe o código de barras ou preencha manualmente para cadastrar itens no sistema</p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {onRecarregarProdutos && (
            <button
              onClick={async () => {
                setIsRecarregando(true);
                await onRecarregarProdutos();
                setIsRecarregando(false);
              }}
              disabled={isRecarregando}
              className="px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50"
              title="Recarregar produtos do banco de dados"
            >
              <RotateCw className={`w-4 h-4 text-zinc-400 ${isRecarregando ? 'animate-spin text-orange-500' : ''}`} />
              <span className="hidden sm:inline">Recarregar</span>
            </button>
          )}

          <button
            onClick={handleOpenScanner}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-zinc-900 border border-orange-500/40 hover:bg-orange-500/10 text-orange-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            title="Escanear Código de Barras com a câmera"
          >
            <Camera className="w-4 h-4 text-orange-500" />
            <span>Scan Câmera</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      </div>

      {/* Filtros, Busca & Alternador de Modo de Visão (Cards x Tabela) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center shadow-lg">
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome, código de barras ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5">
          {/* Filtro por Tipo de Embalagem */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['todos', 'Unidade', 'Caixa'].map((tipo) => (
              <button
                key={tipo}
                onClick={() => setSelectedTipoFiltro(tipo)}
                className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-colors shrink-0 ${
                  selectedTipoFiltro === tipo
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tipo === 'todos' ? 'Todos' : tipo === 'Unidade' ? '🍺 Unidades' : '📦 Caixas'}
              </button>
            ))}
          </div>

          {/* Alternador de Visão (Cards vs Tabela) */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'cards'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualização em Cards (Sem rolagem lateral)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>

            <button
              onClick={() => setViewMode('tabela')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'tabela'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabela</span>
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DE EXIBIÇÃO: CARDS OU TABELA */}
      {viewMode === 'cards' ? (
        /* GRID DE CARDS RESPONSIVO (SEM ARRASTAR PARA O LADO) */
        produtosFiltrados.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 text-xs shadow-lg">
            Nenhum produto encontrado com esses filtros.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {produtosExibidos.map((p) => {
              const status = getStatusEstoque(p);
              const isCaixa = p.tipo_embalagem === 'Caixa' || p.tipo_embalagem === 'Fardo';

              return (
                <div 
                  key={p.id} 
                  className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3.5 transition-all group relative"
                >
                  {/* Cabeçalho do Card */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-black uppercase">
                        {p.categoria || 'Bebidas'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        status === 'Normal' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        status === 'Estoque Baixo' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {status === 'Normal' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        <span>{status}</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="font-black text-zinc-100 text-base leading-snug group-hover:text-orange-400 transition-colors break-words whitespace-normal">
                        {p.nome}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {isCaixa ? (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-300 font-black bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 rounded-lg">
                            📦 Caixa c/ {p.unidades_por_caixa || 12} un
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-300 font-black bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg">
                            🏷️ Unidade
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Código de barras / Código */}
                    <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-400 font-bold pt-0.5">
                      <Barcode className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="break-all">{p.codigo_barras || p.codigo || 'Sem Código'}</span>
                    </div>
                  </div>

                  {/* Informações de Preço & Estoque */}
                  <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Preço Venda</span>
                      <div className="text-lg font-black text-orange-500">
                        R$ {p.preco.toFixed(2)}
                      </div>
                      {p.preco_custo !== undefined && p.preco_custo > 0 ? (
                        <div className="text-[10px] font-bold text-emerald-400 mt-0.5">
                          Custo: R$ {p.preco_custo.toFixed(2)}
                        </div>
                      ) : null}
                    </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block">Estoque</span>
                        <div className="text-sm font-bold text-zinc-200">
                          {p.controlar_estoque !== false ? (
                            <>
                              <span className="text-base font-black text-zinc-100">{p.quantidade}</span> un
                              {Boolean(p.unidades_por_caixa && p.unidades_por_caixa > 1) && (
                                <span className="text-[10px] text-orange-400 block font-bold">
                                  Dá {Math.floor(p.quantidade / p.unidades_por_caixa!)} cx
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-500 block font-normal">(Mín: {p.estoque_minimo})</span>
                            </>
                          ) : (
                            <span className="text-xs text-zinc-500 font-normal">Sem controle</span>
                          )}
                        </div>
                      </div>
                  </div>

                  {/* Rodapé do Card: Ações (Editar / Excluir) */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-100 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border border-zinc-700"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => onDeleteProduto(p.id)}
                      className="py-2 px-3 bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 active:scale-95 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border border-zinc-700"
                      title="Excluir produto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* TABELA DE PRODUTOS COMPACTA */
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4">Nome do Produto</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Preço Venda</th>
                  <th className="py-3.5 px-4">Preço Custo</th>
                  <th className="py-3.5 px-4">Estoque</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {produtosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-zinc-500 text-xs">
                      Nenhum produto encontrado com esses filtros.
                    </td>
                  </tr>
                ) : (
                  produtosExibidos.map((p) => {
                    const status = getStatusEstoque(p);
                    const isCaixa = p.tipo_embalagem === 'Caixa' || p.tipo_embalagem === 'Fardo';

                    return (
                      <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-zinc-200 font-bold">
                          <div className="flex items-center gap-1.5">
                            <Barcode className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span>{p.codigo_barras || p.codigo}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-black text-zinc-100 text-sm break-words whitespace-normal">{p.nome}</div>
                          {isCaixa ? (
                            <span className="inline-block mt-0.5 text-[10px] text-purple-300 font-bold bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/30">
                              📦 Caixa c/ {p.unidades_por_caixa || 12} un
                            </span>
                          ) : (
                            <span className="inline-block mt-0.5 text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              🏷️ Unidade
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-zinc-400 font-semibold">
                          {p.categoria || 'Bebidas'}
                        </td>

                        <td className="py-3.5 px-4 font-black text-orange-500 text-sm">
                          R$ {p.preco.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-emerald-400 text-xs">
                          {p.preco_custo !== undefined && p.preco_custo > 0 ? `R$ ${p.preco_custo.toFixed(2)}` : '-'}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-zinc-200">
                          {p.controlar_estoque !== false ? (
                            <>
                              <div>{p.quantidade} un</div>
                              {Boolean(p.unidades_por_caixa && p.unidades_por_caixa > 1) && (
                                <div className="text-[11px] text-orange-400 font-bold">
                                  Dá {Math.floor(p.quantidade / p.unidades_por_caixa!)} cx
                                </div>
                              )}
                              <span className="text-[10px] text-zinc-500 font-normal">(Mín: {p.estoque_minimo})</span>
                            </>
                          ) : (
                            <span className="text-zinc-500 font-normal">Sem controle</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                            status === 'Normal' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            status === 'Estoque Baixo' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {status === 'Normal' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            <span>{status}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                              title="Editar Produto"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteProduto(p.id)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* BARRA DE PAGINAÇÃO DE PRODUTOS */}
      {produtosFiltrados.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 shadow-lg">
          <div>
            Mostrando <strong className="text-zinc-200">{(paginaAtual - 1) * itensPorPagina + 1}</strong> a <strong className="text-zinc-200">{Math.min(paginaAtual * itensPorPagina, produtosFiltrados.length)}</strong> de <strong className="text-zinc-200">{produtosFiltrados.length}</strong> produtos
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
                disabled={paginaAtual <= 1}
                className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-950 flex items-center gap-1 font-bold transition-all shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <span className="px-3 py-1 text-zinc-300 font-bold bg-zinc-950 border border-zinc-800 rounded-xl">
                Página {paginaAtual} de {totalPaginas}
              </span>

              <button
                onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
                disabled={paginaAtual >= totalPaginas}
                className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-950 flex items-center gap-1 font-bold transition-all shadow-sm"
              >
                <span>Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE PRODUTO (Fiel às especificações do Usuário) */}
      {showModal && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                <span>{editingId ? 'Editar produto' : 'Novo produto'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Texto de Ajuda/Instrução */}
            <p className="text-xs text-zinc-400 leading-relaxed">
              Bipe o código de barras ou preencha manualmente. Clique no botão ao lado para abrir a câmera do celular e escanear o código.
            </p>

            {scannedNotification && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{scannedNotification}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Código de barras */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Código de barras</label>
                <div className="flex gap-2">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Ex: 7894900011517"
                    value={formData.codigo_barras || formData.codigo || ''}
                    onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value, codigo: e.target.value })}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 font-mono focus:border-orange-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleOpenScanner}
                    className="px-3.5 py-2.5 bg-zinc-800 hover:bg-orange-500 hover:text-zinc-950 text-orange-400 font-bold rounded-xl text-xs flex items-center gap-2 border border-zinc-700 transition-all shrink-0"
                    title="Abrir câmera do celular"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Câmera</span>
                  </button>
                </div>
              </div>

              {/* 2. Nome */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Coca-Cola 350ml"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 font-medium focus:border-orange-500 outline-none"
                />
              </div>

              {/* 3. Categoria */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Categoria</label>
                <input
                  type="text"
                  placeholder="Ex: Bebidas, Destilados, Cervejas..."
                  value={formData.categoria || ''}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 font-medium focus:border-orange-500 outline-none"
                />
              </div>

              {/* 4. Preço de custo & Preço de venda da unidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Preço de custo (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-zinc-500 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.preco_custo !== undefined && formData.preco_custo !== null && formData.preco_custo > 0 ? formData.preco_custo : ''}
                      onChange={(e) => setFormData({ ...formData, preco_custo: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-emerald-400 focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Preço de venda da unidade * (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-zinc-500 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={formData.preco || ''}
                      onChange={(e) => setFormData({ ...formData, preco: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs font-black text-orange-500 focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Indicador de Lucro e Margem da Unidade */}
              {Boolean(formData.preco_custo && formData.preco_custo > 0 && formData.preco && formData.preco > 0) && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 flex items-center justify-between animate-in fade-in">
                  <span>Lucro unitário: R$ {((formData.preco || 0) - (formData.preco_custo || 0)).toFixed(2)}</span>
                  <span className="bg-emerald-500/20 px-2 py-0.5 rounded-md text-[11px]">
                    Margem: {((((formData.preco || 0) - (formData.preco_custo || 0)) / (formData.preco_custo || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              )}

              {/* 5. Controlar estoque (Toggle Sim / Não) */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">Controlar estoque deste produto</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, controlar_estoque: !formData.controlar_estoque })}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      formData.controlar_estoque !== false
                        ? 'bg-orange-500 text-zinc-950 font-black'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {formData.controlar_estoque !== false ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    <span>{formData.controlar_estoque !== false ? 'Sim' : 'Não'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Desative para serviços ou itens sem controle de saldo físico.
                </p>
              </div>

              {/* 6. Estoque da unidade e Estoque mín. */}
              {formData.controlar_estoque !== false && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Estoque da unidade *
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.quantidade || 0}
                      onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-black focus:border-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">Estoque mín.</label>
                    <input
                      type="number"
                      placeholder="5"
                      value={formData.estoque_minimo !== undefined ? formData.estoque_minimo : 5}
                      onChange={(e) => setFormData({ ...formData, estoque_minimo: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-bold focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 7. Configuração da Caixa / Fardo (Sempre Ativa: Unidade e Caixa) */}
              <div className="p-4 bg-zinc-950 border border-orange-500/40 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-black text-orange-400 uppercase tracking-wider">
                      Produto Caixa / Fardo
                    </span>
                  </div>
                  <span className="text-[10px] bg-orange-500/15 text-orange-400 font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                    Sempre Ativo (2 Produtos)
                  </span>
                </div>

                {/* Código de barras da Caixa */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                    Código de barras da Caixa
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: 7894900011524 (ou deixe em branco p/ automático)"
                      value={codigoBarrasCaixa}
                      onChange={(e) => setCodigoBarrasCaixa(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:border-orange-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleOpenScannerFor('caixa')}
                      className="px-3 py-2 bg-zinc-800 hover:bg-orange-500 hover:text-zinc-950 text-orange-400 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-zinc-700 transition-all shrink-0"
                      title="Escanear código de barras da caixa"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Câmera</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      Quantas vêm na caixa? *
                    </label>
                    <input
                      type="number"
                      min="2"
                      placeholder="Ex: 8, 12, 24"
                      value={qtdPorCaixa}
                      onChange={(e) => {
                        const q = parseInt(e.target.value) || 1;
                        setQtdPorCaixa(q);
                        setFormData(prev => ({ ...prev, unidades_por_caixa: q }));
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-black focus:border-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      Preço da caixa * (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-zinc-500 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={precoCaixa || ''}
                        onChange={(e) => setPrecoCaixa(parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-orange-400 font-black focus:border-orange-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Cálculo da divisão: quantidade no estoque da unidade / quantidade por caixa */}
                {(() => {
                  const qtdUn = formData.quantidade || 0;
                  const divisor = qtdPorCaixa > 0 ? qtdPorCaixa : 1;
                  const caixasCalculadas = Math.floor(qtdUn / divisor);
                  const sobra = qtdUn % divisor;
                  return (
                    <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-orange-400">
                        <Layers className="w-4 h-4 shrink-0" />
                        <span>Divisão do Estoque Calculada:</span>
                      </div>
                      
                      <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200">
                        <span className="font-mono text-zinc-400">{qtdUn} un no estoque ÷ {divisor} un na caixa = </span>
                        <span className="font-black text-orange-400 text-sm">Dá {caixasCalculadas} caixa{caixasCalculadas === 1 ? '' : 's'}</span>
                        {sobra > 0 && (
                          <span className="text-[11px] text-zinc-400 block mt-0.5">
                            (e sobram {sobra} unidade{sobra === 1 ? '' : 's'} avulsa{sobra === 1 ? '' : 's'})
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-zinc-300 pt-1 space-y-1">
                        <div className="text-zinc-400 font-bold">
                          {editingId ? 'Ao salvar a alteração, atualiza os 2 produtos existentes (sem duplicar):' : 'O sistema criará 2 produtos:'}
                        </div>
                        <div className="flex items-center justify-between font-semibold">
                          <span>1. <strong>{formData.nome || 'Produto'} (Unidade)</strong></span>
                          <span className="text-emerald-400">R$ {Number(formData.preco || 0).toFixed(2)} <span className="text-zinc-500 font-normal">({qtdUn} un)</span></span>
                        </div>
                        <div className="flex items-center justify-between font-semibold">
                          <span>2. <strong>{formData.nome || 'Produto'} (Caixa c/ {divisor})</strong></span>
                          <span className="text-orange-400">R$ {Number(precoCaixa || 0).toFixed(2)} <span className="text-zinc-500 font-normal">({caixasCalculadas} cx)</span></span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Botões do Rodapé: Cancelar / Cadastrar */}
              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSalvando}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 min-w-[140px]"
                >
                  {isSalvando ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></span>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LEITOR DE CÂMERA */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-sm flex items-center gap-2">
                <Camera className="w-5 h-5 text-orange-500" />
                <span>{scannerTarget === 'caixa' ? 'Câmera: Código de Barras da CAIXA' : 'Câmera: Código de Barras da UNIDADE'}</span>
              </h3>
              <button onClick={handleCloseScanner} className="text-zinc-500 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Container da Vídeo Câmera */}
            <div className="relative bg-zinc-950 rounded-2xl overflow-hidden aspect-video border border-zinc-800 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Mira visual */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-44 h-44 border-2 border-orange-500/80 rounded-2xl relative flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-orange-500"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-orange-500"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-orange-500"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-orange-500"></div>
                  <div className="w-full h-0.5 bg-orange-500/60 animate-pulse"></div>
                </div>
              </div>

              {!isCameraActive && (
                <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center text-center p-4">
                  <Camera className="w-8 h-8 text-zinc-600 mb-2" />
                  <p className="text-xs text-zinc-400">Ativando câmera do celular/dispositivo...</p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 text-center">
              Aproxime o código de barras da câmera para preencher automaticamente.
            </p>

            {/* Leitor Manual / Simulação Rápida */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase">Digitar ou Colar Código Scanned</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: 7894900011517"
                  value={manualScanInput}
                  onChange={(e) => setManualScanInput(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:border-orange-500 outline-none"
                />
                <button
                  onClick={() => {
                    if (manualScanInput) processScannedCode(manualScanInput);
                  }}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl"
                >
                  OK
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => processScannedCode('7894900011517')}
                  className="flex-1 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] font-mono rounded-lg"
                >
                  Simular 7894900011517
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCloseScanner}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs"
              >
                Cancelar / Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
