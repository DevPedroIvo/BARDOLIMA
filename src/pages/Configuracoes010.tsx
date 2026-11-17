import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  Monitor, 
  Users, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  Save, 
  Bell, 
  History, 
  Plus, 
  X, 
  ShieldCheck, 
  Trash2,
  Sun,
  Moon,
  Printer,
  Volume2,
  Sliders,
  Sparkles,
  Check,
  Database,
  Key,
  Download,
  Upload,
  Droplets,
  Palette
} from 'lucide-react';
import { ConfigEmpresa, Notificacao010, AuditLog010, Venda010 } from '../types/010types';
import { Notificacoes010 } from './Notificacoes010';
import { Fiscais010 } from './Fiscais010';
import { Historico010 } from './Historico010';
import { EgressMonitorCard } from '../components/EgressMonitorCard';

export interface ConfigSistema {
  tema: 'escuro' | 'claro' | 'azul';
  formatoImpressao: '80mm' | '58mm' | 'A4' | 'SemImpressao';
  impressaoAutomatica: 'sim' | 'nao' | 'perguntar';
  incluirDadosEmpresaRecibo: boolean;
  mensagemRodapeRecibo: string;
  somBipador: boolean;
  focoAutomaticoBipador: boolean;
  confirmarCancelamentoVenda: boolean;
  permitirVendaSemEstoque: boolean;
  exibirAtalhos: boolean;
}

export interface PermissoesUsuario {
  dashboard: boolean;
  pdv: boolean;
  caixa: boolean;
  produtos: boolean;
  estoque: boolean;
  financeiro: boolean;
  configuracoes: boolean;
}

export interface UsuarioPDV {
  id: string;
  nome: string;
  username: string;
  role: 'Dono' | 'Funcionário';
  isOwner: boolean;
  cadastradoEm: string;
  permissoes: PermissoesUsuario;
}

interface Configuracoes010Props {
  configEmpresa: ConfigEmpresa;
  onSalvarEmpresa: (config: ConfigEmpresa) => void;
  notificacoes?: Notificacao010[];
  onMarcarNotificacaoLida?: (id: string) => void;
  onLimparNotificacoes?: () => void;
  auditLogs?: AuditLog010[];
  vendas?: Venda010[];
  onCancelarVenda?: (vendaId: string) => void;
  initialSubTab?: 'empresa' | 'sistema' | 'usuarios' | 'backup' | 'notificacoes' | 'fiscais' | 'historico';
}

