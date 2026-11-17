import React, { useState, useRef, useEffect } from 'react';
import { Produto010, MovimentacaoEstoque010 } from '../types/010types';
import { 
  Boxes, 
  Search, 
  Camera, 
  AlertCircle, 
  CheckCircle2, 
  PlusCircle, 
  MinusCircle, 
  Barcode, 
  X, 
  RefreshCw,
  Package,
  FileUp
} from 'lucide-react';

interface Estoque010Props {
  produtos: Produto010[];
  movimentacoes: MovimentacaoEstoque010[];
  onRegistrarMovimentacao: (mov: Partial<MovimentacaoEstoque010>) => void;
  usuarioAtual: string;
  onOpenImportarNFe?: () => void;
  onAddProduto?: (prod: Partial<Produto010>) => void;
  onUpdateProduto?: (id: string, prod: Partial<Produto010>) => void;
}

export const Estoque010: React.FC<Estoque010Props> = ({
  produtos,
  movimentacoes,
  onRegistrarMovimentacao,
  usuarioAtual,
  onOpenImportarNFe,
  onAddProduto,
  onUpdateProduto
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'baixo' | 'sem_estoque'>('todos');
  
  // Modal de Movimentação (Entrada/Saída)
  const [showModal, setShowModal] = useState(false);
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'Entrada' | 'Saída' | 'Ajuste'>('Entrada');
  const [selectedProdutoId, setSelectedProdutoId] = useState<string>(produtos[0]?.id || '');
  const [modalSearchProduto, setModalSearchProduto] = useState<string>('');
  const [quantidadeInput, setQuantidadeInput] = useState<number>(1);
  const [observacaoInput, setObservacaoInput] = useState<string>('');

  // Scanner Câmera / Código de Barras State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [manualScanInput, setManualScanInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cálculos dos Indicadores
  const totalProdutos = produtos.length;
  const totalUnidadesEstoque = produtos.reduce((acc, p) => acc + (p.quantidade || 0), 0);
  const produtosBaixo = (produtos || []).filter(p => p && p.controlar_estoque !== false && p.quantidade > 0 && p.quantidade <= p.estoque_minimo);
  const produtosSemEstoque = (produtos || []).filter(p => p && p.controlar_estoque !== false && p.quantidade === 0);

  // Filtragem dos Produtos para a Lista
  const produtosFiltrados = (produtos || []).filter(p => {
    if (!p) return false;
    const nome = String(p.nome || '').toLowerCase();
    const codigo = String(p.codigo || '');
    const codigoBarras = String(p.codigo_barras || '');
    const term = searchTerm.toLowerCase();

    const matchesSearch = !term || nome.includes(term) || codigo.includes(term) || codigoBarras.includes(term);

    if (!matchesSearch) return false;

    if (filtroStatus === 'baixo') {
      return p.controlar_estoque !== false && p.quantidade > 0 && p.quantidade <= p.estoque_minimo;
    }
    if (filtroStatus === 'sem_estoque') {
      return p.controlar_estoque !== false && p.quantidade === 0;
    }

    return true;
  });

  // Controles da Câmera
  const startCamera = async () => {
    setShowCameraModal(true);
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
    setShowCameraModal(false);
  };

  const processScannedCode = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    setSearchTerm(cleanCode);
    stopCamera();
  };

  const handleOpenMovimentacaoQuick = (prodId: string, tipo: 'Entrada' | 'Saída') => {
    setSelectedProdutoId(prodId);
    setTipoMovimentacao(tipo);
    setModalSearchProduto('');
    setQuantidadeInput(1);
    setObservacaoInput('');
    setShowModal(true);
  };

  const handleSubmitMovimentacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdutoId || quantidadeInput <= 0) return;

    const prod = produtos.find(p => p.id === selectedProdutoId);
    if (!prod) return;

    onRegistrarMovimentacao({
      produto_id: prod.id,
      produto_nome: prod.nome,
      quantidade: quantidadeInput,
      tipo: tipoMovimentacao,
      usuario: usuarioAtual,
      observacao: observacaoInput || `Movimentação manual de ${tipoMovimentacao}`
    });

    setShowModal(false);
    setModalSearchProduto('');
    setQuantidadeInput(1);
    setObservacaoInput('');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-in fade-in duration-150">
      {/* Header da Aba Estoque */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-zinc-100 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-orange-500" />
            <span>Controle de Estoque</span>
          </h1>
          <p className="text-xs text-zinc-400">Gerenciamento de reposição, contagem e balanço de estoque de produtos</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {onOpenImportarNFe && (
            <button
              onClick={onOpenImportarNFe}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-orange-400 font-bold rounded-xl text-xs border border-zinc-700 flex items-center gap-2 transition-all flex-1 sm:flex-initial justify-center shadow-md"
              title="Ler arquivo XML de Nota Fiscal (NF-e) para dar entrada automática em estoque"
            >
              <FileUp className="w-4 h-4 text-orange-400" />
              <span>Importar NF-e (XML)</span>
            </button>
          )}

          <button
            onClick={() => {
              setTipoMovimentacao('Entrada');
              setModalSearchProduto('');
              setShowModal(true);
            }}
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-zinc-950 font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all flex-1 sm:flex-initial justify-center"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Movimentação</span>
          </button>
        </div>
      </div>

      {/* 1. CARDS DE INDICADORES (Total de Produtos, Estoque Baixo, Sem Estoque) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card Total de Produtos */}
        <div 
          onClick={() => setFiltroStatus('todos')}
          className={`bg-zinc-900 border rounded-2xl p-4 space-y-1.5 cursor-pointer transition-all ${
            filtroStatus === 'todos' ? 'border-orange-500/60 ring-1 ring-orange-500/30' : 'border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex justify-between items-center text-zinc-400">
            <span className="text-[11px] font-bold uppercase">Total de Produtos</span>
            <Package className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-zinc-100">{totalProdutos} itens</div>
          <p className="text-[11px] text-zinc-500">{totalUnidadesEstoque} unidades físicas cadastradas</p>
        </div>

        {/* Card Aviso de Estoque Baixo */}
        <div 
          onClick={() => setFiltroStatus('baixo')}
          className={`bg-zinc-900 border rounded-2xl p-4 space-y-1.5 cursor-pointer transition-all ${
            filtroStatus === 'baixo' ? 'border-orange-500 shadow-md shadow-orange-500/10' : 'border-zinc-800 hover:border-orange-500/40'
          }`}
        >
          <div className="flex justify-between items-center text-orange-400">
            <span className="text-[11px] font-bold uppercase">Aviso de Estoque Baixo</span>
            <AlertCircle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-orange-400">{produtosBaixo.length} itens</div>
          <p className="text-[11px] text-orange-400/80 font-semibold">Necessitam reposição urgente (menor que o mín)</p>
        </div>

        {/* Card Aviso de Produtos Sem Estoque */}
        <div 
          onClick={() => setFiltroStatus('sem_estoque')}
          className={`bg-zinc-900 border rounded-2xl p-4 space-y-1.5 cursor-pointer transition-all ${
            filtroStatus === 'sem_estoque' ? 'border-rose-500 shadow-md shadow-rose-500/10' : 'border-zinc-800 hover:border-rose-500/40'
          }`}
        >
          <div className="flex justify-between items-center text-rose-400">
            <span className="text-[11px] font-bold uppercase">Produtos Sem Estoque</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{produtosSemEstoque.length} itens</div>
          <p className="text-[11px] text-rose-400/80 font-semibold">Estoque zerado no PDV</p>
        </div>
      </div>

      {/* 2 & 3. BARRA DE PESQUISA COM BOTÃO CÂMERA + BOTÕES DE FILTRO */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        {/* Barra de Pesquisa por Código de Barras / Nome + Botão Câmera ao Lado */}
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Pesquisar por código de barras ou nome do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500 font-medium"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Botão para Abrir Câmera do Celular / Leitor de Código de Barras */}
          <button
            onClick={startCamera}
            className="px-3.5 py-2.5 bg-zinc-800 hover:bg-orange-500 hover:text-zinc-950 text-orange-400 font-bold rounded-xl text-xs flex items-center gap-2 border border-zinc-700 transition-all shrink-0 shadow-md"
            title="Abrir câmera para ler código de barras"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Câmera Barcode</span>
          </button>
        </div>

        {/* Botões para Filtrar: Todos, Estoque Baixo, Sem Estoque */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFiltroStatus('todos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filtroStatus === 'todos'
                ? 'bg-orange-500 text-zinc-950 shadow-md shadow-orange-500/20'
                : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos ({totalProdutos})
          </button>

          <button
            onClick={() => setFiltroStatus('baixo')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filtroStatus === 'baixo'
                ? 'bg-orange-500 text-zinc-950 shadow-md shadow-orange-500/20'
                : 'bg-zinc-950 border border-zinc-800 text-orange-400 hover:bg-orange-500/10'
            }`}
          >
            Estoque Baixo ({produtosBaixo.length})
          </button>

          <button
            onClick={() => setFiltroStatus('sem_estoque')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filtroStatus === 'sem_estoque'
                ? 'bg-rose-500 text-zinc-100 shadow-md shadow-rose-500/20'
                : 'bg-zinc-950 border border-zinc-800 text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            Sem Estoque ({produtosSemEstoque.length})
          </button>
        </div>
      </div>

      {/* 4. LISTA / TABELA DE PRODUTOS EM ESTOQUE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
              <tr>
                <th className="py-3.5 px-4">Código de Barras</th>
                <th className="py-3.5 px-4">Nome do Produto</th>
                <th className="py-3.5 px-4">Preço (R$)</th>
                <th className="py-3.5 px-4">Estoque Atual</th>
                <th className="py-3.5 px-4">Estoque Mín.</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Movimentação Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {produtosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 text-xs">
                    Nenhum produto encontrado na lista com o filtro selecionado.
                  </td>
                </tr>
              ) : (
                produtosFiltrados.map((p) => {
                  const semControle = p.controlar_estoque === false;
                  const isZero = p.quantidade === 0;
                  const isBaixo = p.quantidade > 0 && p.quantidade <= p.estoque_minimo;
                  const isCaixa = p.tipo_embalagem === 'Caixa' || p.tipo_embalagem === 'Fardo';

                  return (
                    <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                      {/* Código de Barras */}
                      <td className="py-3.5 px-4 font-mono text-zinc-200 font-bold">
                        <div className="flex items-center gap-1.5">
                          <Barcode className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span>{p.codigo_barras || p.codigo}</span>
                        </div>
                      </td>

                      {/* Nome do Produto */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-zinc-100 text-sm">{p.nome}</div>
                        {p.categoria && <span className="text-[10px] text-zinc-500">{p.categoria}</span>}
                      </td>

                      {/* Preço de Venda */}
                      <td className="py-3.5 px-4 font-black text-orange-500 text-sm">
                        R$ {p.preco.toFixed(2)}
                      </td>

                      {/* Estoque Atual e Conversão de Caixas Calculada */}
                      <td className="py-3.5 px-4 font-black text-sm">
                        {semControle ? (
                          <span className="text-zinc-500 font-normal">Sem controle</span>
                        ) : (
                          <div>
                            <span className={isZero ? 'text-rose-400' : isBaixo ? 'text-orange-400' : 'text-zinc-100'}>
                              {p.quantidade} un
                            </span>
                            {/* Cálculo automático de quantas caixas dá de fazer */}
                            {Boolean(p.unidades_por_caixa && p.unidades_por_caixa > 1) && (
                              <div className="text-[11px] font-bold text-orange-400 mt-0.5">
                                = {Math.floor(p.quantidade / p.unidades_por_caixa!)} cx
                                {p.quantidade % p.unidades_por_caixa! > 0 ? (
                                  <span className="text-zinc-400 font-normal text-[10px]"> + {p.quantidade % p.unidades_por_caixa!} un</span>
                                ) : null}
                                <span className="text-[9px] text-zinc-500 font-normal block">({p.unidades_por_caixa} un/cx)</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Estoque Mínimo */}
                      <td className="py-3.5 px-4 text-zinc-400 font-bold">
                        {semControle ? '-' : `${p.estoque_minimo} un`}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {semControle ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400">
                            Serviço / Avulso
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                            isZero ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            isBaixo ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isZero || isBaixo ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>{isZero ? 'Sem Estoque' : isBaixo ? 'Estoque Baixo' : 'Estoque OK'}</span>
                          </span>
                        )}
                      </td>

                      {/* Ações de Entrada / Saída Rápida */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenMovimentacaoQuick(p.id, 'Entrada')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] flex items-center gap-1 transition-colors"
                            title="Dar entrada rápida de produto no estoque"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>+ Entrada</span>
                          </button>

                          <button
                            onClick={() => handleOpenMovimentacaoQuick(p.id, 'Saída')}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-[11px] flex items-center gap-1 transition-colors"
                            title="Dar saída rápida de produto no estoque"
                          >
                            <MinusCircle className="w-3.5 h-3.5" />
                            <span>- Saída</span>
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

      {/* MODAL CÂMERA SCANNER DE CÓDIGO DE BARRAS */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-sm flex items-center gap-2">
                <Camera className="w-5 h-5 text-orange-500" />
                <span>Leitor de Código de Barras (Câmera)</span>
              </h3>
              <button onClick={stopCamera} className="text-zinc-500 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Container do Vídeo da Câmera */}
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
                  <p className="text-xs text-zinc-400">Conectando câmera do celular/dispositivo...</p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 text-center">
              Aproxime o código de barras da câmera para pesquisar diretamente na lista de estoque.
            </p>

            {/* Simulação ou Leitura Manual */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase">Digitar / Colar Código Scanned</label>
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
                  Filtrar
                </button>
              </div>

              <div className="pt-1 flex gap-2">
                {produtos.slice(0, 2).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => processScannedCode(p.codigo_barras || p.codigo)}
                    className="flex-1 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-orange-500/40 text-orange-400 text-[10px] font-mono rounded-lg truncate"
                  >
                    Simular {p.codigo_barras || p.codigo}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={stopCamera}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs"
              >
                Cancelar / Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR MOVIMENTAÇÃO DE ESTOQUE */}
      {showModal && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-base">Registrar {tipoMovimentacao} de Estoque</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMovimentacao} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Tipo de Movimentação</label>
                <select
                  value={tipoMovimentacao}
                  onChange={(e) => setTipoMovimentacao(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none font-bold"
                >
                  <option value="Entrada">Entrada (+) Recebimento de Carga</option>
                  <option value="Saída">Saída (-) Retirada Manual / Avaria</option>
                  <option value="Ajuste">Ajuste (=) Balanço de Contagem</option>
                </select>
              </div>

              {/* Seleção de Produto com Campo de Pesquisa Rápida */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Buscar & Selecionar Produto *</label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Digite o nome ou código para pesquisar..."
                    value={modalSearchProduto}
                    onChange={(e) => setModalSearchProduto(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-8 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none"
                  />
                  {modalSearchProduto && (
                    <button
                      type="button"
                      onClick={() => setModalSearchProduto('')}
                      className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={selectedProdutoId}
                  onChange={(e) => setSelectedProdutoId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none"
                >
                  {produtos
                    .filter(p => {
                      if (!modalSearchProduto) return true;
                      const term = modalSearchProduto.toLowerCase();
                      return (
                        (p.nome || '').toLowerCase().includes(term) ||
                        (p.codigo || '').toLowerCase().includes(term) ||
                        (p.codigo_barras || '').toLowerCase().includes(term)
                      );
                    })
                    .map(p => {
                      const cxCalc = p.unidades_por_caixa && p.unidades_por_caixa > 1
                        ? ` (Dá ${Math.floor(p.quantidade / p.unidades_por_caixa)} cx)`
                        : '';
                      return (
                        <option key={p.id} value={p.id}>
                          {p.nome} — Atual: {p.quantidade} un{cxCalc}
                        </option>
                      );
                    })}
                </select>

                {/* Resumo do produto atualmente selecionado */}
                {(() => {
                  const prodSel = produtos.find(p => p.id === selectedProdutoId);
                  if (!prodSel) return null;
                  const cxQtd = prodSel.unidades_por_caixa && prodSel.unidades_por_caixa > 1
                    ? Math.floor(prodSel.quantidade / prodSel.unidades_por_caixa)
                    : null;
                  return (
                    <div className="mt-2 p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-zinc-200 block">{prodSel.nome}</span>
                        <span className="text-[10px] text-zinc-400">
                          Estoque atual: <strong className="text-orange-400">{prodSel.quantidade} unidades</strong>
                        </span>
                      </div>
                      {cxQtd !== null && (
                        <span className="text-[11px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg">
                          Equivale a {cxQtd} caixa{cxQtd !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Quantidade *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantidadeInput}
                  onChange={(e) => setQuantidadeInput(parseInt(e.target.value) || 1)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-black text-orange-500 focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Observação / Motivo</label>
                <input
                  type="text"
                  placeholder="Ex: Nota fiscal 4059 ou acerto de balanço"
                  value={observacaoInput}
                  onChange={(e) => setObservacaoInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/20"
                >
                  Confirmar Movimentação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
