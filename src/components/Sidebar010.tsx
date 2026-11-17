import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Boxes, 
  Wallet, 
  Landmark, 
  BarChart3, 
  FileText, 
  History, 
  Bell, 
  Settings,
  Beer,
  X,
  Receipt
} from 'lucide-react';
import { ModuleTab } from '../types/010types';

interface Sidebar010Props {
  activeTab: ModuleTab;
  setActiveTab: (tab: ModuleTab) => void;
  notificacoesNaoLidas: number;
  contasAbertasCount?: number;
  isCaixaAberto?: boolean;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar010: React.FC<Sidebar010Props> = ({
  activeTab,
  setActiveTab,
  notificacoesNaoLidas,
  contasAbertasCount = 0,
  isCaixaAberto = false,
  isOpenMobile,
  onCloseMobile
}) => {
  const menuItems: { id: ModuleTab; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pdv', label: 'PDV', icon: ShoppingCart },
    { id: 'contas', label: 'Contas', icon: Receipt, badge: contasAbertasCount },
    { id: 'caixa', label: 'Caixa', icon: Landmark },
    { id: 'produtos', label: 'Produtos', icon: Package },
    { id: 'estoque', label: 'Estoque', icon: Boxes },
    { id: 'financeiro', label: 'Financeiro', icon: Wallet },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, badge: notificacoesNaoLidas },
  ];

  const sidebarContent = (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen sticky top-0 text-zinc-300 select-none z-30">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/95 border border-blue-400/40 p-1 shadow-lg shadow-blue-500/15 shrink-0 flex items-center justify-center">
            <img src="/logo_icon.png" alt="Bar do Lima" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-black text-zinc-100 text-base leading-tight tracking-tight">
              BAR DO <span className="text-orange-500">LIMA</span>
            </h1>
            <p className="text-[10px] text-orange-400/90 font-bold uppercase tracking-wider">Gestão & Vendas</p>
          </div>
        </div>

        {onCloseMobile && (
          <button onClick={onCloseMobile} className="lg:hidden p-1 text-zinc-400 hover:text-zinc-100">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Menu List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-black text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.id === 'caixa' && isCaixaAberto && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
              )}

              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-zinc-950 text-white' : 'bg-orange-500 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Marca */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/50 text-[10px] text-zinc-400 font-medium space-y-1 text-center">
        <div className="text-orange-400 font-bold">Bar do Lima</div>
        <div className="text-zinc-500 text-[9px] pt-0.5">Sistema Comercial • PWA</div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        {sidebarContent}
      </div>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

