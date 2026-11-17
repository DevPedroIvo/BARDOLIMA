import React, { useState } from 'react';
import { Cliente } from '../types/database';
import { Users, Plus, Search, Phone, MapPin, DollarSign, Edit3, Trash2 } from 'lucide-react';

interface ClientesPageProps {
  clientes: Cliente[];
  onAddCliente: (cliente: Partial<Cliente>) => void;
  onUpdateCliente: (id: string, cliente: Partial<Cliente>) => void;
  onReceberFiado: (clienteId: string, valor: number) => void;
}

export const ClientesPage: React.FC<ClientesPageProps> = ({
  clientes,
  onAddCliente,
  onUpdateCliente,
  onReceberFiado
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [valorAbater, setValorAbater] = useState<number>(0);

  const [formData, setFormData] = useState<Partial<Cliente>>({
    nome: '',
    telefone: '',
    endereco: '',
    bairro: '',
    limite_fiado: 500,
    observacoes: ''
  });

  const filteredClientes = clientes.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.telefone && c.telefone.includes(searchTerm)) ||
    (c.bairro && c.bairro.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setFormData({
      nome: '',
      telefone: '',
      endereco: '',
      bairro: '',
      limite_fiado: 500,
      observacoes: ''
    });
    setShowAddModal(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) return;
    onAddCliente(formData);
    setShowAddModal(false);
  };

  const handleOpenReceber = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setValorAbater(cliente.saldo_devedor);
    setShowPagamentoModal(true);
  };

  const handleConfirmarPagamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente || valorAbater <= 0) return;
    onReceberFiado(selectedCliente.id, valorAbater);
    setShowPagamentoModal(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <span>Clientes & Controle de Fiado</span>
          </h1>
          <p className="text-xs text-slate-400">Gerencie contatos, endereços de entrega e limite de crédito</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm shadow-md flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Cliente</span>
        </button>
      </div>

      {/* Busca */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome do cliente, telefone ou bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClientes.map((cliente) => {
          const temDebito = cliente.saldo_devedor > 0;

          return (
            <div key={cliente.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-slate-100 text-base">{cliente.nome}</h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    temDebito ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {temDebito ? 'Fiado em Aberto' : 'Em Dia'}
                  </span>
                </div>

                {cliente.telefone && (
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-amber-500" />
                    <span>{cliente.telefone}</span>
                  </p>
                )}

                {cliente.endereco && (
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    <span>{cliente.endereco} {cliente.bairro ? `- ${cliente.bairro}` : ''}</span>
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Saldo Devedor (Fiado):</span>
                  <span className={`font-black text-sm ${temDebito ? 'text-rose-400' : 'text-slate-300'}`}>
                    R$ {Number(cliente.saldo_devedor || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Limite Autorizado:</span>
                  <span>R$ {Number(cliente.limite_fiado || 0).toFixed(2)}</span>
                </div>

                {temDebito && (
                  <button
                    onClick={() => handleOpenReceber(cliente)}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Receber Pagamento Fiado</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Cadastro Cliente */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Cadastrar Novo Cliente</h3>
            <form onSubmit={handleSubmitAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome do Cliente / Estabelecimento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bar do Zé ou Maria Silva"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 99999-8888"
                  value={formData.telefone || ''}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Endereço</label>
                  <input
                    type="text"
                    placeholder="Rua / Av"
                    value={formData.endereco || ''}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Bairro</label>
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={formData.bairro || ''}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Limite Máximo de Fiado (R$)</label>
                <input
                  type="number"
                  step="50"
                  value={formData.limite_fiado || 500}
                  onChange={(e) => setFormData({ ...formData, limite_fiado: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pagamento Fiado */}
      {showPagamentoModal && selectedCliente && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Abater Fiado - {selectedCliente.nome}</h3>
            <p className="text-xs text-slate-400">Total devendo no momento: <span className="font-bold text-rose-400">R$ {selectedCliente.saldo_devedor.toFixed(2)}</span></p>

            <form onSubmit={handleConfirmarPagamento} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Valor do Pagamento Recebido (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedCliente.saldo_devedor}
                  required
                  value={valorAbater}
                  onChange={(e) => setValorAbater(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-base font-bold text-emerald-400 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPagamentoModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
                >
                  Confirmar Recebimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
