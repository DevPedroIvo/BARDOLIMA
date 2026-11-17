import React, { useState, useEffect, useRef } from 'react';
import { Zap, CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { 
  ModuleTab, 
  UserSession, 
  Produto010, 
  Venda010, 
  ItemCarrinho010, 
  MovimentacaoEstoque010, 
  ContaReceber010, 
  Caixa010, 
  MovimentacaoCaixaDetalhe,
  AuditLog010, 
  Notificacao010, 
  ConfigEmpresa,
  CompraEstoqueNFe,
  ContaComanda010,
  ItemContaComanda010,
  PagamentoContaComanda010,
  ItemPagoComanda
} from './types/010types';
import { round2 } from './utils/money';
import { getNowIsoWithTimezone, formatTimeLocal } from './utils/dateUtils';

import { 
  INITIAL_PRODUTOS_010, 
  INITIAL_VENDAS_010, 
  INITIAL_MOVIMENTACOES_010, 
  INITIAL_CONTAS_RECEBER_010, 
  INITIAL_CAIXAS_010, 
  INITIAL_AUDIT_LOGS_010, 
  INITIAL_NOTIFICACOES_010, 
  INITIAL_CONFIG_EMPRESA 
} from './services/010mockData';

import { Sidebar010 } from './components/Sidebar010';
import { Header010 } from './components/Header010';
import { LoginModal } from './components/LoginModal';
import { ImportadorNFeModal } from './components/ImportadorNFeModal';
import { CameraBarcodeModal } from './components/CameraBarcodeModal';

import { Dashboard010 } from './pages/Dashboard010';
import { Pdv010 } from './pages/Pdv010';
import { Contas010 } from './pages/Contas010';
import { Produtos010 } from './pages/Produtos010';
import { Estoque010 } from './pages/Estoque010';
import { Financeiro010 } from './pages/Financeiro010';
import { CaixaPage010 } from './pages/Caixa010';
import { Relatorios010 } from './pages/Relatorios010';
import { Fiscais010 } from './pages/Fiscais010';
import { Historico010 } from './pages/Historico010';
import { Notificacoes010 } from './pages/Notificacoes010';
import { Configuracoes010 } from './pages/Configuracoes010';
import { supabaseService } from './services/supabaseService';
import { supabase } from './lib/supabase';
import { idbCache } from './lib/indexedDbCache';

export function App() {
  // Session State com Persistência
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('010_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isAuthenticated) return parsed;
      }
    } catch(e) {}
    return null;
  });

  // Tab State
  const [activeTab, setActiveTab] = useState<ModuleTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Online / Sync State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSynced, setIsSynced] = useState<boolean>(true);

  // Refs para controlar seeding inicial no Supabase
  const hasSeededProdsRef = useRef(false);
  const hasSeededVendasRef = useRef(false);
  const hasSeededCaixasRef = useRef(false);
  const hasSeededMovsRef = useRef(false);
  const hasSeededContasRef = useRef(false);

  // Core Data State 100% Exclusivo Supabase (Sem dependência de localStorage)
  const [produtos, setProdutos] = useState<Produto010[]>([]);
  const [vendas, setVendas] = useState<Venda010[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque010[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber010[]>([]);
  const [caixas, setCaixas] = useState<Caixa010[]>([]);
  const [contasComandas, setContasComandas] = useState<ContaComanda010[]>([]);
  const [comandaEmFinalizacao, setComandaEmFinalizacao] = useState<ContaComanda010 | null>(null);
  const [comprasEstoque, setComprasEstoque] = useState<CompraEstoqueNFe[]>(() => {
    try {
      const saved = localStorage.getItem('010_compras_estoque');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('010_compras_estoque', JSON.stringify(comprasEstoque));
    } catch(e) {}
  }, [comprasEstoque]);

  // Modais globais: Importação de NF-e e Câmera de Leitura de Código de Barras
  const [showImportarNFeModal, setShowImportarNFeModal] = useState<boolean>(false);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState<boolean>(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog010[]>(INITIAL_AUDIT_LOGS_010);
  const [notificacoes, setNotificacoes] = useState<Notificacao010[]>(INITIAL_NOTIFICACOES_010);
  const [configEmpresa, setConfigEmpresa] = useState<ConfigEmpresa>(INITIAL_CONFIG_EMPRESA);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Estado global do Carrinho do PDV
  const [carrinho, setCarrinho] = useState<ItemCarrinho010[]>([]);
  // Termo bipado pelo leitor físico ou câmera para preencher a busca no PDV
  const [termoBipadoParaPdv, setTermoBipadoParaPdv] = useState<string>('');

  // Banner flutuante de notificação de bipagem global
  const [scanBanner, setScanBanner] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    mensagem: string;
    detalhes?: string;
  } | null>(null);

  // Auxiliar de áudio sintetizado para bipe de escaneamento
  const playBeep = (type: 'success' | 'error' | 'warning' = 'success') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {}
  };

  // Processamento da bipagem global: busca produto, insere no carrinho e vai para o PDV
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const produtosRef = useRef(produtos);
  produtosRef.current = produtos;

  const activeTabRef = useRef<ModuleTab>(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const processarBipagemGlobal = (codeTrimmed: string) => {
    // EXCEÇÃO PRIORITÁRIA: Se o usuário estiver na aba produtos ou estoque, NÃO redirecionar para o PDV!
    if (activeTabRef.current === 'produtos' || activeTabRef.current === 'estoque') {
      return;
    }

    const listProds = produtosRef.current;
    const prodEncontrado = listProds.find(p => 
      String(p.codigo_barras || '').toLowerCase() === codeTrimmed.toLowerCase() ||
      String(p.codigo || '').toLowerCase() === codeTrimmed.toLowerCase() ||
      String(p.id || '').toLowerCase() === codeTrimmed.toLowerCase()
    );

    // Envia o código bipado diretamente para o campo de busca do PDV sem poluir com banners
    setTermoBipadoParaPdv(codeTrimmed);
    setActiveTab('pdv');

    if (prodEncontrado) {
      if (prodEncontrado.quantidade <= 0) {
        playBeep('warning');
        return;
      }
      playBeep('success');
    } else {
      playBeep('warning');
    }
  };

  // Global Keydown Listener para Leitor de Código de Barras
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // EXCEÇÃO PRIORITÁRIA: Se o usuário estiver na aba 'produtos' ou 'estoque',
      // NUNCA interceptar a bipagem nem redirecionar para o PDV!
      // O leitor deve digitar diretamente no campo do cadastro / busca de produto.
      if (activeTabRef.current === 'produtos' || activeTabRef.current === 'estoque') {
        barcodeBufferRef.current = '';
        return;
      }

      // Se o usuário estiver digitando em qualquer campo de input, textarea ou select,
      // NUNCA interceptar para permitir digitação livre!
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || (e.target as HTMLElement)?.isContentEditable;
      if (isInput) {
        barcodeBufferRef.current = '';
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3 && timeDiff < 100) {
          e.preventDefault();
          const code = barcodeBufferRef.current.trim();
          barcodeBufferRef.current = '';
          if (code) {
            processarBipagemGlobal(code);
          }
        } else {
          barcodeBufferRef.current = '';
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (timeDiff > 120 && barcodeBufferRef.current.length > 0) {
          barcodeBufferRef.current = e.key;
        } else {
          barcodeBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Garantir sincronização de tema no elemento html desde a montagem
  useEffect(() => {
    try {
      const saved = localStorage.getItem('010_config_sistema');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tema === 'azul') {
          document.documentElement.classList.add('theme-blue');
          document.documentElement.classList.remove('theme-dark', 'theme-light');
          return;
        }
        if (parsed.tema === 'claro') {
          document.documentElement.classList.add('theme-light');
          document.documentElement.classList.remove('theme-dark', 'theme-blue');
          return;
        }
      }
    } catch(e) {}
    document.documentElement.classList.add('theme-dark');
    document.documentElement.classList.remove('theme-light', 'theme-blue');
  }, []);

  // Monitorar estado da sessão Supabase Auth (getSession e onAuthStateChange)
  useEffect(() => {
    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const user = session.user;
          const metadata = user.user_metadata || {};
          const emailLower = (user.email || '').toLowerCase();
          const isOwnerOrAdmin = 
            metadata.role === 'Administrador' || 
            metadata.role === 'Dono' || 
            emailLower.includes('dono') || 
            emailLower.includes('admin');

          const displayName = 
            metadata.nome || 
            metadata.username || 
            (emailLower.includes('dono') ? 'Dono' : emailLower.includes('caixa') ? 'Caixa' : user.email?.split('@')[0]) || 
            'Usuário';

          const validSession: UserSession = {
            username: displayName,
            email: user.email,
            userId: user.id,
            role: isOwnerOrAdmin ? 'Administrador' : 'Operador',
            isAuthenticated: true
          };
          setUserSession(validSession);
          try { localStorage.setItem('010_user_session', JSON.stringify(validSession)); } catch(e) {}
        }
      } catch {
        // Silencioso
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        const metadata = user.user_metadata || {};
        const emailLower = (user.email || '').toLowerCase();
        const isOwnerOrAdmin = 
          metadata.role === 'Administrador' || 
          metadata.role === 'Dono' || 
          emailLower.includes('dono') || 
          emailLower.includes('admin');

        const displayName = 
          metadata.nome || 
          metadata.username || 
          (emailLower.includes('dono') ? 'Dono' : emailLower.includes('caixa') ? 'Caixa' : user.email?.split('@')[0]) || 
          'Usuário';

        const validSession: UserSession = {
          username: displayName,
          email: user.email,
          userId: user.id,
          role: isOwnerOrAdmin ? 'Administrador' : 'Operador',
          isAuthenticated: true
        };
        setUserSession(validSession);
        try { localStorage.setItem('010_user_session', JSON.stringify(validSession)); } catch(e) {}
      } else if (_event === 'SIGNED_OUT') {
        setUserSession(null);
        try { localStorage.removeItem('010_user_session'); } catch(e) {}
        try { sessionStorage.removeItem('010_db_signatures'); } catch(e) {}
        try { idbCache.clearAll(); } catch(e) {}
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Listener para Conexão Online/Offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSynced(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsSynced(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getLocalDateString = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Ref para cooldown de mutações locais e controle de concorrência de rede
  const lastMutationTimeRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchTimeRef = useRef<number>(0);

  // Helper canônico: Encontra todos os produtos irmãos/vinculados (Unidade <-> Caixa)
  const encontrarProdutosVinculados = (produtoId: string, todosProdutos: Produto010[]): Produto010[] => {
    const produtoAlvo = todosProdutos.find(p => p.id === produtoId);
    if (!produtoAlvo) return [];

    const extrairNomeBase = (nome: string) => 
      nome.replace(/\s*\((Unidade|Caixa[^\)]*|Fardo[^\)]*)\)/gi, '').trim().toLowerCase();

    const nomeBaseAlvo = extrairNomeBase(produtoAlvo.nome);
    const baseCodigoAlvo = (produtoAlvo.codigo || '').replace(/-CX$/i, '').trim();

    const getPaiIdDaDescricao = (desc?: string) => {
      const m = desc?.match(/\[PAI:([^\]]+)\]/);
      return m ? m[1] : null;
    };
    const paiIdAlvo = produtoAlvo.produto_pai_id || getPaiIdDaDescricao(produtoAlvo.descricao);

    return todosProdutos.filter(p => {
      if (p.id === produtoAlvo.id) return true;
      if (paiIdAlvo && (p.id === paiIdAlvo || p.produto_pai_id === paiIdAlvo)) return true;
      const pPaiId = p.produto_pai_id || getPaiIdDaDescricao(p.descricao);
      if (pPaiId && (pPaiId === produtoAlvo.id || pPaiId === paiIdAlvo)) return true;

      const pBaseCodigo = (p.codigo || '').replace(/-CX$/i, '').trim();
      if (baseCodigoAlvo && pBaseCodigo && baseCodigoAlvo === pBaseCodigo) return true;

      if (nomeBaseAlvo && nomeBaseAlvo.length > 2 && extrairNomeBase(p.nome) === nomeBaseAlvo) return true;

      return false;
    });
  };

  // Calcula a distribuição correta de estoque para todos os produtos do grupo (Unidade e Caixa)
  const calcularEstoqueGrupo = (
    produtoRefId: string, 
    todosProdutos: Produto010[], 
    deltaOuTotalUnidades: number, 
    tipoOperacao: 'delta' | 'set_unidades'
  ): { [id: string]: number } => {
    const targetProd = todosProdutos.find(p => p.id === produtoRefId);
    const vinculados = targetProd ? encontrarProdutosVinculados(targetProd.id, todosProdutos) : [];
    const grupo = targetProd ? [targetProd, ...vinculados.filter(v => v.id !== targetProd.id)] : [];

    const isAlvoCaixa = targetProd && (targetProd.tipo_embalagem === 'Caixa' || targetProd.tipo_embalagem === 'Fardo' || targetProd.nome.toLowerCase().includes('caixa'));
    const prodUnidade = grupo.find(p => 
      p.tipo_embalagem === 'Unidade' || (!p.tipo_embalagem && !p.nome.toLowerCase().includes('caixa'))
    ) || targetProd;

    const uPorCxBase = (targetProd?.unidades_por_caixa && targetProd.unidades_por_caixa > 1)
      ? targetProd.unidades_por_caixa
      : (vinculados[0]?.unidades_por_caixa || 1);

    const qtdUnidadesAtual = prodUnidade?.quantidade !== undefined 
      ? prodUnidade.quantidade 
      : (isAlvoCaixa ? (targetProd?.quantidade || 0) * uPorCxBase : 0);

    let novoTotalUnidades = 0;
    if (tipoOperacao === 'set_unidades') {
      novoTotalUnidades = Math.max(0, deltaOuTotalUnidades);
    } else {
      novoTotalUnidades = Math.max(0, qtdUnidadesAtual + deltaOuTotalUnidades);
    }

    const mapa: { [id: string]: number } = {};
    if (grupo.length > 0) {
      grupo.forEach(p => {
        const isCx = p.tipo_embalagem === 'Caixa' || p.tipo_embalagem === 'Fardo' || p.nome.toLowerCase().includes('caixa');
        const divisor = (p.unidades_por_caixa && p.unidades_por_caixa > 1) ? p.unidades_por_caixa : uPorCxBase;
        mapa[p.id] = isCx ? (divisor > 0 ? Math.floor(novoTotalUnidades / divisor) : 0) : novoTotalUnidades;
      });
    } else if (targetProd) {
      mapa[targetProd.id] = novoTotalUnidades;
    }

    return mapa;
  };

  // Carregamento e sincronização contínua inteligente e otimizada via Supabase
  useEffect(() => {
    if (!supabaseService.isConfigured()) {
      setIsLoadingData(false);
      return;
    }

    async function loadSupabaseData(force: boolean = false) {
      if (isFetchingRef.current) return;
      if (!force && document.hidden) return;

      isFetchingRef.current = true;
      try {
        lastFetchTimeRef.current = Date.now();

        // Se NÃO for force (carga inicial ou retorno prolongado), checa deltas ultra-leves primeiro (~300 bytes)
        // Se nenhuma venda, produto ou caixa foi alterado em outro terminal, NÃO baixa nada!
        let deltas = { hasChanges: true, changes: { vendas: true, produtos: true, caixas: true, comandas: true, movimentacoes: true } };
        if (!force) {
          deltas = await supabaseService.checkDeltas().catch(() => ({
            hasChanges: true,
            changes: { vendas: true, produtos: true, caixas: true, comandas: true, movimentacoes: true }
          }));
          if (!deltas.hasChanges) {
            // Nenhum dado mudou na nuvem! Economia de 100% do Egress neste ciclo.
            return;
          }
        }

        const canUpdateLocal = Date.now() - lastMutationTimeRef.current >= 4000;

        // Se vendas ou movimentações mudaram na nuvem, o estoque físico de produtos também foi alterado
        const shouldUpdateProdutos = force || deltas.changes.produtos || deltas.changes.movimentacoes || deltas.changes.vendas;

        // Executa em paralelo apenas as tabelas que realmente mudaram
        // Passando forceRefresh=true para tabelas alteradas para ignorar o TTL e obter o dado fresco do Supabase
        const promises: Promise<any>[] = [];

        if (shouldUpdateProdutos && canUpdateLocal) {
          promises.push(
            supabaseService.fetchProdutos(1000, true).then(dbProds => {
              if (dbProds !== null) setProdutos(dbProds);
            }).catch(() => {})
          );
        }

        if (force || deltas.changes.vendas) {
          promises.push(
            supabaseService.fetchVendas(800, true).then(dbVendas => {
              if (dbVendas !== null) setVendas(dbVendas);
            }).catch(() => {})
          );
        }

        if (force || deltas.changes.caixas) {
          promises.push(
            supabaseService.fetchCaixas(30, true).then(dbCaixas => {
              if (dbCaixas !== null) setCaixas(dbCaixas);
            }).catch(() => {})
          );
        }

        if (force || deltas.changes.movimentacoes) {
          promises.push(
            supabaseService.fetchMovimentacoes(50, true).then(dbMovs => {
              if (dbMovs !== null) setMovimentacoes(dbMovs);
            }).catch(() => {})
          );
        }

        if (force) {
          promises.push(
            supabaseService.fetchContasReceber().then(dbContas => {
              if (dbContas !== null) setContasReceber(dbContas);
            }).catch(() => {})
          );
        }

        if ((force || deltas.changes.comandas) && canUpdateLocal) {
          promises.push(
            supabaseService.fetchContasComandas(60, true).then(dbComandas => {
              if (dbComandas !== null) setContasComandas(dbComandas);
            }).catch(() => {})
          );
        }

        await Promise.all(promises);
      } catch {
        // Silencioso
      } finally {
        isFetchingRef.current = false;
        setIsLoadingData(false);
      }
    }

    // Carregamento inicial imediato
    loadSupabaseData(true);

    // Sincronização periódica inteligente (a cada 45 segundos com aba visível)
    const syncInterval = setInterval(() => {
      loadSupabaseData(false);
    }, 45000);

    // Atualiza quando o usuário volta para a aba:
    // Se ficou inativo por mais de 2 minutos (120s), força revalidação completa
    // Se ficou entre 25s e 120s, roda a checagem leve de deltas
    const handleVisibility = () => {
      if (!document.hidden) {
        const tempoOcioso = Date.now() - lastFetchTimeRef.current;
        if (tempoOcioso > 120000) {
          loadSupabaseData(true);
        } else if (tempoOcioso > 25000) {
          loadSupabaseData(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const registarLog = (acao: string, registro: string, detalhes: string) => {
    const novoLog: AuditLog010 = {
      id: `log-${Date.now()}`,
      data_hora: getNowIsoWithTimezone(),
      usuario: userSession?.username || 'Sistema',
      acao,
      registro_relacionado: registro,
      detalhes
    };
    setAuditLogs(prev => [novoLog, ...prev]);
    supabaseService.insertAuditLog(novoLog);
  };

  const handleRecarregarProdutos = async () => {
    const dbProds = await supabaseService.fetchProdutos().catch(() => null);
    if (dbProds !== null) {
      setProdutos(dbProds);
    }
  };

  // Handlers de Produtos
  const handleAddProduto = async (prod: Partial<Produto010>) => {
    lastMutationTimeRef.current = Date.now();
    const id = prod.id || `p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let descFinal = prod.descricao || '';
    if (prod.produto_pai_id && !descFinal.includes('[PAI:')) {
      descFinal = `${descFinal} [PAI:${prod.produto_pai_id}]`.trim();
    }

    const novoProd: Produto010 = {
      id,
      nome: prod.nome || 'Novo Produto',
      codigo: prod.codigo || String(Math.floor(1000 + Math.random() * 9000)),
      codigo_barras: prod.codigo_barras || prod.codigo || '',
      categoria: prod.categoria || 'Bebidas',
      marca: prod.marca || '',
      tipo_embalagem: prod.tipo_embalagem || 'Unidade',
      unidades_por_caixa: prod.unidades_por_caixa || 1,
      produto_pai_id: prod.produto_pai_id,
      preco_fardo: prod.preco_fardo,
      quantidade: prod.quantidade || 0,
      preco: prod.preco || 0,
      preco_custo: prod.preco_custo !== undefined ? prod.preco_custo : 0,
      estoque_minimo: prod.estoque_minimo || 5,
      controlar_estoque: prod.controlar_estoque !== undefined ? prod.controlar_estoque : true,
      descricao: descFinal,
      created_at: new Date().toISOString()
    };
    // Insere imediatamente no catálogo local para aparecer na hora
    setProdutos(prev => [novoProd, ...prev]);
    // Sincroniza com Supabase
    await supabaseService.insertProduto(novoProd).catch(() => {});
    registarLog('Produto cadastrado', novoProd.nome, `Cadastrado com ${novoProd.quantidade}un a R$ ${novoProd.preco.toFixed(2)}`);
  };

  const handleUpdateProduto = async (id: string, prod: Partial<Produto010>) => {
    lastMutationTimeRef.current = Date.now();
    // Atualiza imediatamente na tela
    setProdutos(prev => prev.map(p => {
      if (p.id === id) return { ...p, ...prod };
      return p;
    }));

    // Sincroniza com Supabase
    await supabaseService.updateProduto(id, prod).catch(() => {});
    registarLog('Produto editado', prod.nome || id, 'Dados do produto atualizados');
  };

  const handleDeleteProduto = async (id: string) => {
    lastMutationTimeRef.current = Date.now();
    const prod = produtos.find(p => p.id === id);
    setProdutos(prev => prev.filter(p => p.id !== id));
    await supabaseService.deleteProduto(id);
    registarLog('Produto excluído', prod?.nome || id, 'Produto removido do catálogo');
  };

  // Handlers de Vendas (PDV)
  const handleFinalizarVenda = (dadosVenda: Partial<Venda010>, itens: ItemCarrinho010[]) => {
    lastMutationTimeRef.current = Date.now();
    const caixaAberto = caixas.find(c => c.status === 'Aberto');
    const novaVenda: Venda010 = {
      ...(dadosVenda as Venda010),
      caixa_id: (dadosVenda as any).caixa_id || caixaAberto?.id
    };
    setVendas(prev => [novaVenda, ...prev]);
    supabaseService.insertVenda(novaVenda);

    // Baixa automática de estoque unificado proporcional
    itens.forEach(item => {
      const itemProd = produtos.find(p => p.id === item.produto_id);
      const isCaixa = itemProd && (itemProd.tipo_embalagem === 'Caixa' || itemProd.tipo_embalagem === 'Fardo' || itemProd.nome.toLowerCase().includes('caixa'));
      const uPorCx = itemProd?.unidades_por_caixa && itemProd.unidades_por_caixa > 1 ? itemProd.unidades_por_caixa : 1;
      const unidadesADescontar = isCaixa ? (item.quantidade * uPorCx) : item.quantidade;

      const mapa = calcularEstoqueGrupo(item.produto_id, produtos, -unidadesADescontar, 'delta');

      setProdutos(prev => prev.map(p => {
        if (mapa[p.id] !== undefined) {
          return { ...p, quantidade: mapa[p.id] };
        }
        return p;
      }));

      for (const prodId of Object.keys(mapa)) {
        supabaseService.updateProduto(prodId, { quantidade: mapa[prodId] });
      }

      // Registra movimentação de saída
      const novaMov: MovimentacaoEstoque010 = {
        id: `m-${Date.now()}-${item.produto_id}`,
        data_hora: getNowIsoWithTimezone(),
        produto_id: item.produto_id,
        produto_nome: item.nome,
        quantidade: item.quantidade,
        tipo: 'Saída',
        usuario: userSession?.username || 'admin',
        observacao: `Baixa automática Venda #${novaVenda.numero_venda}`
      };
      setMovimentacoes(prev => [novaMov, ...prev]);
      supabaseService.insertMovimentacao(novaMov);
    });

    // Registra entrada no caixa ativo do dia (apenas a parcela em DINHEIRO vai para a gaveta / saldo_esperado)
    setCaixas(prev => prev.map(c => {
      if (c.status === 'Aberto') {
        let valorDinheiroVenda = 0;
        if (Array.isArray(novaVenda.pagamentos) && novaVenda.pagamentos.length > 0) {
          novaVenda.pagamentos.forEach(p => {
            if ((p.forma || '').toLowerCase().includes('dinheiro')) {
              valorDinheiroVenda += (p.valor || 0);
            }
          });
        } else if ((novaVenda.forma_pagamento || '').toLowerCase().includes('dinheiro')) {
          valorDinheiroVenda = novaVenda.total;
        }

        const novaDet: MovimentacaoCaixaDetalhe = {
          id: `cd-${Date.now()}`,
          hora: formatTimeLocal(new Date()),
          tipo: 'Venda',
          descricao: `Venda #${novaVenda.numero_venda}`,
          valor: novaVenda.total,
          forma_pagamento: novaVenda.forma_pagamento
        };
        const cAtualizado = {
          ...c,
          valor_vendas: c.valor_vendas + novaVenda.total,
          saldo_esperado: c.saldo_esperado + valorDinheiroVenda,
          movimentacoes: [novaDet, ...(c.movimentacoes || [])]
        };
        supabaseService.updateCaixa(c.id, cAtualizado);
        return cAtualizado;
      }
      return c;
    }));

    // SE A VENDA FOI ORIUNDA DE UMA COMANDA EM FINALIZAÇÃO:
    const idComandaVinculada = novaVenda.comanda_id || comandaEmFinalizacao?.id;
    if (idComandaVinculada) {
      supabaseService.encerrarContaComanda(
        idComandaVinculada, 
        novaVenda.id, 
        novaVenda.numero_venda, 
        userSession?.username || 'admin'
      );
      setContasComandas(prev => prev.map(c => {
        if (c.id === idComandaVinculada) {
          return {
            ...c,
            status: 'ENCERRADA',
            venda_id: novaVenda.id,
            venda_numero: novaVenda.numero_venda,
            data_encerramento: getNowIsoWithTimezone(),
            usuario_encerramento: userSession?.username || 'admin'
          };
        }
        return c;
      }));
      setComandaEmFinalizacao(null);
      registarLog(
        'Comanda encerrada', 
        `Comanda #${novaVenda.comanda_numero || idComandaVinculada}`, 
        `Venda #${novaVenda.numero_venda} concluída no valor de R$ ${novaVenda.total.toFixed(2)}`
      );
    }

    registarLog('Venda realizada', `Venda #${novaVenda.numero_venda}`, `Total: R$ ${novaVenda.total.toFixed(2)} (${novaVenda.forma_pagamento})`);
  };

  // Handlers do Módulo de Contas e Comandas
  const handleCriarConta = async (clienteNome: string, observacao?: string): Promise<ContaComanda010> => {
    lastMutationTimeRef.current = Date.now();
    const timestamp = Date.now();
    const proximoNumero = contasComandas.reduce((max, c) => Math.max(max, c.numero_conta || 1000), 1000) + 1;
    
    const novaConta: ContaComanda010 = {
      id: `conta-${timestamp}`,
      numero_conta: proximoNumero,
      cliente_nome: clienteNome,
      status: 'ABERTA',
      data_abertura: getNowIsoWithTimezone(),
      usuario_abertura: userSession?.username || 'admin',
      total: 0,
      observacao: observacao || undefined,
      itens: []
    };

    setContasComandas(prev => [novaConta, ...prev]);
    await supabaseService.insertContaComanda(novaConta);
    registarLog('Comanda aberta', `Comanda #${proximoNumero}`, `Cliente: ${clienteNome}`);
    return novaConta;
  };

  const handleAdicionarItemConta = async (contaId: string, produto: Produto010, quantidade: number) => {
    lastMutationTimeRef.current = Date.now();
    const conta = contasComandas.find(c => c.id === contaId);
    if (!conta || conta.status !== 'ABERTA') return;

    const itemExistente = conta.itens.find(it => it.produto_id === produto.id);

    if (itemExistente) {
      const novaQtd = itemExistente.quantidade + quantidade;
      const novoSubtotal = round2(novaQtd * itemExistente.preco_unitario);

      // ATUALIZAÇÃO OTIMISTA IMEDIATA (0ms de atraso visual)
      setContasComandas(prev => prev.map(c => {
        if (c.id === contaId) {
          const novosItens = c.itens.map(it => 
            it.id === itemExistente.id 
              ? { ...it, quantidade: novaQtd, subtotal: novoSubtotal }
              : it
          );
          const novoTotal = round2(novosItens.reduce((acc, it) => acc + it.subtotal, 0));
          return { ...c, itens: novosItens, total: novoTotal };
        }
        return c;
      }));

      // Sincronização em background
      const novosItens = conta.itens.map(it => 
        it.id === itemExistente.id 
          ? { ...it, quantidade: novaQtd, subtotal: novoSubtotal }
          : it
      );
      const novoTotal = round2(novosItens.reduce((acc, it) => acc + it.subtotal, 0));
      supabaseService.updateItemContaComanda(itemExistente.id, novaQtd, novoSubtotal).catch(() => {});
      supabaseService.updateContaComanda(contaId, { total: novoTotal }).catch(() => {});
    } else {
      const novoItem: ItemContaComanda010 = {
        id: `item-${Date.now()}-${produto.id}`,
        conta_id: contaId,
        produto_id: produto.id,
        produto_nome: produto.nome,
        produto_codigo: produto.codigo_barras || produto.codigo,
        quantidade,
        preco_unitario: produto.preco,
        subtotal: round2(produto.preco * quantidade),
        data_lancamento: new Date().toISOString(),
        usuario: userSession?.username || 'admin'
      };

      // ATUALIZAÇÃO OTIMISTA IMEDIATA (aparece na hora no sistema!)
      setContasComandas(prev => prev.map(c => {
        if (c.id === contaId) {
          const novosItens = [...c.itens, novoItem];
          const novoTotal = round2(novosItens.reduce((acc, it) => acc + it.subtotal, 0));
          return { ...c, itens: novosItens, total: novoTotal };
        }
        return c;
      }));

      // Sincronização em background sem travar a interface
      const novoTotal = round2([...conta.itens, novoItem].reduce((acc, it) => acc + it.subtotal, 0));
      supabaseService.insertItemContaComanda(novoItem).catch(() => {});
      supabaseService.updateContaComanda(contaId, { total: novoTotal }).catch(() => {});
    }

    registarLog('Item adicionado à comanda', `Comanda #${conta.numero_conta}`, `${quantidade}x ${produto.nome}`);
  };

  const handleAlterarQuantidadeItem = async (contaId: string, itemId: string, delta: number) => {
    lastMutationTimeRef.current = Date.now();
    const conta = contasComandas.find(c => c.id === contaId);
    if (!conta || conta.status !== 'ABERTA') return;

    const item = conta.itens.find(it => it.id === itemId);
    if (!item) return;

    const novaQtd = item.quantidade + delta;

    if (novaQtd <= 0) {
      await handleRemoverItemConta(contaId, itemId);
      return;
    }

    const novoSubtotal = round2(novaQtd * item.preco_unitario);

    // ATUALIZAÇÃO OTIMISTA IMEDIATA
    setContasComandas(prev => prev.map(c => {
      if (c.id === contaId) {
        const novosItens = c.itens.map(it => 
          it.id === itemId 
            ? { ...it, quantidade: novaQtd, subtotal: novoSubtotal }
            : it
        );
        const novoTotal = round2(novosItens.reduce((acc, it) => acc + it.subtotal, 0));
        return { ...c, itens: novosItens, total: novoTotal };
      }
      return c;
    }));

    // Sincronização em background
    const novosItens = conta.itens.map(it => 
      it.id === itemId 
        ? { ...it, quantidade: novaQtd, subtotal: novoSubtotal }
        : it
    );
    const novoTotal = round2(novosItens.reduce((acc, it) => acc + it.subtotal, 0));
    supabaseService.updateItemContaComanda(itemId, novaQtd, novoSubtotal).catch(() => {});
    supabaseService.updateContaComanda(contaId, { total: novoTotal }).catch(() => {});
  };

  const handleRemoverItemConta = async (contaId: string, itemId: string) => {
    lastMutationTimeRef.current = Date.now();
    const conta = contasComandas.find(c => c.id === contaId);
    if (!conta || conta.status !== 'ABERTA') return;

    // ATUALIZAÇÃO OTIMISTA IMEDIATA
    setContasComandas(prev => prev.map(c => {
      if (c.id === contaId) {
        const novosItens = c.itens.filter(it => it.id !== itemId);
        const novoTotal = round2(novosItens.reduce((acc, it) => acc + it.subtotal, 0));
        return { ...c, itens: novosItens, total: novoTotal };
      }
      return c;
    }));

    // Sincronização em background
    const novosItens = conta.itens.filter(it => it.id !== itemId);
    const novoTotal = round2(novosItens.reduce((acc, it) => acc + it.subtotal, 0));
    supabaseService.deleteItemContaComanda(itemId).catch(() => {});
    supabaseService.updateContaComanda(contaId, { total: novoTotal }).catch(() => {});
    registarLog('Item removido da comanda', `Comanda #${conta.numero_conta}`, `Item ID: ${itemId}`);
  };

  const handleEncaminharComandaParaPdv = (conta: ContaComanda010) => {
    if (conta.status !== 'ABERTA') {
      alert('Esta conta já está encerrada!');
      return;
    }
    if (conta.itens.length === 0) {
      alert('A comanda precisa ter pelo menos um produto adicionado para ser encerrada no PDV!');
      return;
    }

    // Prepara os itens para o carrinho do PDV existente respeitando os preços e quantidades
    const itensCarrinho: ItemCarrinho010[] = conta.itens.map(it => ({
      produto_id: it.produto_id,
      nome: it.produto_nome,
      codigo: it.produto_codigo || '',
      quantidade: it.quantidade,
      preco_unitario: it.preco_unitario,
      subtotal: it.subtotal
    }));

    setCarrinho(itensCarrinho);
    setComandaEmFinalizacao(conta);
    setActiveTab('pdv');
  };

  const handleCancelarComandaFinalizacao = () => {
    setComandaEmFinalizacao(null);
  };

  const handleEncerrarApagarConta = async (contaId: string) => {
    lastMutationTimeRef.current = Date.now();
    const conta = contasComandas.find(c => c.id === contaId);
    if (!conta) return;

    setContasComandas(prev => prev.filter(c => c.id !== contaId));

    if (comandaEmFinalizacao?.id === contaId) {
      setComandaEmFinalizacao(null);
    }

    await supabaseService.deleteContaComanda(contaId);

    registarLog(
      'Comanda encerrada e apagada',
      `Comanda #${conta.numero_conta} (${conta.cliente_nome})`,
      `Conta encerrada e apagada por completo pelo operador ${userSession?.username || 'admin'}`
    );
  };

  // Handler para Pagamento de Comanda (Total, Metade, Por Itens ou Parcial) com lançamento direto no Caixa
  const handlePagarContaComanda = async (
    contaId: string,
    valorPago: number,
    formaPagamento: 'Dinheiro' | 'Pix' | 'Cartão de Débito' | 'Cartão de Crédito',
    valorRecebido?: number,
    troco?: number,
    observacao?: string,
    itensPagos?: ItemPagoComanda[]
  ): Promise<{ success: boolean; message: string }> => {
    lastMutationTimeRef.current = Date.now();
    const conta = contasComandas.find(c => c.id === contaId);
    if (!conta) {
      return { success: false, message: 'Conta/Comanda não encontrada.' };
    }
    if (conta.status !== 'ABERTA') {
      return { success: false, message: 'Esta comanda não está mais aberta.' };
    }

    const caixaAberto = caixas.find(c => c.status === 'Aberto');
    if (!caixaAberto) {
      return { 
        success: false, 
        message: 'Para receber pagamentos, é necessário ter um caixa aberto no sistema. Por favor, abra o caixa na aba "Caixa".' 
      };
    }

    const isPagamentoPorItens = Boolean(itensPagos && itensPagos.length > 0);
    const totalConta = round2(conta.total || conta.itens.reduce((acc, it) => acc + it.subtotal, 0));
    const totalJaPago = round2(conta.total_pago || (conta.pagamentos || []).reduce((acc, p) => acc + p.valor, 0));
    const saldoDevedor = round2(Math.max(0, totalConta - totalJaPago));

    if (saldoDevedor <= 0) {
      return { success: false, message: 'Esta comanda já está totalmente paga.' };
    }

    if (valorPago <= 0) {
      return { success: false, message: 'O valor do pagamento deve ser maior que zero.' };
    }

    // Limita o pagamento ao saldo devedor
    const valorEfetivo = round2(Math.min(valorPago, saldoDevedor));
    const novoTotalPago = round2(totalJaPago + valorEfetivo);
    const novoSaldoRestante = round2(Math.max(0, totalConta - novoTotalPago));
    const isQuitacaoTotal = novoSaldoRestante <= 0.005;

    // 1. Gera registro de Venda para contabilizar no Caixa, PDV e Dashboard
    const proximoNumeroVenda = vendas.reduce((max, v) => Math.max(max, v.numero_venda || 0), 0) + 1;
    const novaVendaId = `v-${Date.now()}`;
    const produtosVenda = isPagamentoPorItens && itensPagos
      ? itensPagos.map(it => ({
          produto_id: it.produtoId,
          nome: it.nome,
          codigo: it.codigo || '',
          quantidade: it.quantidade,
          preco_unitario: it.precoUnitario,
          subtotal: it.subtotal
        }))
      : isQuitacaoTotal && conta.itens.length > 0
      ? conta.itens.map(it => ({
          produto_id: it.produto_id,
          nome: it.produto_nome,
          codigo: it.produto_codigo || '',
          quantidade: it.quantidade,
          preco_unitario: it.preco_unitario,
          subtotal: it.subtotal
        }))
      : [{
          produto_id: `parcial-${conta.id}`,
          nome: `Pagamento Parcial — Comanda #${conta.numero_conta} (${conta.cliente_nome})`,
          codigo: `CMD-${conta.numero_conta}`,
          quantidade: 1,
          preco_unitario: valorEfetivo,
          subtotal: valorEfetivo
        }];

    const obsTexto = isPagamentoPorItens && itensPagos
      ? `Pagamento de ${itensPagos.length} item(ns) da Comanda #${conta.numero_conta}: ${itensPagos.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}`
      : observacao;

    const novaVenda: Venda010 = {
      id: novaVendaId,
      caixa_id: caixaAberto.id,
      numero_venda: proximoNumeroVenda,
      data_hora: getNowIsoWithTimezone(),
      usuario: userSession?.username || 'admin',
      cliente_nome: conta.cliente_nome,
      comanda_id: conta.id,
      comanda_numero: conta.numero_conta,
      total: valorEfetivo,
      subtotal: valorEfetivo,
      desconto_valor: 0,
      desconto_porcentagem: 0,
      forma_pagamento: formaPagamento,
      pagamentos: [{ forma: formaPagamento, valor: valorEfetivo }],
      valor_recebido: formaPagamento === 'Dinheiro' ? (valorRecebido || valorEfetivo) : valorEfetivo,
      troco: formaPagamento === 'Dinheiro' ? (troco || 0) : 0,
      status: 'Concluída',
      produtos: produtosVenda
    };

    setVendas(prev => [novaVenda, ...prev]);
    supabaseService.insertVenda(novaVenda);

    // 2. Atualiza o Caixa Ativo com a movimentação
    const novaMovDetalhe: MovimentacaoCaixaDetalhe = {
      id: `cd-${Date.now()}`,
      hora: formatTimeLocal(new Date()),
      tipo: 'Venda',
      descricao: isPagamentoPorItens
        ? `Itens Comanda #${conta.numero_conta} (${conta.cliente_nome})`
        : isQuitacaoTotal
        ? `Quitação Comanda #${conta.numero_conta} (${conta.cliente_nome})`
        : `Pagamento Parcial — Comanda #${conta.numero_conta} (${conta.cliente_nome})`,
      valor: valorEfetivo,
      forma_pagamento: formaPagamento
    };

    const valorDinheiro = formaPagamento === 'Dinheiro' ? valorEfetivo : 0;
    setCaixas(prev => prev.map(c => {
      if (c.id === caixaAberto.id) {
        const cAtualizado = {
          ...c,
          valor_vendas: c.valor_vendas + valorEfetivo,
          saldo_esperado: c.saldo_esperado + valorDinheiro,
          movimentacoes: [novaMovDetalhe, ...(c.movimentacoes || [])]
        };
        supabaseService.updateCaixa(c.id, cAtualizado);
        return cAtualizado;
      }
      return c;
    }));

    // 3. Realiza a baixa de estoque dos produtos
    const itensParaBaixa = isPagamentoPorItens && itensPagos
      ? itensPagos.map(i => ({ produto_id: i.produtoId, produto_nome: i.nome, quantidade: i.quantidade }))
      : isQuitacaoTotal && conta.itens.length > 0
      ? conta.itens.map(i => ({ produto_id: i.produto_id, produto_nome: i.produto_nome, quantidade: i.quantidade }))
      : [];

    if (itensParaBaixa.length > 0) {
      itensParaBaixa.forEach(item => {
        const itemProd = produtos.find(p => p.id === item.produto_id);
        const isCaixa = itemProd && (itemProd.tipo_embalagem === 'Caixa' || itemProd.tipo_embalagem === 'Fardo' || itemProd.nome.toLowerCase().includes('caixa'));
        const uPorCx = itemProd?.unidades_por_caixa && itemProd.unidades_por_caixa > 1 ? itemProd.unidades_por_caixa : 1;
        const unidadesADescontar = isCaixa ? (item.quantidade * uPorCx) : item.quantidade;

        const mapa = calcularEstoqueGrupo(item.produto_id, produtos, -unidadesADescontar, 'delta');

        setProdutos(prev => prev.map(p => {
          if (mapa[p.id] !== undefined) {
            return { ...p, quantidade: mapa[p.id] };
          }
          return p;
        }));

        for (const prodId of Object.keys(mapa)) {
          supabaseService.updateProduto(prodId, { quantidade: mapa[prodId] }).catch(() => {});
        }

        // Registra movimentação de estoque
        const novaMovEst: MovimentacaoEstoque010 = {
          id: `m-${Date.now()}-${item.produto_id}`,
          data_hora: getNowIsoWithTimezone(),
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade: item.quantidade,
          tipo: 'Saída',
          usuario: userSession?.username || 'admin',
          observacao: isPagamentoPorItens
            ? `Baixa de itens pagos na Comanda #${conta.numero_conta} (Venda #${novaVenda.numero_venda})`
            : `Baixa Comanda #${conta.numero_conta} quitada (Venda #${novaVenda.numero_venda})`
        };
        setMovimentacoes(prev => [novaMovEst, ...prev]);
        supabaseService.insertMovimentacao(novaMovEst).catch(() => {});
      });
    }

    // 4. Grava o pagamento na Comanda
    const novoPagamento: PagamentoContaComanda010 = {
      id: `pag-${Date.now()}`,
      conta_id: conta.id,
      data_hora: getNowIsoWithTimezone(),
      valor: valorEfetivo,
      forma_pagamento: formaPagamento,
      usuario: userSession?.username || 'admin',
      venda_id: novaVenda.id,
      venda_numero: novaVenda.numero_venda,
      observacao: obsTexto
    };

    supabaseService.insertPagamentoContaComanda(novoPagamento).catch(() => {});

    // 5. Atualização da Comanda
    if (isPagamentoPorItens && itensPagos) {
      // Abate os itens específicos que foram pagos
      const novosItensComanda = conta.itens
        .map(it => {
          const pago = itensPagos.find(p => p.itemId === it.id);
          if (!pago) return it;
          const restQtd = it.quantidade - pago.quantidade;
          if (restQtd <= 0) {
            supabaseService.deleteItemContaComanda(it.id).catch(() => {});
            return null;
          }
          const novoSub = round2(restQtd * it.preco_unitario);
          supabaseService.updateItemContaComanda(it.id, restQtd, novoSub).catch(() => {});
          return {
            ...it,
            quantidade: restQtd,
            subtotal: novoSub
          };
        })
        .filter((it): it is ItemContaComanda010 => it !== null);

      const novoTotalItensComanda = round2(novosItensComanda.reduce((acc, it) => acc + it.subtotal, 0));
      const quitouComandaPorItens = novosItensComanda.length === 0 || novoTotalItensComanda <= 0.005;

      if (quitouComandaPorItens) {
        supabaseService.encerrarContaComanda(
          conta.id, 
          novaVenda.id, 
          novaVenda.numero_venda, 
          userSession?.username || 'admin'
        ).catch(() => {});

        setContasComandas(prev => prev.map(c => {
          if (c.id === conta.id) {
            return {
              ...c,
              status: 'ENCERRADA',
              itens: [],
              total: totalConta,
              total_pago: novoTotalPago,
              saldo_restante: 0,
              venda_id: novaVenda.id,
              venda_numero: novaVenda.numero_venda,
              data_encerramento: new Date().toISOString(),
              usuario_encerramento: userSession?.username || 'admin',
              pagamentos: [...(c.pagamentos || []), novoPagamento]
            };
          }
          return c;
        }));

        registarLog(
          'Comanda quitada por itens', 
          `Comanda #${conta.numero_conta}`, 
          `Todos os itens foram pagos! Quitação total de R$ ${valorEfetivo.toFixed(2)} (${formaPagamento}). Venda #${novaVenda.numero_venda}`
        );

        return {
          success: true,
          message: `Todos os itens foram quitados! Comanda #${conta.numero_conta} encerrada com sucesso.`
        };
      } else {
        supabaseService.updateContaComanda(conta.id, {
          total: novoTotalItensComanda,
          saldo_restante: novoTotalItensComanda
        }).catch(() => {});

        setContasComandas(prev => prev.map(c => {
          if (c.id === conta.id) {
            return {
              ...c,
              itens: novosItensComanda,
              total: novoTotalItensComanda,
              saldo_restante: novoTotalItensComanda,
              total_pago: novoTotalPago,
              pagamentos: [...(c.pagamentos || []), novoPagamento]
            };
          }
          return c;
        }));

        registarLog(
          'Itens da comanda pagos', 
          `Comanda #${conta.numero_conta}`, 
          `Pagamento de ${itensPagos.length} item(ns) no valor de R$ ${valorEfetivo.toFixed(2)} (${formaPagamento}). Restam R$ ${novoTotalItensComanda.toFixed(2)}`
        );

        return {
          success: true,
          message: `Itens pagos com sucesso! Restam R$ ${novoTotalItensComanda.toFixed(2)} na Comanda #${conta.numero_conta}.`
        };
      }
    } else if (isQuitacaoTotal) {
      supabaseService.encerrarContaComanda(
        conta.id, 
        novaVenda.id, 
        novaVenda.numero_venda, 
        userSession?.username || 'admin'
      ).catch(() => {});

      setContasComandas(prev => prev.map(c => {
        if (c.id === conta.id) {
          return {
            ...c,
            status: 'ENCERRADA',
            total_pago: novoTotalPago,
            saldo_restante: 0,
            venda_id: novaVenda.id,
            venda_numero: novaVenda.numero_venda,
            data_encerramento: new Date().toISOString(),
            usuario_encerramento: userSession?.username || 'admin',
            pagamentos: [...(c.pagamentos || []), novoPagamento]
          };
        }
        return c;
      }));

      registarLog(
        'Comanda quitada', 
        `Comanda #${conta.numero_conta}`, 
        `Quitação total de R$ ${valorEfetivo.toFixed(2)} (${formaPagamento}) no Caixa. Venda #${novaVenda.numero_venda}`
      );
    } else {
      supabaseService.updateContaComanda(conta.id, {
        total_pago: novoTotalPago,
        saldo_restante: novoSaldoRestante
      }).catch(() => {});

      setContasComandas(prev => prev.map(c => {
        if (c.id === conta.id) {
          return {
            ...c,
            total_pago: novoTotalPago,
            saldo_restante: novoSaldoRestante,
            pagamentos: [...(c.pagamentos || []), novoPagamento]
          };
        }
        return c;
      }));

      registarLog(
        'Pagamento parcial de comanda', 
        `Comanda #${conta.numero_conta}`, 
        `Recebido R$ ${valorEfetivo.toFixed(2)} (${formaPagamento}) no Caixa. Restam R$ ${novoSaldoRestante.toFixed(2)}`
      );
    }

    return { 
      success: true, 
      message: isQuitacaoTotal
        ? `Comanda #${conta.numero_conta} quitada com sucesso! R$ ${valorEfetivo.toFixed(2)} registrado no Caixa.`
        : `Pagamento de R$ ${valorEfetivo.toFixed(2)} registrado no Caixa! Saldo restante: R$ ${novoSaldoRestante.toFixed(2)}.`
    };
  };

  const handleCancelarVenda = (vendaId: string) => {
    const targetVenda = vendas.find(v => v.id === vendaId);
    if (!targetVenda) return;
    if (targetVenda.status === 'Cancelada') return;

    lastMutationTimeRef.current = Date.now();
    setVendas(prev => prev.map(v => v.id === vendaId ? { ...v, status: 'Cancelada' } : v));
    supabaseService.updateVenda(vendaId, { status: 'Cancelada' });

    // Estorno do estoque para a Unidade e Caixa proporcionalmente
    if (Array.isArray(targetVenda.produtos)) {
      targetVenda.produtos.forEach(item => {
        const itemProd = produtos.find(p => p.id === item.produto_id);
        const isCaixa = itemProd && (itemProd.tipo_embalagem === 'Caixa' || itemProd.tipo_embalagem === 'Fardo' || itemProd.nome.toLowerCase().includes('caixa'));
        const uPorCx = itemProd?.unidades_por_caixa && itemProd.unidades_por_caixa > 1 ? itemProd.unidades_por_caixa : 1;
        const unidadesAEstornar = isCaixa ? (item.quantidade * uPorCx) : item.quantidade;

        const mapa = calcularEstoqueGrupo(item.produto_id, produtos, unidadesAEstornar, 'delta');

        setProdutos(prev => prev.map(p => {
          if (mapa[p.id] !== undefined) {
            return { ...p, quantidade: mapa[p.id] };
          }
          return p;
        }));

        for (const prodId of Object.keys(mapa)) {
          supabaseService.updateProduto(prodId, { quantidade: mapa[prodId] });
        }

        const novaMov: MovimentacaoEstoque010 = {
          id: `m-${Date.now()}-${item.produto_id}`,
          data_hora: getNowIsoWithTimezone(),
          produto_id: item.produto_id,
          produto_nome: item.nome,
          quantidade: item.quantidade,
          tipo: 'Entrada',
          usuario: userSession?.username || 'admin',
          observacao: `Estorno autom. Cancelamento Venda #${targetVenda.numero_venda}`
        };
        setMovimentacoes(prev => [novaMov, ...prev]);
        supabaseService.insertMovimentacao(novaMov);
      });
    }

    // Estorna no caixa ativo do dia (diminui valor_vendas e saldo_esperado)
    setCaixas(prev => prev.map(c => {
      const isCaixaDaVenda = targetVenda.caixa_id ? c.id === targetVenda.caixa_id : c.status === 'Aberto';
      if (isCaixaDaVenda) {
        let valorDinheiroVenda = 0;
        if (Array.isArray(targetVenda.pagamentos) && targetVenda.pagamentos.length > 0) {
          targetVenda.pagamentos.forEach(p => {
            if ((p.forma || '').toLowerCase().includes('dinheiro')) {
              valorDinheiroVenda += (p.valor || 0);
            }
          });
        } else if ((targetVenda.forma_pagamento || '').toLowerCase().includes('dinheiro')) {
          valorDinheiroVenda = targetVenda.total;
        }

        const cAtualizado = {
          ...c,
          valor_vendas: Math.max(0, c.valor_vendas - targetVenda.total),
          saldo_esperado: Math.max(0, c.saldo_esperado - valorDinheiroVenda),
          movimentacoes: (c.movimentacoes || []).filter(m => !m.descricao.includes(`#${targetVenda.numero_venda}`))
        };
        supabaseService.updateCaixa(c.id, cAtualizado);
        return cAtualizado;
      }
      return c;
    }));

    registarLog('Venda cancelada', `Venda #${targetVenda.numero_venda}`, `Cancelamento da venda R$ ${targetVenda.total.toFixed(2)}`);
  };

  // Exclusão definitiva de venda lançada indevidamente
  const handleExcluirVenda = async (vendaId: string) => {
    const targetVenda = vendas.find(v => v.id === vendaId);
    if (!targetVenda) return;

    lastMutationTimeRef.current = Date.now();

    // Se não estiver cancelada, estorna o estoque antes proporcionalmente
    if (targetVenda.status !== 'Cancelada' && Array.isArray(targetVenda.produtos)) {
      targetVenda.produtos.forEach(item => {
        const itemProd = produtos.find(p => p.id === item.produto_id);
        const isCaixa = itemProd && (itemProd.tipo_embalagem === 'Caixa' || itemProd.tipo_embalagem === 'Fardo' || itemProd.nome.toLowerCase().includes('caixa'));
        const uPorCx = itemProd?.unidades_por_caixa && itemProd.unidades_por_caixa > 1 ? itemProd.unidades_por_caixa : 1;
        const unidadesAEstornar = isCaixa ? (item.quantidade * uPorCx) : item.quantidade;

        const mapa = calcularEstoqueGrupo(item.produto_id, produtos, unidadesAEstornar, 'delta');

        setProdutos(prev => prev.map(p => {
          if (mapa[p.id] !== undefined) {
            return { ...p, quantidade: mapa[p.id] };
          }
          return p;
        }));

        for (const prodId of Object.keys(mapa)) {
          supabaseService.updateProduto(prodId, { quantidade: mapa[prodId] });
        }
      });
    }

    setVendas(prev => prev.filter(v => v.id !== vendaId));
    await supabaseService.deleteVenda(vendaId);

    // Ajusta o caixa
    if (targetVenda.status !== 'Cancelada') {
      setCaixas(prev => prev.map(c => {
        const isCaixaDaVenda = targetVenda.caixa_id ? c.id === targetVenda.caixa_id : c.status === 'Aberto';
        if (isCaixaDaVenda) {
          let valorDinheiroVenda = 0;
          if (Array.isArray(targetVenda.pagamentos) && targetVenda.pagamentos.length > 0) {
            targetVenda.pagamentos.forEach(p => {
              if ((p.forma || '').toLowerCase().includes('dinheiro')) {
                valorDinheiroVenda += (p.valor || 0);
              }
            });
          } else if ((targetVenda.forma_pagamento || '').toLowerCase().includes('dinheiro')) {
            valorDinheiroVenda = targetVenda.total;
          }

          const cAtualizado = {
            ...c,
            valor_vendas: Math.max(0, c.valor_vendas - targetVenda.total),
            saldo_esperado: Math.max(0, c.saldo_esperado - valorDinheiroVenda),
            movimentacoes: (c.movimentacoes || []).filter(m => !m.descricao.includes(`#${targetVenda.numero_venda}`))
          };
          supabaseService.updateCaixa(c.id, cAtualizado);
          return cAtualizado;
        }
        return c;
      }));
    }

    registarLog('Venda excluída', `Venda #${targetVenda.numero_venda}`, `Exclusão da venda R$ ${targetVenda.total.toFixed(2)}`);
  };

  // Handlers de Movimentação de Estoque
  const handleRegistrarMovimentacaoEstoque = async (mov: Partial<MovimentacaoEstoque010>) => {
    lastMutationTimeRef.current = Date.now();

    const novaMov: MovimentacaoEstoque010 = {
      id: `m-${Date.now()}`,
      data_hora: getNowIsoWithTimezone(),
      produto_id: mov.produto_id || '',
      produto_nome: mov.produto_nome || '',
      quantidade: mov.quantidade || 0,
      tipo: mov.tipo || 'Entrada',
      usuario: mov.usuario || userSession?.username || 'admin',
      observacao: mov.observacao
    };

    setMovimentacoes(prev => [novaMov, ...prev]);
    supabaseService.insertMovimentacao(novaMov);

    const targetProd = produtos.find(p => p.id === mov.produto_id);
    const isCaixa = targetProd && (targetProd.tipo_embalagem === 'Caixa' || targetProd.tipo_embalagem === 'Fardo' || targetProd.nome.toLowerCase().includes('caixa'));
    const uPorCx = targetProd?.unidades_por_caixa && targetProd.unidades_por_caixa > 1 ? targetProd.unidades_por_caixa : 1;

    let deltaOuTotal = 0;
    let tipoOperacao: 'delta' | 'set_unidades' = 'delta';

    if (mov.tipo === 'Entrada') {
      deltaOuTotal = isCaixa ? (mov.quantidade || 0) * uPorCx : (mov.quantidade || 0);
      tipoOperacao = 'delta';
    } else if (mov.tipo === 'Saída') {
      deltaOuTotal = -(isCaixa ? (mov.quantidade || 0) * uPorCx : (mov.quantidade || 0));
      tipoOperacao = 'delta';
    } else if (mov.tipo === 'Ajuste') {
      deltaOuTotal = isCaixa ? (mov.quantidade || 0) * uPorCx : (mov.quantidade || 0);
      tipoOperacao = 'set_unidades';
    }

    const mapa = calcularEstoqueGrupo(mov.produto_id || '', produtos, deltaOuTotal, tipoOperacao);

    setProdutos(prev => prev.map(p => {
      if (mapa[p.id] !== undefined) {
        return { ...p, quantidade: mapa[p.id] };
      }
      return p;
    }));

    for (const prodId of Object.keys(mapa)) {
      await supabaseService.updateProduto(prodId, { quantidade: mapa[prodId] });
    }

    registarLog(`${mov.tipo} de estoque`, mov.produto_nome || '', `${mov.quantidade} unidades por ${mov.usuario}`);
  };

  // Handler de Importação Automática de Nota Fiscal (NF-e XML)
  const handleConfirmarImportacaoNFe = async ({
    compra,
    produtosAtualizadosOuCriados,
    movimentacoes: novasMovs
  }: {
    compra: CompraEstoqueNFe;
    produtosAtualizadosOuCriados: Produto010[];
    movimentacoes: Partial<MovimentacaoEstoque010>[];
  }) => {
    // 1. Salva compra no histórico do financeiro
    setComprasEstoque(prev => [compra, ...prev]);

    // 2. Atualiza ou cadastra produtos no catálogo com quantidades e novos preços de custo pagos
    for (const prod of produtosAtualizadosOuCriados) {
      setProdutos(prev => {
        const existe = prev.some(item => item.id === prod.id);
        if (existe) {
          return prev.map(item => item.id === prod.id ? prod : item);
        } else {
          return [prod, ...prev];
        }
      });

      // Tenta persistência no banco Supabase
      try {
        const jaExisteNoBanco = produtos.some(item => item.id === prod.id);
        if (jaExisteNoBanco) {
          await supabaseService.updateProduto(prod.id, {
            quantidade: prod.quantidade,
            preco_custo: prod.preco_custo,
            preco: prod.preco
          });
        } else {
          await supabaseService.insertProduto(prod);
        }
      } catch {
        // Silencioso
      }
    }

    // 3. Registra movimentações de entrada no histórico do estoque
    for (const m of novasMovs) {
      const novaMov: MovimentacaoEstoque010 = {
        id: m.id || `m-nfe-${Date.now()}-${Math.random()}`,
        data_hora: m.data_hora || getNowIsoWithTimezone(),
        produto_id: m.produto_id || '',
        produto_nome: m.produto_nome || '',
        quantidade: m.quantidade || 1,
        tipo: 'Entrada',
        usuario: m.usuario || userSession?.username || 'admin',
        observacao: m.observacao || `Entrada NF-e nº ${compra.numero_nota}`
      };
      setMovimentacoes(prev => [novaMov, ...prev]);
      try {
        await supabaseService.insertMovimentacao(novaMov);
      } catch (e) {}
    }

    // 4. Registra notificação e log de auditoria
    const novaNotif: Notificacao010 = {
      id: `notif-${Date.now()}`,
      titulo: `NF-e nº ${compra.numero_nota} Importada`,
      mensagem: `${compra.fornecedor_nome}: ${compra.itens.length} itens lançados no estoque. Total pago: R$ ${compra.valor_total.toFixed(2)}.`,
      tipo: 'sucesso',
      data_hora: getNowIsoWithTimezone(),
      lida: false
    };
    setNotificacoes(prev => [novaNotif, ...prev]);

    registarLog(
      'Importação NF-e',
      `NF #${compra.numero_nota} - ${compra.fornecedor_nome}`,
      `Entrada automática de ${compra.itens.length} produtos. Custo total R$ ${compra.valor_total.toFixed(2)}`
    );

    playBeep('success');
    setScanBanner({
      type: 'success',
      title: '✅ NF-e Importada com Sucesso!',
      mensagem: `${compra.fornecedor_nome} (NF nº ${compra.numero_nota})`,
      detalhes: `Estoque e custos unitários atualizados. R$ ${compra.valor_total.toFixed(2)} registrado no Financeiro.`
    });
    setTimeout(() => setScanBanner(null), 5000);
  };

  // Handlers de Contas a Receber
  const handleDarBaixaConta = (id: string) => {
    setContasReceber(prev => prev.map(c => {
      if (c.id === id) {
        const contaAtualizada = {
          ...c,
          valor_recebido: c.valor_total,
          status: 'Recebido' as const,
          data_pagamento: new Date().toISOString().slice(0, 10)
        };
        supabaseService.updateContaReceber(id, contaAtualizada);
        return contaAtualizada;
      }
      return c;
    }));
    registarLog('Conta paga', id, 'Baixa total no título');
  };

  const handleAdicionarConta = (conta: Partial<ContaReceber010>) => {
    const novaConta: ContaReceber010 = {
      id: `cr-${Date.now()}`,
      cliente_nome: conta.cliente_nome || 'Cliente',
      valor_total: conta.valor_total || 0,
      valor_recebido: 0,
      status: 'Em Aberto',
      data_vencimento: conta.data_vencimento || new Date().toISOString().slice(0, 10)
    };
    setContasReceber(prev => [novaConta, ...prev]);
    supabaseService.insertContaReceber(novaConta);
    registarLog('Conta criada', novaConta.cliente_nome, `Valor: R$ ${novaConta.valor_total.toFixed(2)}`);
  };

  // Handlers de Caixa
  const handleAbrirCaixa = (valorInicial: number, obs?: string) => {
    const hojeData = getLocalDateString();
    const novoCaixa: Caixa010 = {
      id: `cx-${Date.now()}`,
      data: hojeData,
      status: 'Aberto',
      usuario_abertura: userSession?.username || 'admin',
      hora_abertura: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      valor_inicial: valorInicial,
      valor_vendas: 0,
      valor_entradas: 0,
      valor_saidas: 0,
      valor_despesas: 0,
      saldo_esperado: valorInicial,
      observacao: obs,
      movimentacoes: [
        {
          id: `cd-${Date.now()}`,
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          tipo: 'Entrada',
          descricao: 'Abertura de Caixa (Suprimento Inicial)',
          valor: valorInicial,
          forma_pagamento: 'Dinheiro'
        }
      ]
    };

    setCaixas(prev => [
      novoCaixa, 
      ...prev.map(c => c.status === 'Aberto' ? { ...c, status: 'Fechado' as const } : c)
    ]);
    supabaseService.insertCaixa(novoCaixa);
    registarLog('Caixa aberto', hojeData, `Valor inicial de troco: R$ ${valorInicial.toFixed(2)}`);
  };

  const handleFecharCaixa = (caixaId: string, valorInformado: number, obs?: string) => {
    setCaixas(prev => prev.map(c => {
      if (c.id === caixaId) {
        const diff = valorInformado - c.saldo_esperado;
        const cAtualizado = {
          ...c,
          status: 'Fechado' as const,
          usuario_fechamento: userSession?.username || 'admin',
          hora_fechamento: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          valor_informado: valorInformado,
          diferenca: diff,
          observacao: obs
        };
        supabaseService.updateCaixa(caixaId, cAtualizado);
        return cAtualizado;
      }
      return c;
    }));
    registarLog('Caixa fechado', caixaId, `Valor contado: R$ ${valorInformado.toFixed(2)}`);
  };

  const handleAdicionarEntradaDespesa = (caixaId: string, tipo: 'Entrada' | 'Despesa', valor: number, descricao: string) => {
    setCaixas(prev => prev.map(c => {
      if (c.id === caixaId) {
        const novaMov: MovimentacaoCaixaDetalhe = {
          id: `cd-${Date.now()}`,
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          tipo: tipo,
          descricao: descricao || (tipo === 'Entrada' ? 'Suprimento de Troco' : 'Sangria / Despesa'),
          valor: valor,
          forma_pagamento: 'Dinheiro'
        };

        const nEntradas = tipo === 'Entrada' ? c.valor_entradas + valor : c.valor_entradas;
        const nDespesas = tipo === 'Despesa' ? c.valor_despesas + valor : c.valor_despesas;
        const nSaldo = tipo === 'Entrada' ? c.saldo_esperado + valor : c.saldo_esperado - valor;

        const cAtualizado = {
          ...c,
          valor_entradas: nEntradas,
          valor_despesas: nDespesas,
          saldo_esperado: nSaldo,
          movimentacoes: [novaMov, ...(c.movimentacoes || [])]
        };
        supabaseService.updateCaixa(caixaId, cAtualizado);
        return cAtualizado;
      }
      return c;
    }));
    registarLog(`Lançamento no caixa (${tipo})`, caixaId, `Valor: R$ ${valor.toFixed(2)} - ${descricao}`);
  };

  // Handlers de Notificações
  const handleMarcarNotificacaoLida = (id: string) => {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  };

  const handleLimparNotificacoes = () => {
    setNotificacoes([]);
  };

  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;

  // Se o usuário não está autenticado, exibe Modal de Login
  if (!userSession || !userSession.isAuthenticated) {
    return (
      <LoginModal 
        onLogin={(session) => {
          try { localStorage.setItem('010_user_session', JSON.stringify(session)); } catch(e) {}
          setUserSession(session);
        }} 
      />
    );
  }

  // Tela de Carregamento Inicial do Supabase
  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 transition-colors">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-900 border border-orange-500/40 p-1 shadow-2xl shadow-orange-500/20 mb-4 animate-pulse">
          <img src="/logo_icon.png" alt="010 Distribuidora" className="w-full h-full object-cover rounded-xl" />
        </div>
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-5 py-3 rounded-2xl shadow-2xl">
          <div className="w-5 h-5 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-black tracking-wider uppercase text-zinc-200">Sincronizando com Supabase...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex text-zinc-100 antialiased font-sans select-none relative">
      {/* Floating Toast Notification para Bipagem Global */}
      {scanBanner && (
        <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-in slide-in-from-top duration-300 pointer-events-auto">
          <div className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3.5 transition-all ${
            scanBanner.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 shadow-emerald-900/40'
              : scanBanner.type === 'warning'
              ? 'bg-amber-950/90 border-amber-500/50 text-amber-100 shadow-amber-900/40'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-rose-900/40'
          }`}>
            <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
              scanBanner.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400'
                : scanBanner.type === 'warning'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}>
              {scanBanner.type === 'success' && <Zap className="w-6 h-6 animate-pulse" />}
              {scanBanner.type === 'warning' && <AlertTriangle className="w-6 h-6" />}
              {scanBanner.type === 'error' && <AlertCircle className="w-6 h-6" />}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm tracking-wide flex items-center justify-between">
                <span>{scanBanner.title}</span>
              </h4>
              <p className="text-xs mt-1 font-medium leading-relaxed opacity-95">
                {scanBanner.mensagem}
              </p>
              {scanBanner.detalhes && (
                <p className="text-[11px] mt-1 opacity-75 font-mono">
                  {scanBanner.detalhes}
                </p>
              )}
            </div>

            <button 
              onClick={() => setScanBanner(null)} 
              className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sidebar 010 Distribuidora */}
      <Sidebar010
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notificacoesNaoLidas={notificacoesNaoLidas}
        contasAbertasCount={contasComandas.filter(c => c.status === 'ABERTA').length}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header 010 Distribuidora */}
        <Header010
          activeTab={activeTab}
          isOnline={isOnline}
          isSynced={isSynced}
          notificacoesNaoLidas={notificacoesNaoLidas}
          userSession={userSession}
          onNavigate={setActiveTab}
          onLogout={async () => {
            if (userSession) {
              registarLog('Logout', userSession.username, 'Sessão encerrada pelo usuário');
            }
            try { await supabase.auth.signOut(); } catch(e) {}
            try { localStorage.removeItem('010_user_session'); } catch(e) {}
            try { sessionStorage.removeItem('010_db_signatures'); } catch(e) {}
            try { sessionStorage.removeItem('010_egress_monitor_metrics'); } catch(e) {}
            try { await idbCache.clearAll(); } catch(e) {}
            setUserSession(null);
            setVendas([]);
            setCaixas([]);
            setContasComandas([]);
            setContasReceber([]);
            setMovimentacoes([]);
            setCarrinho([]);
          }}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenBarcodeScanner={() => setShowCameraScannerModal(true)}
        />

        {/* View Switcher das Páginas */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard010
              produtos={produtos}
              vendas={vendas}
              caixas={caixas}
              contasReceber={contasReceber}
              isOnline={isOnline}
              isSynced={isSynced}
              onNavigate={setActiveTab}
              onOpenNovaVenda={() => setActiveTab('pdv')}
              onOpenCadastrarProduto={() => setActiveTab('produtos')}
              onOpenEntradaEstoque={() => setActiveTab('estoque')}
              onOpenAbrirCaixa={() => setActiveTab('caixa')}
            />
          )}

          {activeTab === 'pdv' && (
            <Pdv010
              produtos={produtos}
              vendas={vendas}
              caixas={caixas}
              onFinalizarVenda={handleFinalizarVenda}
              usuarioAtual={userSession.username}
              isCaixaAberto={caixas.some(c => c.status === 'Aberto')}
              onNavigateCaixa={() => setActiveTab('caixa')}
              carrinho={carrinho}
              setCarrinho={setCarrinho}
              comandaEmFinalizacao={comandaEmFinalizacao}
              onCancelarComandaFinalizacao={handleCancelarComandaFinalizacao}
              termoBipado={termoBipadoParaPdv}
              onLimparTermoBipado={() => setTermoBipadoParaPdv('')}
            />
          )}

          {activeTab === 'contas' && (
            <Contas010
              contas={contasComandas}
              produtos={produtos}
              usuarioAtual={userSession.username}
              isCaixaAberto={caixas.some(c => c.status === 'Aberto')}
              onCriarConta={handleCriarConta}
              onAdicionarItemConta={handleAdicionarItemConta}
              onAlterarQuantidadeItem={handleAlterarQuantidadeItem}
              onRemoverItemConta={handleRemoverItemConta}
              onEncaminharParaPdv={handleEncaminharComandaParaPdv}
              onPagarConta={handlePagarContaComanda}
              onEncerrarApagarConta={handleEncerrarApagarConta}
            />
          )}

          {activeTab === 'produtos' && (
            <Produtos010
              produtos={produtos}
              onAddProduto={handleAddProduto}
              onUpdateProduto={handleUpdateProduto}
              onDeleteProduto={handleDeleteProduto}
              onRecarregarProdutos={handleRecarregarProdutos}
            />
          )}

          {activeTab === 'estoque' && (
            <Estoque010
              produtos={produtos}
              movimentacoes={movimentacoes}
              onRegistrarMovimentacao={handleRegistrarMovimentacaoEstoque}
              usuarioAtual={userSession.username}
              onAddProduto={handleAddProduto}
              onUpdateProduto={handleUpdateProduto}
              onOpenImportarNFe={() => setShowImportarNFeModal(true)}
            />
          )}

          {activeTab === 'financeiro' && (
            <Financeiro010
              vendas={vendas}
              caixas={caixas}
              contasReceber={contasReceber}
              comprasEstoque={comprasEstoque}
              onDarBaixaConta={handleDarBaixaConta}
              onAdicionarConta={handleAdicionarConta}
              onOpenImportarNFe={() => setShowImportarNFeModal(true)}
            />
          )}

          {activeTab === 'caixa' && (
            <CaixaPage010
              caixas={caixas}
              vendas={vendas}
              onAbrirCaixa={handleAbrirCaixa}
              onFecharCaixa={handleFecharCaixa}
              onAdicionarEntradaDespesa={handleAdicionarEntradaDespesa}
              onCancelarVenda={handleCancelarVenda}
              onExcluirVenda={handleExcluirVenda}
              usuarioAtual={userSession.username}
            />
          )}

          {activeTab === 'relatorios' && (
            <Relatorios010 
              vendas={vendas}
              produtos={produtos}
            />
          )}

          {activeTab === 'fiscais' && (
            <Configuracoes010
              configEmpresa={configEmpresa}
              onSalvarEmpresa={(c) => {
                setConfigEmpresa(c);
                registarLog('Configuração alterada', 'Dados da empresa', 'Alteração nos dados da empresa');
              }}
              notificacoes={notificacoes}
              onMarcarNotificacaoLida={handleMarcarNotificacaoLida}
              onLimparNotificacoes={handleLimparNotificacoes}
              auditLogs={auditLogs}
              vendas={vendas}
              onCancelarVenda={handleCancelarVenda}
              initialSubTab="fiscais"
            />
          )}

          {activeTab === 'historico' && (
            <Configuracoes010
              configEmpresa={configEmpresa}
              onSalvarEmpresa={(c) => {
                setConfigEmpresa(c);
                registarLog('Configuração alterada', 'Dados da empresa', 'Alteração nos dados da empresa');
              }}
              notificacoes={notificacoes}
              onMarcarNotificacaoLida={handleMarcarNotificacaoLida}
              onLimparNotificacoes={handleLimparNotificacoes}
              auditLogs={auditLogs}
              vendas={vendas}
              onCancelarVenda={handleCancelarVenda}
              initialSubTab="historico"
            />
          )}

          {activeTab === 'notificacoes' && (
            <Configuracoes010
              configEmpresa={configEmpresa}
              onSalvarEmpresa={(c) => {
                setConfigEmpresa(c);
                registarLog('Configuração alterada', 'Dados da empresa', 'Alteração nos dados da empresa');
              }}
              notificacoes={notificacoes}
              onMarcarNotificacaoLida={handleMarcarNotificacaoLida}
              onLimparNotificacoes={handleLimparNotificacoes}
              auditLogs={auditLogs}
              vendas={vendas}
              onCancelarVenda={handleCancelarVenda}
              initialSubTab="notificacoes"
            />
          )}

          {activeTab === 'configuracoes' && (
            <Configuracoes010
              configEmpresa={configEmpresa}
              onSalvarEmpresa={(c) => {
                setConfigEmpresa(c);
                registarLog('Configuração alterada', 'Dados da empresa', 'Alteração nos dados da empresa');
              }}
              notificacoes={notificacoes}
              onMarcarNotificacaoLida={handleMarcarNotificacaoLida}
              onLimparNotificacoes={handleLimparNotificacoes}
              auditLogs={auditLogs}
              vendas={vendas}
              onCancelarVenda={handleCancelarVenda}
              initialSubTab="empresa"
            />
          )}
        </main>
      </div>

      {/* Modal de Importação de Notas Fiscais (NF-e XML) */}
      <ImportadorNFeModal
        isOpen={showImportarNFeModal}
        onClose={() => setShowImportarNFeModal(false)}
        produtosAtuais={produtos}
        usuarioAtual={userSession?.username || 'admin'}
        onConfirmarImportacao={handleConfirmarImportacaoNFe}
      />

      {/* Modal de Leitura de Código de Barras via Câmera do Celular */}
      <CameraBarcodeModal
        isOpen={showCameraScannerModal}
        onClose={() => setShowCameraScannerModal(false)}
        produtos={produtos}
        onScan={(barcode) => {
          setShowCameraScannerModal(false);
          processarBipagemGlobal(barcode);
        }}
      />
    </div>
  );
}

export default App;
