import React from 'react';
import { Produto, Venda, Cliente } from '../types/database';
import { 
  TrendingUp, 
  AlertCircle, 
  Users, 
  DollarSign, 
  Beer,
  RefreshCw,
  ShoppingBag,
  ArrowUpRight
} from 'lucide-react';

interface DashboardPageProps {
  produtos: Produto[];
  vendas: Venda[];
  clientes: Cliente[];
  onNavigate: (tab: string) => void;
  onNewSale: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  produtos,
  vendas,
  clientes,
  onNavigate,
  onNewSale
}) => {
  // Calculos para os indicadores do dashboard
  const faturamentoHoje = vendas
    .filter(v => v.status !== 'Cancelado')
    .reduce((acc, v) => acc + (v.valor_total || 0), 0);

  const produtosBaixoEstoque = produtos.filter(p => p.estoque_atual <= p.estoque_minimo);
  const totalCascosRetornaveis = produtos.filter(p => p.retornavel).reduce((acc, p) => acc + p.estoque_atual, 0);
  const totalFiadoPendente = clientes.reduce((acc, c) => acc + (c.saldo_devedor || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Banner Boas Vindas e Ações Rápidas */}
      <div className="bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-slate-900 border border-amber-500/30 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">Painel da Distribuidora</span>
          <h1 className="text-2xl font-black text-slate-100 mt-1">Resumo das Operações</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie seu estoque de fardos, cascos retornáveis e vendas em tempo real.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onNewSale}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Registrar Venda PDV</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Faturamento */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Faturamento Total</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-3">
            R$ {faturamentoHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-emerald-400 text-xs mt-2 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{vendas.length} vendas registradas</span>
          </div>
        </div>

        {/* Card Alerta de Estoque */}
        <div 
          onClick={() => onNavigate('estoque')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Alerta de Estoque Baixo</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-3">
            {produtosBaixoEstoque.length} <span className="text-sm font-normal text-slate-400">itens</span>
          </p>
          <div className="flex items-center justify-between text-xs mt-2 text-slate-400 group-hover:text-amber-400 transition-colors">
            <span>Reposição necessária</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card Fiado / Contas a Receber */}
        <div 
          onClick={() => onNavigate('clientes')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-rose-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Fiado a Receber</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-3">
            R$ {totalFiadoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-xs mt-2 text-rose-400 font-medium">
            <span>{clientes.filter(c => c.saldo_devedor > 0).length} clientes devendo</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card Cascos Retornáveis */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Cascos em Garrafeiro</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-3">
            {totalCascosRetornaveis} <span className="text-sm font-normal text-slate-400">unidades</span>
          </p>
          <p className="text-xs text-slate-400 mt-2">Garrafas 600ml / 1L no estoque</p>
        </div>
      </div>

      {/* Grid Inferior: Vendas Recentes & Baixo Estoque */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendas Recentes */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <span>Últimas Vendas</span>
            </h3>
            <button 
              onClick={() => onNavigate('vendas')}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              Ver Todas
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">ID / Cliente</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Pagamento</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vendas.slice(0, 5).map((venda) => (
                  <tr key={venda.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200">
                        {venda.cliente?.nome || 'Cliente Balcão'}
                      </div>
                      <div className="text-xs text-slate-500">ID: #{venda.id.slice(0, 8)}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-medium px-2 py-1 rounded-md bg-slate-800 text-slate-300">
                        {venda.tipo_venda}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-semibold ${venda.forma_pagamento === 'Fiado' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {venda.forma_pagamento}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-100">
                      R$ {venda.valor_total.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        venda.status === 'Entregue' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        venda.status === 'Saiu para Entrega' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {venda.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Produtos com Baixo Estoque */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              <Beer className="w-4 h-4 text-amber-500" />
              <span>Atenção Estoque</span>
            </h3>
            <button 
              onClick={() => onNavigate('estoque')}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              Gerenciar
            </button>
          </div>

          <div className="space-y-3">
            {produtosBaixoEstoque.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Todos os produtos estão com estoque ideal! 👍
              </div>
            ) : (
              produtosBaixoEstoque.map((prod) => (
                <div key={prod.id} className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    {prod.imagem_url ? (
                      <img src={prod.imagem_url} alt={prod.nome} className="w-9 h-9 rounded-lg object-cover bg-slate-800" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                        {prod.nome.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">{prod.nome}</h4>
                      <span className="text-[10px] text-slate-400">{prod.tipo_embalagem}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-400 block">{prod.estoque_atual} un</span>
                    <span className="text-[10px] text-slate-500">Mínimo: {prod.estoque_minimo}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
