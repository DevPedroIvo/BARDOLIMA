import React, { useState } from 'react';
import { Produto, Categoria } from '../types/database';
import { 
  Package, 
  Plus, 
  Search, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  AlertCircle,
  Tag,
  Beer
} from 'lucide-react';

interface EstoquePageProps {
  produtos: Produto[];
  categorias: Categoria[];
  onAddProduto: (produto: Partial<Produto>) => void;
  onUpdateProduto: (id: string, produto: Partial<Produto>) => void;
  onDeleteProduto: (id: string) => void;
}

export const EstoquePage: React.FC<EstoquePageProps> = ({
  produtos,
  categorias,
  onAddProduto,
  onUpdateProduto,
  onDeleteProduto
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Produto>>({
    nome: '',
    codigo_barras: '',
    categoria_id: '',
    tipo_embalagem: 'Garrafa 600ml',
    retornavel: false,
    preco_custo: 0,
    preco_venda_unitario: 0,
    preco_venda_fardo: 0,
    unidades_por_fardo: 12,
    estoque_atual: 0,
    estoque_minimo: 10,
    imagem_url: ''
  });

  const filteredProdutos = produtos.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.codigo_barras && p.codigo_barras.includes(searchTerm));
    const matchesCategory = selectedCategory === 'todos' || p.categoria_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      nome: '',
      codigo_barras: '',
      categoria_id: categorias[0]?.id || '',
      tipo_embalagem: 'Garrafa 600ml',
      retornavel: false,
      preco_custo: 0,
      preco_venda_unitario: 0,
      preco_venda_fardo: 0,
      unidades_por_fardo: 12,
      estoque_atual: 0,
      estoque_minimo: 10,
      imagem_url: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (produto: Produto) => {
    setEditingId(produto.id);
    setFormData(produto);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) return;

    if (editingId) {
      onUpdateProduto(editingId, formData);
    } else {
      onAddProduto(formData);
    }
    setShowModal(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            <span>Estoque de Bebidas</span>
          </h1>
          <p className="text-xs text-slate-400">Cadastre e controle preços, fardos e embalagens retornáveis</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm shadow-md shadow-amber-500/10 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Bebida</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome da bebida ou código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Categorias Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('todos')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'todos'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas as Categorias
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Produto / Embalagem</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Preço Custo</th>
                <th className="py-3 px-4">Preço Venda (Unit / Fardo)</th>
                <th className="py-3 px-4">Estoque Atual</th>
                <th className="py-3 px-4 text-center">Retornável</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProdutos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Nenhuma bebida encontrada no estoque.
                  </td>
                </tr>
              ) : (
                filteredProdutos.map((prod) => {
                  const cat = categorias.find(c => c.id === prod.categoria_id);
                  const isBaixoEstoque = prod.estoque_atual <= prod.estoque_minimo;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {prod.imagem_url ? (
                            <img src={prod.imagem_url} alt={prod.nome} className="w-10 h-10 rounded-lg object-cover bg-slate-800 border border-slate-700" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                              <Beer className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-100">{prod.nome}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                              <span>{prod.tipo_embalagem}</span>
                              {prod.codigo_barras && (
                                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                  SKU: {prod.codigo_barras}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300">
                          <Tag className="w-3 h-3 text-amber-400" />
                          <span>{cat?.nome || 'Geral'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-400">
                        R$ {Number(prod.preco_custo).toFixed(2)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-emerald-400">
                          R$ {Number(prod.preco_venda_unitario).toFixed(2)} <span className="text-[10px] font-normal text-slate-400">/un</span>
                        </div>
                        {prod.preco_venda_fardo && (
                          <div className="text-xs text-amber-400 font-medium">
                            R$ {Number(prod.preco_venda_fardo).toFixed(2)} <span className="text-[10px] text-slate-500">({prod.unidades_por_fardo}un fardo)</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm ${isBaixoEstoque ? 'text-rose-400' : 'text-slate-100'}`}>
                            {prod.estoque_atual} un
                          </span>
                          {isBaixoEstoque && (
                            <span title="Atenção: Estoque Baixo!" className="flex items-center gap-1 text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-semibold">
                              <AlertCircle className="w-3 h-3" /> Mín: {prod.estoque_minimo}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {prod.retornavel ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <RefreshCw className="w-3 h-3" /> Casco Garrafa
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Descartável</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Editar Bebida"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteProduto(prod.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastro / Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-100">
              {editingId ? 'Editar Bebida' : 'Cadastrar Nova Bebida'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome da Bebida *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cerveja Brahma Garrafa 600ml"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoria</label>
                  <select
                    value={formData.categoria_id || ''}
                    onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Embalagem</label>
                  <select
                    value={formData.tipo_embalagem || 'Garrafa 600ml'}
                    onChange={(e) => setFormData({ ...formData, tipo_embalagem: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                  >
                    <option value="Garrafa 600ml">Garrafa 600ml</option>
                    <option value="Garrafa 1L">Garrafa 1L (Litão)</option>
                    <option value="Lata">Lata 350ml / 269ml</option>
                    <option value="Long Neck">Long Neck 330ml</option>
                    <option value="PET 2L">PET 2L</option>
                    <option value="Fardo/Caixa">Fardo / Caixa</option>
                    <option value="Barril/Chopp">Barril / Chopp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.preco_custo || 0}
                    onChange={(e) => setFormData({ ...formData, preco_custo: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Preço Venda Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.preco_venda_unitario || 0}
                    onChange={(e) => setFormData({ ...formData, preco_venda_unitario: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Preço Fardo/Caixa Fechada (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Opcional"
                    value={formData.preco_venda_fardo || ''}
                    onChange={(e) => setFormData({ ...formData, preco_venda_fardo: parseFloat(e.target.value) || undefined })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Unidades no Fardo</label>
                  <input
                    type="number"
                    value={formData.unidades_por_fardo || 12}
                    onChange={(e) => setFormData({ ...formData, unidades_por_fardo: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estoque Atual (Unidades)</label>
                  <input
                    type="number"
                    value={formData.estoque_atual || 0}
                    onChange={(e) => setFormData({ ...formData, estoque_atual: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    value={formData.estoque_minimo || 10}
                    onChange={(e) => setFormData({ ...formData, estoque_minimo: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="retornavel"
                  checked={formData.retornavel || false}
                  onChange={(e) => setFormData({ ...formData, retornavel: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <label htmlFor="retornavel" className="text-xs text-slate-200 font-medium cursor-pointer">
                  Garrafa Retornável (Requer devolução de casco pelo cliente)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-md shadow-amber-500/10"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Bebida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
