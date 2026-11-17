import React, { useState, useEffect } from 'react';
import { Notificacao010 } from '../types/010types';
import { 
  Bell, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Trash2, 
  Check, 
  Sliders, 
  ShoppingCart, 
  Landmark, 
  Lock, 
  AlertTriangle, 
  Boxes, 
  Clock 
} from 'lucide-react';

export interface PreferenciasNotificacao {
  vendas: boolean;
  caixaAberto: boolean;
  caixaFechado: boolean;
  quebraCaixa: boolean;
  estoqueBaixo: boolean;
  contasVencimento: boolean;
}

interface Notificacoes010Props {
  notificacoes: Notificacao010[];
  onMarcarComoLida: (id: string) => void;
  onLimparTodas: () => void;
}

export const Notificacoes010: React.FC<Notificacoes010Props> = ({
  notificacoes,
  onMarcarComoLida,
  onLimparTodas
}) => {
  const defaultPreferencias: PreferenciasNotificacao = {
    vendas: true,
    caixaAberto: true,
    caixaFechado: true,
    quebraCaixa: true,
    estoqueBaixo: true,
    contasVencimento: true
  };

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador atual não suporta Notificações de Área de Trabalho / Push.');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermissionStatus(result);
      if (result === 'granted') {
        alert('Notificações no navegador ativadas com sucesso!');
        try {
          new Notification('Bar do Lima', {
            body: 'As notificações foram ativadas com sucesso neste dispositivo!',
            icon: '/logo_icon.png'
          });
        } catch(e) {}
      } else if (result === 'denied') {
        alert('As notificações foram bloqueadas no seu navegador. Para permitir, acesse as configurações do navegador ou o ícone de cadeado na barra de endereço.');
      }
    } catch {
      // Silencioso
    }
  };

  const [prefs, setPrefs] = useState<PreferenciasNotificacao>(() => {
    try {
      const saved = localStorage.getItem('010_preferencias_notificacoes');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultPreferencias;
  });

  useEffect(() => {
    try {
      localStorage.setItem('010_preferencias_notificacoes', JSON.stringify(prefs));
    } catch (e) {}
  }, [prefs]);

  const handleTogglePref = (key: keyof PreferenciasNotificacao) => {
    setPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const listaConfiguracoes: { key: keyof PreferenciasNotificacao; titulo: string; desc: string; icon: any; color: string }[] = [
    {
      key: 'vendas',
      titulo: 'Cada Venda Realizada',
      desc: 'Notificar em tempo real quando uma venda for concluída no PDV',
      icon: ShoppingCart,
      color: 'text-orange-400'
    },
    {
      key: 'caixaAberto',
      titulo: 'Abertura de Caixa',
      desc: 'Notificar quando um operador abrir o caixa do dia',
      icon: Landmark,
      color: 'text-emerald-400'
    },
    {
      key: 'caixaFechado',
      titulo: 'Fechamento de Caixa',
      desc: 'Notificar quando o caixa for encerrado',
      icon: Lock,
      color: 'text-zinc-300'
    },
    {
      key: 'quebraCaixa',
      titulo: 'Quebra de Caixa / Divergências',
      desc: 'Alerta prioritário quando houver valor faltando ou sobrando na gaveta',
      icon: AlertTriangle,
      color: 'text-rose-400'
    },
    {
      key: 'estoqueBaixo',
      titulo: 'Estoque Baixo & Alertas',
      desc: 'Aviso quando produtos atingirem o limite mínimo cadastrado',
      icon: Boxes,
      color: 'text-amber-400'
    },
    {
      key: 'contasVencimento',
      titulo: 'Contas Fiado / Vencimento de Títulos',
      desc: 'Alertas de cobrança e vencimento de contas a receber',
      icon: Clock,
      color: 'text-purple-400'
    }
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-in fade-in duration-150 text-zinc-100">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-zinc-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" />
            <span>Central de Notificações e Alertas</span>
          </h1>
          <p className="text-xs text-zinc-400">Configure preferências de avisos e consulte mensagens do sistema</p>
        </div>

        {notificacoes.length > 0 && (
          <button
            onClick={onLimparTodas}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400 font-bold rounded-xl text-xs border border-zinc-700 flex items-center gap-2 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar Notificações</span>
          </button>
        )}
      </div>

      {/* Banner Permissão de Notificação no Navegador */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            permissionStatus === 'granted'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
          }`}>
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-zinc-100 text-sm">Notificações no Navegador / Área de Trabalho</h3>
            <p className="text-xs text-zinc-400 font-medium">
              {permissionStatus === 'granted'
                ? 'Notificações ativadas no seu navegador para avisos do sistema em tempo real.'
                : permissionStatus === 'denied'
                ? 'As notificações estão bloqueadas nas permissões do navegador.'
                : 'Permita receber notificações no seu navegador para alertas de vendas, caixa e estoque.'}
            </p>
          </div>
        </div>

        {permissionStatus === 'granted' ? (
          <span className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-black flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>Notificações Ativas</span>
          </span>
        ) : (
          <button
            onClick={handleRequestPermission}
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all shrink-0 w-full sm:w-auto"
          >
            <Bell className="w-4 h-4" />
            <span>Permitir Receber Notificações</span>
          </button>
        )}
      </div>

      {/* PAINEL DE PREFERÊNCIAS DE NOTIFICAÇÃO (TOGGLES) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
              <Sliders className="w-5 h-5 text-orange-500" />
              <span>Quais notificações deseja receber?</span>
            </h3>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">Use os comutadores para escolher Sim ou Não para cada tipo de evento</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {listaConfiguracoes.map((item) => {
            const Icon = item.icon;
            const isEnabled = prefs[item.key];

            return (
              <div
                key={item.key}
                className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md transition-all"
              >
                <div className="space-y-1 flex-1 pr-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${item.color} shrink-0`} />
                    <span className="font-black text-xs text-zinc-100">{item.titulo}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-tight font-medium">{item.desc}</p>
                </div>

                {/* Toggle Switch (Sim / Não) */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-black uppercase ${isEnabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {isEnabled ? 'Sim' : 'Não'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTogglePref(item.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEnabled ? 'bg-orange-500' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MENSAGENS E NOTIFICAÇÕES RECEBIDAS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" />
            <span>Notificações Recebidas</span>
          </h3>
          <span className="text-xs text-zinc-400 font-bold">{notificacoes.length} mensagens</span>
        </div>

        <div className="space-y-3">
          {notificacoes.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-8 text-center text-zinc-500 text-xs font-semibold">
              Nenhuma notificação registrada no momento! 👍
            </div>
          ) : (
            notificacoes.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border flex items-start justify-between gap-4 transition-all ${
                  n.lida
                    ? 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 opacity-75'
                    : 'bg-zinc-950 border-zinc-700 text-zinc-100 shadow-md'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {n.tipo === 'alerta' ? (
                      <AlertCircle className="w-5 h-5 text-orange-400" />
                    ) : n.tipo === 'sucesso' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Info className="w-5 h-5 text-blue-400" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-zinc-100">{n.titulo}</h4>
                      {!n.lida && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{n.mensagem}</p>
                    <span className="text-[10px] text-zinc-500 block font-medium">
                      {new Date(n.data_hora).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {!n.lida && (
                  <button
                    onClick={() => onMarcarComoLida(n.id)}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg shrink-0 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5 text-orange-400" />
                    <span>Marcar como lida</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

