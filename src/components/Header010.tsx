import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Wifi, 
  WifiOff, 
  LogOut, 
  Menu,
  UserCheck,
  Sun,
  Moon,
  Users,
  KeyRound,
  X,
  Lock,
  ShieldCheck,
  AlertCircle,
  Camera,
  Palette,
  Droplets,
  Check,
  ChevronDown
} from 'lucide-react';
import { ModuleTab, UserSession } from '../types/010types';
import { supabase } from '../lib/supabase';

interface Header010Props {
  activeTab: ModuleTab;
  isOnline: boolean;
  isSynced: boolean;
  notificacoesNaoLidas: number;
  userSession: UserSession | null;
  isCaixaAberto?: boolean;
  onOpenAbrirCaixa?: () => void;
  onNavigate: (tab: ModuleTab) => void;
  onLogout: () => void;
  onSwitchUser?: (session: UserSession) => void;
  onOpenMobileMenu: () => void;
  onOpenBarcodeScanner?: () => void;
}

export const Header010: React.FC<Header010Props> = ({
  activeTab,
  isOnline,
  userSession,
  onNavigate,
  onLogout,
  onSwitchUser,
  onOpenMobileMenu,
  onOpenBarcodeScanner
}) => {
  // Theme state: 'escuro' | 'claro' | 'azul'
  const [tema, setTema] = useState<'escuro' | 'claro' | 'azul'>(() => {
    try {
      const saved = localStorage.getItem('010_config_sistema');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tema === 'azul') return 'azul';
        if (parsed.tema === 'claro') return 'claro';
      }
    } catch(e) {}
    return 'escuro';
  });

  // Modais de Troca de Usuário
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown de temas ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element | null;
      if (
        themeMenuRef.current && 
        !themeMenuRef.current.contains(target as Node) &&
        !target?.closest?.('.portal-theme-menu')
      ) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sincronizar com alterações em outras telas (ex: tela de Configurações)
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('010_config_sistema');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.tema && parsed.tema !== tema) {
            setTema(parsed.tema);
          }
        }
      } catch(e) {}
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('theme-changed', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('theme-changed', handleSync);
    };
  }, [tema]);

  // Aplica tema ao carregar / alterar
  useEffect(() => {
    try {
      const saved = localStorage.getItem('010_config_sistema');
      let configObj = saved ? JSON.parse(saved) : {};
      configObj.tema = tema;
      localStorage.setItem('010_config_sistema', JSON.stringify(configObj));
    } catch(e) {}

    document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-blue');
    if (tema === 'azul') {
      document.documentElement.classList.add('theme-blue');
    } else if (tema === 'claro') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.add('theme-dark');
    }

    window.dispatchEvent(new Event('theme-changed'));
  }, [tema]);

  const selectTema = (novoTema: 'escuro' | 'claro' | 'azul') => {
    try {
      const saved = localStorage.getItem('010_config_sistema');
      let configObj = saved ? JSON.parse(saved) : {};
      configObj.tema = novoTema;
      localStorage.setItem('010_config_sistema', JSON.stringify(configObj));
    } catch(e) {}

    document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-blue');
    if (novoTema === 'azul') {
      document.documentElement.classList.add('theme-blue');
    } else if (novoTema === 'claro') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.add('theme-dark');
    }

    setTema(novoTema);
    setShowThemeMenu(false);
    window.dispatchEvent(new Event('theme-changed'));
  };

  const toggleNextTema = () => {
    const proximo = tema === 'escuro' ? 'azul' : (tema === 'azul' ? 'claro' : 'escuro');
    selectTema(proximo);
  };

  const getTitle = (tab: ModuleTab) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard';
      case 'pdv': return 'PDV (Vendas)';
      case 'contas': return 'Contas e Comandas';
      case 'produtos': return 'Produtos';
      case 'estoque': return 'Estoque';
      case 'financeiro': return 'Financeiro';
      case 'caixa': return 'Caixa';
      case 'relatorios': return 'Relatórios';
      case 'fiscais': return 'Doc. Fiscais';
      case 'historico': return 'Histórico';
      case 'notificacoes': return 'Notificações';
      case 'configuracoes': return 'Configurações';
    }
  };

  // Buscar lista de usuários cadastrados (Dono e Caixa)
  const getUsuariosCadastrados = () => {
    let list = [
      { id: 'u-dono', nome: 'Dono', username: 'admin', role: 'Dono', pin: '2026', isOwner: true },
      { id: 'u-caixa', nome: 'Caixa', username: 'caixa', role: 'Funcionário', pin: '1234', isOwner: false }
    ];

    try {
      const saved = localStorage.getItem('010_usuarios_pdv');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((u: any) => u.username !== 'leticia' && u.nome?.toLowerCase() !== 'leticia');
          if (filtered.length > 0) {
            list = filtered.map((u: any) => ({
              ...u,
              pin: u.isOwner || u.role === 'Dono' ? '2026' : '1234'
            }));
          }
        }
      }
    } catch(e) {}

    return list;
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setPinInput('');
    setPinError('');
  };

  const handleConfirmPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const isOwner = selectedUser.isOwner || selectedUser.role === 'Dono' || selectedUser.username === 'admin' || selectedUser.nome === 'Dono';
    const targetEmail = isOwner ? 'dono@distribuidora.com' : 'caixa@distribuidora.com';
    const targetPassword = pinInput.length === 4 
      ? (isOwner ? '202600' : '123400') 
      : pinInput;

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword
      });

      if (authError) {
        // Fallback resiliente para novo Supabase caso usuários ainda não estejam no Auth
        const validPinDono = isOwner && (pinInput === '2026' || pinInput === '202600');
        const validPinCaixa = !isOwner && (pinInput === '1234' || pinInput === '123400');

        if (validPinDono || validPinCaixa) {
          const newSession: UserSession = {
            username: isOwner ? 'Dono' : (selectedUser.nome || 'Caixa'),
            email: targetEmail,
            userId: `local-${selectedUser.username || 'user'}`,
            role: isOwner ? 'Administrador' : 'Operador',
            isAuthenticated: true
          };
          try {
            localStorage.setItem('010_user_session', JSON.stringify(newSession));
          } catch(e) {}
          if (onSwitchUser) {
            onSwitchUser(newSession);
          } else {
            window.location.reload();
          }
          setShowSwitchModal(false);
          setSelectedUser(null);
          setPinInput('');
          return;
        }

        setPinError(`PIN / Senha incorretos para ${selectedUser.nome}!`);
        return;
      }

      if (data?.user) {
        const user = data.user;
        const metadata = user.user_metadata || {};
        const isOwnerOrAdmin = metadata.role === 'Administrador' || metadata.role === 'Dono' || targetEmail.includes('dono');

        const newSession: UserSession = {
          username: isOwnerOrAdmin ? 'Dono' : 'Caixa',
          email: user.email,
          userId: user.id,
          role: isOwnerOrAdmin ? 'Administrador' : 'Operador',
          isAuthenticated: true
        };

        try {
          localStorage.setItem('010_user_session', JSON.stringify(newSession));
        } catch(e) {}

        if (onSwitchUser) {
          onSwitchUser(newSession);
        } else {
          window.location.reload();
        }

        setShowSwitchModal(false);
        setSelectedUser(null);
        setPinInput('');
      }
    } catch (err: any) {
      setPinError('Erro ao alternar usuário. Tente novamente.');
    }
  };

  return (
    <header className="bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-3 lg:px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 transition-colors w-full gap-2">
      {/* Esquerda: Botão Menu Mobile + Título do Módulo */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl transition-colors shrink-0"
          title="Abrir Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={() => onNavigate(activeTab)}
          className="text-left font-black text-zinc-100 text-lg sm:text-xl tracking-tight hover:text-orange-500 transition-colors flex items-center gap-2 truncate"
        >
          <span className="truncate">{getTitle(activeTab)}</span>
        </button>
      </div>

      {/* Direita: Troca Tema + Indicador Online Estático + Botão Trocar Usuário */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Botão Seletor de Cores do Sistema (Azul Claro, Escuro, Claro) */}
        <div className="relative shrink-0 flex items-center bg-zinc-800 hover:bg-zinc-700/80 rounded-xl border border-zinc-700/60 shadow-sm transition-all overflow-hidden" ref={themeMenuRef}>
          <button
            type="button"
            onClick={toggleNextTema}
            className="p-2 sm:px-3 sm:py-2 text-zinc-100 flex items-center gap-1.5 shrink-0 group hover:text-white"
            title="Clique para alternar o tema instantaneamente (Azul Claro, Escuro, Claro)"
          >
            <Palette className="w-4 h-4 text-blue-400 group-hover:rotate-12 transition-transform shrink-0" />
            <span className="text-[10px] font-bold hidden sm:inline">
              {tema === 'azul' ? 'Azul Claro' : (tema === 'claro' ? 'Modo Claro' : 'Modo Escuro')}
            </span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              tema === 'azul' ? 'bg-blue-500 shadow-sm shadow-blue-400' : (tema === 'claro' ? 'bg-amber-400 shadow-sm shadow-amber-300' : 'bg-orange-500 shadow-sm shadow-orange-400')
            }`} />
          </button>

          <button
            type="button"
            onClick={() => setShowThemeMenu(prev => !prev)}
            className="p-2 sm:px-2 sm:py-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/90 border-l border-zinc-700/60 transition-colors"
            title="Abrir menu de opções de cores"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showThemeMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Menu Dropdown de Cores via Portal (Fica 100% no topo, nunca atrás do Dashboard) */}
          {showThemeMenu && createPortal(
            <div 
              className="fixed inset-0 z-[99999] flex justify-end items-start pt-14 pr-3 sm:pr-6 md:pr-10 bg-black/20 backdrop-blur-[1px]"
              onClick={() => setShowThemeMenu(false)}
            >
              <div 
                className="portal-theme-menu w-72 bg-zinc-900 border-2 border-zinc-700 rounded-3xl shadow-2xl p-3 flex flex-col gap-2 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 text-zinc-100"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-zinc-200">
                    <Palette className="w-3.5 h-3.5 text-blue-400" />
                    <span>Cores do Sistema</span>
                  </div>
                  <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-bold">Opcional</span>
                </div>

                {/* Opção 1: Modo Azul Claro */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    selectTema('azul');
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectTema('azul');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all ${
                    tema === 'azul'
                      ? 'bg-blue-600/25 border-2 border-blue-500 text-blue-400 font-black shadow-lg shadow-blue-500/10'
                      : 'hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30 shrink-0">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                        <span>Azul Claro</span>
                        <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-bold">Novo</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Fundo azul suave & detalhes em azul</div>
                    </div>
                  </div>
                  {tema === 'azul' && <Check className="w-5 h-5 text-blue-400 shrink-0" />}
                </button>

                {/* Opção 2: Modo Escuro (Padrão) */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    selectTema('escuro');
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectTema('escuro');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all ${
                    tema === 'escuro'
                      ? 'bg-orange-500/25 border-2 border-orange-500 text-orange-400 font-black shadow-lg shadow-orange-500/10'
                      : 'hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 shadow-md shrink-0">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">Modo Escuro</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Padrão Azul Escuro & Celeste</div>
                    </div>
                  </div>
                  {tema === 'escuro' && <Check className="w-5 h-5 text-orange-400 shrink-0" />}
                </button>

                {/* Opção 3: Modo Claro (Branco) */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    selectTema('claro');
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectTema('claro');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all ${
                    tema === 'claro'
                      ? 'bg-amber-500/25 border-2 border-amber-500 text-amber-400 font-black shadow-lg shadow-amber-500/10'
                      : 'hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center text-zinc-950 shadow-md shadow-amber-400/30 shrink-0">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">Modo Claro</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Fundo Branco & Azul Claro</div>
                    </div>
                  </div>
                  {tema === 'claro' && <Check className="w-5 h-5 text-amber-400 shrink-0" />}
                </button>
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Botão Abrir Câmera do Celular para Ler Código de Barras (ao lado do Modo Branco) */}
        {onOpenBarcodeScanner && (
          <button
            onClick={onOpenBarcodeScanner}
            className="p-2 sm:px-3 sm:py-2 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-zinc-950 rounded-xl transition-all border border-orange-500/30 shadow-sm flex items-center gap-1.5 shrink-0 font-bold group"
            title="Abrir Câmera do Celular para Ler Código de Barras"
          >
            <Camera className="w-4 h-4 text-orange-400 group-hover:text-zinc-950 transition-colors shrink-0" />
            <span className="text-[10px] font-bold hidden sm:inline text-zinc-200 group-hover:text-zinc-950">Ler Código</span>
          </button>
        )}

        {/* Indicador de Sistema Online 100% ESTÁTICO (Sem Animações) */}
        <div 
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-black border transition-all shrink-0 ${
            isOnline
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
          title={isOnline ? "Sistema Online & Conectado" : "Sistema Offline"}
        >
          {/* Ponto estático sem animate-ping / animate-pulse */}
          <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          {isOnline ? <Wifi className="w-3.5 h-3.5 shrink-0" /> : <WifiOff className="w-3.5 h-3.5 shrink-0" />}
          <span className="hidden md:inline uppercase text-[10px] tracking-wider">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Botão Usuário Ativo -> Sempre 100% Visível e Alinhado na Tela */}
        <button
          onClick={() => {
            setShowSwitchModal(true);
            setSelectedUser(null);
            setPinError('');
            setPinInput('');
          }}
          className="px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500 hover:text-zinc-950 text-orange-400 border border-orange-500/30 rounded-xl transition-all flex items-center gap-1.5 group shadow-sm shrink-0 font-bold"
          title="Selecionar / Trocar Usuário do Sistema"
        >
          <UserCheck className="w-4 h-4 text-orange-400 group-hover:text-zinc-950 transition-colors shrink-0" />
          <span className="text-xs font-black max-w-[80px] sm:max-w-[140px] truncate">{userSession?.username || 'Usuário'}</span>
        </button>
      </div>

      {/* MODAL TROCAR DE USUÁRIO / PIN (Renderizado via Portal no document.body para ficar 100% centralizado) */}
      {showSwitchModal && createPortal(
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative text-zinc-100">
            <button
              onClick={() => setShowSwitchModal(false)}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-zinc-100 text-base">Alternar Conta de Usuário</h3>
                <p className="text-xs text-zinc-400">Usuário atual: <strong className="text-orange-400">{userSession?.username}</strong></p>
              </div>
            </div>

            {pinError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2 font-bold animate-bounce">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {/* Passo 1: Selecionar Usuário */}
            {!selectedUser ? (
              <div className="space-y-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Selecione o Usuário:</span>
                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {getUsuariosCadastrados().map((u) => {
                    const isCurrent = (userSession?.username || '').toLowerCase() === (u.nome || '').toLowerCase();
                    const isOwner = u.isOwner || u.role === 'Dono' || u.username === 'admin';

                    return (
                      <button
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all group ${
                          isCurrent 
                            ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 ring-1 ring-orange-500/30'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black uppercase text-sm ${
                            isOwner ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-zinc-800 text-zinc-300'
                          }`}>
                            {u.nome.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-sm text-zinc-100 group-hover:text-orange-400 transition-colors">
                              {u.nome}
                            </div>
                            <span className="text-[11px] text-zinc-400 font-semibold">
                              {isOwner ? '👑 Administrador / Dono' : '💼 Operador de Caixa'}
                            </span>
                          </div>
                        </div>

                        {isCurrent && (
                          <span className="text-[10px] font-black uppercase bg-orange-500 text-zinc-950 px-2 py-0.5 rounded-md">
                            Ativo
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                  <button
                    onClick={onLogout}
                    className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold rounded-xl text-xs flex items-center gap-2 transition-all w-full justify-center"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair do Sistema (Encerrar Sessão)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Passo 2: Digitar PIN do Usuário Selecionado */
              <form onSubmit={handleConfirmPin} className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center font-black uppercase text-xs">
                      {selectedUser.nome.charAt(0)}
                    </div>
                    <div>
                      <div className="font-black text-xs text-zinc-100">{selectedUser.nome}</div>
                      <div className="text-[10px] text-zinc-400 font-medium">Digite o PIN para acessar esta conta</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="text-xs font-bold text-orange-400 hover:underline"
                  >
                    Trocar
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">PIN / Senha</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      required
                      placeholder="••••"
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                        setPinError('');
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-lg tracking-[0.5em] font-mono text-center text-orange-500 font-bold focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Entrar na Conta</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