export const Configuracoes010: React.FC<Configuracoes010Props> = ({
  configEmpresa,
  onSalvarEmpresa,
  notificacoes = [],
  onMarcarNotificacaoLida = () => {},
  onLimparNotificacoes = () => {},
  auditLogs = [],
  vendas = [],
  onCancelarVenda,
  initialSubTab = 'empresa'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'empresa' | 'sistema' | 'usuarios' | 'backup' | 'notificacoes' | 'fiscais' | 'historico'
  >(initialSubTab);

  const [empresaForm, setEmpresaForm] = useState<ConfigEmpresa>(configEmpresa);
  const [savedMsg, setSavedMsg] = useState(false);

  // Configurações do Sistema & Tema (Escuro / Claro)
  const defaultConfigSistema: ConfigSistema = {
    tema: 'escuro',
    formatoImpressao: '80mm',
    impressaoAutomatica: 'perguntar',
    incluirDadosEmpresaRecibo: true,
    mensagemRodapeRecibo: 'Obrigado pela preferência! Volte sempre.',
    somBipador: true,
    focoAutomaticoBipador: true,
    confirmarCancelamentoVenda: true,
    permitirVendaSemEstoque: false,
    exibirAtalhos: true,
  };

  const [configSistema, setConfigSistema] = useState<ConfigSistema>(() => {
    try {
      const saved = localStorage.getItem('010_config_sistema');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return defaultConfigSistema;
  });

  useEffect(() => {
    try {
      localStorage.setItem('010_config_sistema', JSON.stringify(configSistema));
    } catch(e) {}

    document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-blue');
    if (configSistema.tema === 'azul') {
      document.documentElement.classList.add('theme-blue');
    } else if (configSistema.tema === 'claro') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.add('theme-dark');
    }

    window.dispatchEvent(new Event('theme-changed'));
  }, [configSistema]);

  // Sincronizar quando tema for alterado pelo Header
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('010_config_sistema');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.tema && parsed.tema !== configSistema.tema) {
            setConfigSistema(prev => ({ ...prev, tema: parsed.tema }));
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
  }, [configSistema.tema]);

  // Supabase Credentials State & Form
  const [supaUrlInput, setSupaUrlInput] = useState(() => {
    const saved = localStorage.getItem('distribuidora_supabase_url') || '';
    if (saved.includes('vyfzhviihklhbuuawsxx') || saved.includes('eqjmdbykfxnvoyypkmnl')) {
      localStorage.removeItem('distribuidora_supabase_url');
      return 'https://ddncstcdmmdyukuvfvav.supabase.co';
    }
    return saved || 'https://ddncstcdmmdyukuvfvav.supabase.co';
  });

  const [supaKeyInput, setSupaKeyInput] = useState(() => {
    const saved = (localStorage.getItem('distribuidora_supabase_anon_key') || '').trim();
    if (saved.toLowerCase().includes('secret')) {
      localStorage.removeItem('distribuidora_supabase_anon_key');
      return (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    }
    return saved || (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  });

  const [supaSaveMsg, setSupaSaveMsg] = useState(false);

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('distribuidora_supabase_url', supaUrlInput.trim());
    localStorage.setItem('distribuidora_supabase_anon_key', supaKeyInput.trim());
    setSupaSaveMsg(true);
    setTimeout(() => {
      setSupaSaveMsg(false);
      window.location.reload();
    }, 1500);
  };

  // Lista de Usuários com Persistência (Apenas ADM e Caixa)
  const defaultUsuarios: UsuarioPDV[] = [
    {
      id: 'u-adm',
      nome: 'ADM',
      username: 'adm',
      role: 'Dono',
      isOwner: true,
      cadastradoEm: '10/01/2026',
      permissoes: {
        dashboard: true,
        pdv: true,
        caixa: true,
        produtos: true,
        estoque: true,
        financeiro: true,
        configuracoes: true
      }
    },
    {
      id: 'u-caixa',
      nome: 'Caixa',
      username: 'caixa',
      role: 'Funcionário',
      isOwner: false,
      cadastradoEm: '29/04/2026',
      permissoes: {
        dashboard: true,
        pdv: true,
        caixa: true,
        produtos: true,
        estoque: true,
        financeiro: true,
        configuracoes: true
      }
    }
  ];

  const [usuariosList, setUsuariosList] = useState<UsuarioPDV[]>(() => {
    try {
      const saved = localStorage.getItem('010_usuarios_pdv');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed
            .filter((u: any) => u.username !== 'leticia' && u.nome?.toLowerCase() !== 'leticia')
            .map((u: any) => {
              const isOwn = u.isOwner || u.role === 'Dono' || u.username === 'admin' || u.username === 'adm' || u.nome === 'Dono' || u.nome === 'ADM';
              return isOwn ? { ...u, nome: 'ADM', username: 'adm' } : u;
            });
          if (filtered.length > 0) return filtered;
        }
      }
    } catch(e) {}
    return defaultUsuarios;
  });

  useEffect(() => {
    try {
      localStorage.setItem('010_usuarios_pdv', JSON.stringify(usuariosList));
    } catch(e) {}
  }, [usuariosList]);

  // Modais e Form de Novo Usuário
  const [showAddModal, setShowAddModal] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoCargo, setNovoCargo] = useState<'Funcionário' | 'Dono'>('Funcionário');

  const handleTogglePermissao = (usuarioId: string, abaKey: keyof PermissoesUsuario) => {
    setUsuariosList(prev => prev.map(u => {
      if (u.id === usuarioId && !u.isOwner) {
        return {
          ...u,
          permissoes: {
            ...u.permissoes,
            [abaKey]: !u.permissoes[abaKey]
          }
        };
      }
      return u;
    }));
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    const novoUser: UsuarioPDV = {
      id: `u-${Date.now()}`,
      nome: novoNome.trim(),
      username: novoNome.toLowerCase().trim().replace(/\s+/g, ''),
      role: novoCargo,
      isOwner: novoCargo === 'Dono',
      cadastradoEm: new Date().toLocaleDateString('pt-BR'),
      permissoes: {
        dashboard: true,
        pdv: true,
        caixa: true,
        produtos: true,
        estoque: true,
        financeiro: novoCargo === 'Dono',
        configuracoes: novoCargo === 'Dono'
      }
    };

    setUsuariosList(prev => [...prev, novoUser]);
    setShowAddModal(false);
    setNovoNome('');
  };

  const handleDeleteUser = (id: string) => {
    setUsuariosList(prev => prev.filter(u => u.id !== id || u.isOwner));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSalvarEmpresa(empresaForm);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;

  const renderUsuariosSection = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header Usuários do Sistema */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-3">
        <div>
          <h3 className="font-black text-zinc-100 text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            <span>Usuários do sistema</span>
          </h3>
          <p className="text-xs text-zinc-400 font-medium">Quem tem acesso a este PDV</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-full text-xs font-black">
            {usuariosList.length} usuários cadastrados
          </span>
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="space-y-4">
        {usuariosList.map((user) => {
          const isDono = user.isOwner || user.role === 'Dono';

          return (
            <div key={user.id} className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-5 space-y-4 shadow-md">
              {/* Header de cada usuário */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base uppercase shrink-0 ${
                    isDono ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                  }`}>
                    {user.nome.charAt(0)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-zinc-100 text-base">{user.nome}</span>
                      {isDono ? (
                        <>
                          <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md text-[10px] font-black">
                            Você
                          </span>
                          <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-md text-[10px] font-black">
                            Dono
                          </span>
                        </>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-md text-[10px] font-black">
                          Funcionário
                        </span>
                      )}
                    </div>
                    {!isDono && (
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                        Cadastrado em <strong className="text-zinc-300">{user.cadastradoEm}</strong>
                      </p>
                    )}
                  </div>
                </div>

                {!isDono && (
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Excluir usuário"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Permissões de Acesso às Abas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-400 block uppercase tracking-wider text-[11px]">Acesso às abas</span>
                  {!isDono && (
                    <span className="text-[10px] text-zinc-500 font-medium">Use os comutadores para escolher Sim ou Não</span>
                  )}
                </div>

                {isDono ? (
                  <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Administrador — acesso total a todas as abas.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {[
                      { key: 'dashboard', label: 'Dashboard', icon: '📊' },
                      { key: 'pdv', label: 'Vendas (PDV)', icon: '🛒' },
                      { key: 'caixa', label: 'Caixa', icon: '🏦' },
                      { key: 'produtos', label: 'Produtos', icon: '📦' },
                      { key: 'estoque', label: 'Estoque', icon: '📦' },
                      { key: 'financeiro', label: 'Financeiro', icon: '💰' },
                      { key: 'configuracoes', label: 'Configurações', icon: '⚙️' },
                    ].map((aba) => {
                      const isPermitted = user.permissoes[aba.key as keyof PermissoesUsuario];
                      return (
                        <div
                          key={aba.key}
                          className="flex items-center justify-between p-3 bg-zinc-900/80 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-all"
                        >
                          <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                            <span>{aba.icon}</span>
                            <span>{aba.label}</span>
                          </span>

                          {/* Toggle Switch Sim / Não */}
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase ${isPermitted ? 'text-emerald-400' : 'text-zinc-500'}`}>
                              {isPermitted ? 'Sim' : 'Não'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleTogglePermissao(user.id, aba.key as keyof PermissoesUsuario)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isPermitted ? 'bg-orange-500' : 'bg-zinc-800'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                                  isPermitted ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-in fade-in duration-150">
      <div>
        <h1 className="text-xl font-black text-zinc-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-orange-500" />
          <span>Configurações & Painel Administrativo</span>
        </h1>
        <p className="text-xs text-zinc-400">Dados da empresa, usuários, notificações, documentos fiscais e preferências</p>
      </div>

      {/* Navegação entre as Abas de Configurações */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2 flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: 'empresa', label: 'Empresa', icon: Building2 },
          { id: 'notificacoes', label: 'Notificações', icon: Bell, badge: notificacoesNaoLidas },
          { id: 'fiscais', label: 'Doc. Fiscais', icon: FileText },
          { id: 'historico', label: 'Histórico & Logs', icon: History },
          { id: 'sistema', label: 'Sistema & Impressão', icon: Monitor },
          { id: 'usuarios', label: 'Usuários & Permissões', icon: Users },
          { id: 'backup', label: 'Backup & Sync', icon: RefreshCw },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap relative ${
                isActive
                  ? 'bg-orange-500 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 bg-orange-500 text-zinc-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {savedMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2 font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configurações salvas com sucesso!</span>
        </div>
      )}

      {/* Conteúdo Aba Empresa */}
      {/* Conteúdo Aba Empresa (Dados da Empresa, Notificações da Empresa & Recibos) */}
      {activeSubTab === 'empresa' && (
        <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
          {/* CARD 1: DADOS CADASTRAIS DA EMPRESA */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="font-black text-zinc-100 text-base border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-500" />
              <span>Dados Cadastrais da Empresa</span>
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Nome Fantasia da Distribuidora</label>
                <input
                  type="text"
                  required
                  value={empresaForm.nome}
                  onChange={(e) => setEmpresaForm({ ...empresaForm, nome: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={empresaForm.cnpj}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, cnpj: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={empresaForm.telefone}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, telefone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={empresaForm.endereco}
                  onChange={(e) => setEmpresaForm({ ...empresaForm, endereco: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Dados da Empresa</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Conteúdo Aba Notificações */}
      {activeSubTab === 'notificacoes' && (
        <Notificacoes010
          notificacoes={notificacoes}
          onMarcarComoLida={onMarcarNotificacaoLida}
          onLimparTodas={onLimparNotificacoes}
        />
      )}

      {/* Conteúdo Aba Documentos Fiscais */}
      {activeSubTab === 'fiscais' && (
        <Fiscais010 />
      )}

      {/* Conteúdo Aba Histórico & Logs */}
      {activeSubTab === 'historico' && (
        <Historico010 logs={auditLogs} vendas={vendas} onCancelarVenda={onCancelarVenda} />
      )}

      {/* Conteúdo Aba Sistema */}
      {activeSubTab === 'sistema' && (
        <div className="space-y-6 max-w-4xl animate-in fade-in duration-150 text-xs">
          {/* PAINEL DE MONITORAMENTO DE EGRESS DO SUPABASE */}
          <EgressMonitorCard />
          {/* CARD 1: SELEÇÃO DE TEMA (ESCURO / CLARO) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-2">
              <div>
                <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-400" />
                  <span>Tema & Aparência do Sistema</span>
                </h3>
                <p className="text-xs text-zinc-400 font-medium">Selecione o tema de cores desejado para a interface do sistema (opcional e reversível)</p>
              </div>
              <div className="shrink-0">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                  configSistema.tema === 'azul'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : configSistema.tema === 'claro'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                }`}>
                  {configSistema.tema === 'azul' ? 'Modo Azul Ativo' : (configSistema.tema === 'claro' ? 'Modo Claro Ativo' : 'Modo Escuro Ativo')}
                </span>
              </div>
            </div>

            {/* Botões de Seleção de Tema: Azul Claro vs Escuro vs Claro */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Botão Modo Azul Claro */}
              <button
                type="button"
                onClick={() => setConfigSistema(prev => ({ ...prev, tema: 'azul' }))}
                className={`p-5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all relative overflow-hidden group ${
                  configSistema.tema === 'azul'
                    ? 'bg-blue-950/40 border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/20'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shrink-0">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-zinc-100 text-sm">Azul Claro</h4>
                      <p className="text-[11px] text-blue-400 font-bold">Fundo Suave & Azul</p>
                    </div>
                  </div>
                  {configSistema.tema === 'azul' && (
                    <span className="flex items-center gap-1 bg-blue-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase shadow-sm">
                      <Check className="w-3.5 h-3.5" />
                      <span>Ativo</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Fundo bem clarinho azul (#f0f7ff) com botões, cabeçalhos e painéis em tons azuis elegantes.
                </p>
              </button>

              {/* Botão Modo Escuro */}
              <button
                type="button"
                onClick={() => setConfigSistema(prev => ({ ...prev, tema: 'escuro' }))}
                className={`p-5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all relative overflow-hidden group ${
                  configSistema.tema === 'escuro'
                    ? 'bg-zinc-950 border-orange-500 shadow-xl shadow-orange-500/10 ring-2 ring-orange-500/20'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-orange-400 shrink-0">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-zinc-100 text-sm">Modo Escuro (Dark)</h4>
                      <p className="text-[11px] text-zinc-400 font-medium">Tons de Azul Escuro & Celeste</p>
                    </div>
                  </div>
                  {configSistema.tema === 'escuro' && (
                    <span className="flex items-center gap-1 bg-orange-500 text-zinc-950 px-2.5 py-1 rounded-full text-[10px] font-black uppercase shadow-sm">
                      <Check className="w-3.5 h-3.5" />
                      <span>Ativo</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tema padrão otimizado para distribuidoras e lojas com uso contínuo. Reduz a fadiga visual e destaca elementos críticos do PDV.
                </p>
              </button>

              {/* Botão Modo Claro */}
              <button
                type="button"
                onClick={() => setConfigSistema(prev => ({ ...prev, tema: 'claro' }))}
                className={`p-5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all relative overflow-hidden group ${
                  configSistema.tema === 'claro'
                    ? 'bg-zinc-800/90 border-amber-400 shadow-xl shadow-amber-400/10 ring-2 ring-amber-400/20'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-zinc-100 text-sm">Modo Claro (Light)</h4>
                      <p className="text-[11px] text-zinc-400 font-medium">Fundo Claro e Leve</p>
                    </div>
                  </div>
                  {configSistema.tema === 'claro' && (
                    <span className="flex items-center gap-1 bg-amber-400 text-zinc-950 px-2.5 py-1 rounded-full text-[10px] font-black uppercase shadow-sm">
                      <Check className="w-3.5 h-3.5" />
                      <span>Ativo</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Interface com fundo claro e contraste suave, ideal para escritórios bem iluminados e telas de atendimento externa.
                </p>
              </button>
            </div>
          </div>

          {/* CARD 2: PREFERÊNCIAS DE IMPRESSÃO & RECIBOS */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
                <Printer className="w-5 h-5 text-orange-500" />
                <span>Impressão & Comprovantes de Venda</span>
              </h3>
              <p className="text-xs text-zinc-400">Formato dos recibos térmicos e comportamento de impressão do PDV</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Formato do Recibo / Impressora</label>
                <select
                  value={configSistema.formatoImpressao}
                  onChange={(e) => setConfigSistema({ ...configSistema, formatoImpressao: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 font-bold focus:border-orange-500 outline-none"
                >
                  <option value="80mm">Bobina Térmica 80mm (Padrão PDV)</option>
                  <option value="58mm">Bobina Térmica 58mm (Mini Impressora)</option>
                  <option value="A4">Folha A4 / PDF (Relatório/Pedido)</option>
                  <option value="SemImpressao">Não Imprimir Recibo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Impressão Automática após Venda</label>
                <select
                  value={configSistema.impressaoAutomatica}
                  onChange={(e) => setConfigSistema({ ...configSistema, impressaoAutomatica: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 font-bold focus:border-orange-500 outline-none"
                >
                  <option value="perguntar">Perguntar antes de imprimir</option>
                  <option value="sim">Imprimir automaticamente</option>
                  <option value="nao">Não imprimir automaticamente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Mensagem Personalizada no Rodapé do Recibo</label>
              <input
                type="text"
                value={configSistema.mensagemRodapeRecibo}
                onChange={(e) => setConfigSistema({ ...configSistema, mensagemRodapeRecibo: e.target.value })}
                placeholder="Ex: Obrigado pela preferência! Volte sempre."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:border-orange-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
              <div>
                <span className="font-bold text-zinc-200 text-xs block">Incluir Dados da Empresa no Recibo</span>
                <span className="text-[11px] text-zinc-400">Imprime CNPJ, telefone e endereço no cabeçalho</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase ${configSistema.incluirDadosEmpresaRecibo ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {configSistema.incluirDadosEmpresaRecibo ? 'Sim' : 'Não'}
                </span>
                <button
                  type="button"
                  onClick={() => setConfigSistema(prev => ({ ...prev, incluirDadosEmpresaRecibo: !prev.incluirDadosEmpresaRecibo }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    configSistema.incluirDadosEmpresaRecibo ? 'bg-orange-500' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                      configSistema.incluirDadosEmpresaRecibo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* CARD 3: CONFIGURAÇÕES OPERACIONAIS DO SISTEMA & PDV */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-orange-500" />
                <span>Configurações Operacionais do Sistema</span>
              </h3>
              <p className="text-xs text-zinc-400">Comportamento dos leitores de código de barras, alertas audíveis e validações</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Toggle Som Bipador */}
              <div className="flex items-center justify-between p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                <div>
                  <span className="font-bold text-zinc-200 text-xs block">Sons do Leitor / Bipador</span>
                  <span className="text-[11px] text-zinc-400">Tocar beep ao passar código de barras</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase ${configSistema.somBipador ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {configSistema.somBipador ? 'Sim' : 'Não'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfigSistema(prev => ({ ...prev, somBipador: !prev.somBipador }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      configSistema.somBipador ? 'bg-orange-500' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                        configSistema.somBipador ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Toggle Foco Automático */}
              <div className="flex items-center justify-between p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                <div>
                  <span className="font-bold text-zinc-200 text-xs block">Foco Automático no Bipador</span>
                  <span className="text-[11px] text-zinc-400">Manter foco no campo de busca de produtos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase ${configSistema.focoAutomaticoBipador ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {configSistema.focoAutomaticoBipador ? 'Sim' : 'Não'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfigSistema(prev => ({ ...prev, focoAutomaticoBipador: !prev.focoAutomaticoBipador }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      configSistema.focoAutomaticoBipador ? 'bg-orange-500' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                        configSistema.focoAutomaticoBipador ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Toggle Confirmar Cancelamento */}
              <div className="flex items-center justify-between p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                <div>
                  <span className="font-bold text-zinc-200 text-xs block">Confirmar Cancelamento de Venda</span>
                  <span className="text-[11px] text-zinc-400">Exibir alerta antes de limpar o carrinho</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase ${configSistema.confirmarCancelamentoVenda ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {configSistema.confirmarCancelamentoVenda ? 'Sim' : 'Não'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfigSistema(prev => ({ ...prev, confirmarCancelamentoVenda: !prev.confirmarCancelamentoVenda }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      configSistema.confirmarCancelamentoVenda ? 'bg-orange-500' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                        configSistema.confirmarCancelamentoVenda ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Toggle Permitir Venda sem Estoque */}
              <div className="flex items-center justify-between p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                <div>
                  <span className="font-bold text-zinc-200 text-xs block">Permitir Venda sem Estoque</span>
                  <span className="text-[11px] text-zinc-400">Permite concluir vendas com saldo zerado</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase ${configSistema.permitirVendaSemEstoque ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {configSistema.permitirVendaSemEstoque ? 'Sim' : 'Não'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfigSistema(prev => ({ ...prev, permitirVendaSemEstoque: !prev.permitirVendaSemEstoque }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      configSistema.permitirVendaSemEstoque ? 'bg-orange-500' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                        configSistema.permitirVendaSemEstoque ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Botão de Salvar Configurações do Sistema */}
            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('010_config_sistema', JSON.stringify(configSistema));
                  setSavedMsg(true);
                  setTimeout(() => setSavedMsg(false), 3000);
                }}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Configurações do Sistema</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba Usuários */}
      {activeSubTab === 'usuarios' && renderUsuariosSection()}

      {/* Conteúdo Aba Backup */}
      {activeSubTab === 'backup' && (
        <div className="space-y-6 max-w-2xl animate-in fade-in duration-150 text-xs">
          {/* Card Supabase Server Status */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
                  <Database className="w-5 h-5 text-orange-500" />
                  <span>Sincronização & Banco de Dados Supabase</span>
                </h3>
                <p className="text-xs text-zinc-400">Status da conexão com o servidor PostgreSQL em nuvem</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Ativo & Conectado
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800/80 flex justify-between items-center">
                <span className="font-bold text-zinc-300">Banco de Dados Cloud:</span>
                <span className="font-black text-emerald-400">PostgreSQL (Supabase Cloud)</span>
              </div>
              <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800/80 flex justify-between items-center">
                <span className="font-bold text-zinc-300">Modo de Sincronização:</span>
                <span className="font-bold text-zinc-200">Duplo (Nuvem + LocalStorage)</span>
              </div>
              <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800/80 flex justify-between items-center">
                <span className="font-bold text-zinc-300">Status de Segurança:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Credenciais Protegidas & Conectadas</span>
                </span>
              </div>
            </div>
          </div>

          {/* Backup Local Manual */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="font-black text-zinc-100 text-base border-b border-zinc-800 pb-3">Backup de Segurança (Arquivo JSON)</h3>
            <p className="text-xs text-zinc-400">
              Faça o download ou restauro completo dos seus registros salvos no sistema a qualquer momento.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  const backupObj = {
                    caixas: localStorage.getItem('010_caixas'),
                    produtos: localStorage.getItem('010_produtos'),
                    vendas: localStorage.getItem('010_vendas'),
                    movimentacoes: localStorage.getItem('010_movimentacoes'),
                    contas: localStorage.getItem('010_contas_receber'),
                    exportadoEm: new Date().toISOString()
                  };
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `backup_bar_do_lima_${new Date().toISOString().slice(0, 10)}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-orange-400" />
                <span>Exportar Arquivo de Backup (JSON)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR NOVO USUÁRIO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-black text-zinc-100 text-base">Novo Usuário do Sistema</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Nome do Usuário *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva / caixa02"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Cargo / Função</label>
                <select
                  value={novoCargo}
                  onChange={(e) => setNovoCargo(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none font-bold"
                >
                  <option value="Funcionário">Funcionário</option>
                  <option value="Dono">Dono / Administrador</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/20"
                >
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


