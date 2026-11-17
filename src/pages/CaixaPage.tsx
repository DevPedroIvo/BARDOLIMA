import React, { useState } from 'react';
import { MovimentacaoCaixa } from '../types/database';
import { Wallet, ArrowDownRight, ArrowUpRight, PlusCircle, MinusCircle, DollarSign, Calendar } from 'lucide-react';

interface CaixaPageProps {
  movimentacoes: MovimentacaoCaixa[];
  onAddMovimentacao: (movimentacao: Partial<MovimentacaoCaixa>) => void;
}

export const CaixaPage: React.FC<CaixaPageProps> = ({
  movimentacoes,
  onAddMovimentacao
}) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<MovimentacaoCaixa>>({
    tipo: 'Entrada',
    categoria: 'Suprimento',
    descricao: '',
    valor: 0,
    forma_pagamento: 'Dinheiro'
  });

  const totalEntradas = movimentacoes
    .filter(m => m.tipo === 'Entrada' || m.tipo === 'Abertura')
    .reduce((acc, m) => acc + (m.valor || 0), 0);

  const totalSaidas = movimentacoes
    .filter(m => m.tipo === 'Saida')
    .reduce((acc, m) => acc + (m.valor || 0), 0);

  const saldoCaixa = totalEntradas - totalSaidas;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao || !formData.valor) return;
    onAddMovimentacao(formData);
    setShowModal(false);
    setFormData({
      tipo: 'Entrada',
      categoria: 'Suprimento',
      descricao: '',
      valor: 0,
      forma_pagamento: 'Dinheiro'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-500" />
            <span>Fluxo de Caixa & Financeiro</span>
          </h1>
          <p className="text-xs text-slate-400">Controle entradas, saídas, troco e sangrias do caixa</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm shadow-md flex items-center gap-2 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nova Movimentação de Caixa</span>
        </button>
      </div>

      {/* Cards Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 font-semibold uppercase">Saldo Atual do Caixa</span>
          <p className={`text-2xl font-bold mt-2 ${saldoCaixa >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            R$ {saldoCaixa.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Disponível em caixa fisicamente / conta</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Total Entradas / Vendas</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">R$ {totalEntradas.toFixed(2)}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Total Saídas / Sangrias</span>
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">R$ {totalSaidas.toFixed(2)}</p>
        </div>
      </div>

      {/* Tabela de Movimentações */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 font-bold text-slate-100 text-sm">
          Histórico de Lançamentos
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Forma Pagto</th>
                <th className="py-3 px-4 text-right">Valor (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {movimentacoes.map((mov) => {
                const isEntrada = mov.tipo === 'Entrada' || mov.tipo === 'Abertura';

                return (
                  <tr key={mov.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {new Date(mov.created_at || Date.now()).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{mov.descricao}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {mov.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">{mov.forma_pagamento || '-'}</td>
                    <td className={`py-3 px-4 text-right font-bold ${isEntrada ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isEntrada ? '+' : '-'} R$ {Number(mov.valor).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Lançamento */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Nova Movimentação de Caixa</h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Movimentação</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                >
                  <option value="Entrada">Entrada (+) Suprimento / Recebimento</option>
                  <option value="Saida">Saída (-) Sangria / Despesa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Categoria</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                >
                  <option value="Suprimento">Suprimento de Troco</option>
                  <option value="Sangria">Sangria (Retirada)</option>
                  <option value="Despesa">Despesa Operacional</option>
                  <option value="Recebimento Fiado">Recebimento Fiado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra de sacos de gelo ou Sangria para banco"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.valor || ''}
                  onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none font-bold text-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
