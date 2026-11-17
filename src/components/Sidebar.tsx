import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Wallet, 
  Database,
  Beer
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSupabaseConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  isSupabaseConnected 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'vendas', label: 'Vendas & PDV', icon: ShoppingCart },
    { id: 'estoque', label: 'Estoque de Bebidas', icon: Package },
    { id: 'clientes', label: 'Clientes & Fiado', icon: Users },
    { id: 'caixa', label: 'Caixa & Financeiro', icon: Wallet },
    { id: 'configuracoes', label: 'Supabase & Banco', icon: Database },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 text-slate-300 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-amber-500 text-slate-950 p-2.5 rounded-xl shadow-lg shadow-amber-500/20 font-bold">
          <Beer className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-slate-100 text-lg leading-tight">Distribuidora</h1>
          <p className="text-xs text-amber-400 font-medium">Gestão de Bebidas</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-semibold'
                  : 'hover:bg-slate-800/70 hover:text-slate-100 text-slate-400'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Connection Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs px-2 py-2 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="text-slate-400">Supabase:</span>
          </div>
          <span className={`font-semibold ${isSupabaseConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isSupabaseConnected ? 'Conectado' : 'Tabelas Pendentes'}
          </span>
        </div>
      </div>
    </aside>
  );
};
