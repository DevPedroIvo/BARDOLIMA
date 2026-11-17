import React from 'react';
import { Database, PlusCircle, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  isSupabaseConnected: boolean;
  onOpenConfig: () => void;
  onQuickSale: () => void;
  hasTablesError?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  isSupabaseConnected,
  onOpenConfig,
  onQuickSale,
  hasTablesError
}) => {
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Painel de Controle';
      case 'vendas': return 'Vendas & Ponto de Venda (PDV)';
      case 'estoque': return 'Gestão de Estoque de Bebidas';
      case 'clientes': return 'Clientes & Controle de Fiado';
      case 'caixa': return 'Fluxo de Caixa & Financeiro';
      case 'configuracoes': return 'Configurações do Supabase';
      default: return 'Distribuidora de Bebidas';
    }
  };

  return (
    <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-xl font-bold text-slate-100">{getTabTitle(activeTab)}</h2>
        <p className="text-xs text-slate-400">Sistema completo para distribuidoras de bebidas</p>
      </div>

      <div className="flex items-center gap-3">
        {hasTablesError && (
          <button
            onClick={onOpenConfig}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-medium transition-all"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Criar Tabelas no Supabase</span>
          </button>
        )}

        <button
          onClick={onQuickSale}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md shadow-amber-500/10 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nova Venda</span>
        </button>

        <button
          onClick={onOpenConfig}
          title="Configurações do Banco de Dados Supabase"
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
            isSupabaseConnected && !hasTablesError
              ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:border-emerald-500/50'
              : 'bg-slate-800 border-slate-700 text-amber-400 hover:border-amber-500/50'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>{isSupabaseConnected && !hasTablesError ? 'Supabase OK' : 'Supabase (Configurar)'}</span>
        </button>
      </div>
    </header>
  );
};
