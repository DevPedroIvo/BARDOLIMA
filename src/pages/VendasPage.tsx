import React, { useState } from 'react';
import { Produto, Cliente, Venda, ItemVenda } from '../types/database';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  DollarSign, 
  CheckCircle,
  Package,
  RefreshCw,
  Clock
} from 'lucide-react';

interface VendasPageProps {
  produtos: Produto[];
  clientes: Cliente[];
  vendas: Venda[];
  onFinalizarVenda: (venda: Partial<Venda>, itens: ItemVenda[]) => void;
}

export const VendasPage: React.FC<VendasPageProps> = ({
  produtos,
  clientes,
  vendas,
  onFinalizarVenda
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [carrinho, setCarrinho] = useState<ItemVenda[]>([]);
  const [clienteId, setClienteId] = useState<string>('');
  const [tipoVenda, setTipoVenda] = useState<'Balcao' | 'Delivery' | 'Atacado'>('Balcao');
  const [formaPagamento, setFormaPagamento] = useState<'Dinheiro' | 'PIX' | 'Cartao de Credito' | 'Cartao de Debito' | 'Fiado'>('PIX');
  const [desconto, setDesconto] = useState<number>(0);
  const [taxaEntrega, setTaxaEntrega] = useState<number>(0);
  const [valorPago, setValorPago] = useState<number>(0);
  const [cascosDevolvidos, setCascosDevolvidos] = useState<number>(0);
  const [vendaSucesso, setVendaSucesso] = useState(false);

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.codigo_barras && p.codigo_barras.includes(searchTerm))
  );

  const adicionarAoCarrinho = (produto: Produto, isFardo: boolean = false) => {
    const preco = isFardo && produto.preco_venda_fardo 
      ? produto.preco_venda_fardo 
      : produto.preco_venda_unitario;

    const nomeItem = isFardo 
      ? `${produto.nome} (Fardo com ${produto.unidades_por_fardo}un)` 
      : produto.nome;

    const itemExistenteIndex = carrinho.findIndex(
      item => item.produto_id === produto.id && item.is_fardo === isFardo
    );

    if (itemExistenteIndex >= 0) {
      const novosItens = [...carrinho];
      novosItens[itemExistenteIndex].quantidade += 1;
      novosItens[itemExistenteIndex].subtotal = novosItens[itemExistenteIndex].quantidade * preco;
      setCarrinho(novosItens);
    } else {
      setCarrinho([
        ...carrinho,
        {
          produto_id: produto.id,
          produto_nome: nomeItem,
          quantidade: 1,
          preco_unitario: preco,
          subtotal: preco,
          is_fardo: isFardo
        }
      ]);
    }
  };

  const alterarQuantidade = (index: number, delta: number) => {
    const novosItens = [...carrinho];
    const novaQtd = novosItens[index].quantidade + delta;
    if (novaQtd <= 0) {
      novosItens.splice(index, 1);
    } else {
      novosItens[index].quantidade = novaQtd;
      novosItens[index].subtotal = novaQtd * novosItens[index].preco_unitario;
    }
    setCarrinho(novosItens);
  };

  const removerDoCarrinho = (index: number) => {
    const novosItens = [...carrinho];
    novosItens.splice(index, 1);
    setCarrinho(novosItens);
  };

  const subtotal = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
  const total = Math.max(0, subtotal - desconto + taxaEntrega);
  const troco = Math.max(0, valorPago - total);

  const handleFinalizar = (e: React.FormEvent) => {
    e.preventDefault();
    if (carrinho.length === 0) return;

    if (formaPagamento === 'Fiado' && !clienteId) {
      alert('Selecione um cliente para registrar venda no FIADO!');
      return;
    }

    const novaVenda: Partial<Venda> = {
      cliente_id: clienteId || undefined,
      tipo_venda: tipoVenda,
      status: 'Entregue',
      forma_pagamento: formaPagamento,
      subtotal,
      desconto,
      taxa_entrega: taxaEntrega,
      valor_total: total,
      valor_pago: formaPagamento === 'Fiado' ? 0 : (valorPago > 0 ? valorPago : total),
      troco: formaPagamento === 'Fiado' ? 0 : troco,
      cascos_devolvidos: cascosDevolvidos
    };

    onFinalizarVenda(novaVenda, carrinho);

    // Reset carrinho
    setCarrinho([]);
    setDesconto(0);
    setTaxaEntrega(0);
    setValorPago(0);
    setCascosDevolvidos(0);
    setVendaSucesso(true);

    setTimeout(() => setVendaSucesso(false), 4000);
  };

  return (
    <div className="p-6 space-y-6">
      {vendaSucesso && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6" />
            <span className="font-bold text-sm">Venda realizada e registrada com sucesso no sistema!</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lado Esquerdo: Catálogo de Produtos para Venda */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              <span>Catálogo Rápido (PDV)</span>
            </h2>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar bebida..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            {filteredProdutos.map((prod) => (
              <div 
                key={prod.id} 
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-100 text-sm line-clamp-1">{prod.nome}</h3>
                    {prod.retornavel && (
                      <span title="Bebida Retornável" className="p-1 bg-blue-500/10 text-blue-400 rounded-md">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{prod.tipo_embalagem} • Estoque: <span className="font-semibold text-slate-200">{prod.estoque_atual}un</span></p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                  {/* Botão Venda Unitária */}
                  <button
                    onClick={() => adicionarAoCarrinho(prod, false)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-xl text-xs flex items-center justify-between px-3 transition-all"
                  >
                    <span>Venda Unidade</span>
                    <span className="text-emerald-400 font-bold">R$ {Number(prod.preco_venda_unitario).toFixed(2)}</span>
                  </button>

                  {/* Botão Venda Fardo/Caixa */}
                  {prod.preco_venda_fardo && (
                    <button
                      onClick={() => adicionarAoCarrinho(prod, true)}
                      className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold rounded-xl text-xs flex items-center justify-between px-3 transition-all"
                    >
                      <span>Fardo ({prod.unidades_por_fardo}un)</span>
                      <span>R$ {Number(prod.preco_venda_fardo).toFixed(2)}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lado Direito: Carrinho de Compras & Fechamento */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                <span>Carrinho da Venda</span>
              </h2>
              <span className="text-xs font-semibold px-2 py-1 bg-slate-800 rounded-lg text-slate-400">
                {carrinho.length} itens
              </span>
            </div>

            {/* Lista de Itens do Carrinho */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {carrinho.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Selecione bebidas ao lado para adicionar ao carrinho.
                </div>
              ) : (
                carrinho.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                    <div className="flex-1 pr-2">
                      <div className="font-semibold text-slate-200">{item.produto_nome}</div>
                      <div className="text-slate-400">R$ {item.preco_unitario.toFixed(2)} un</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alterarQuantidade(index, -1)}
                        className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-slate-100 w-5 text-center">{item.quantidade}</span>
                      <button
                        onClick={() => alterarQuantidade(index, 1)}
                        className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      <span className="font-bold text-emerald-400 w-16 text-right">
                        R$ {item.subtotal.toFixed(2)}
                      </span>

                      <button
                        onClick={() => removerDoCarrinho(index)}
                        className="p-1 rounded-md hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Opções da Venda */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cliente</label>
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:border-amber-500 outline-none"
                  >
                    <option value="">Cliente Consumidor (Balcão)</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} {c.saldo_devedor > 0 ? `(Devendo R$${c.saldo_devedor})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tipo de Venda</label>
                  <select
                    value={tipoVenda}
                    onChange={(e) => setTipoVenda(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:border-amber-500 outline-none"
                  >
                    <option value="Balcao">Balcão / Presencial</option>
                    <option value="Delivery">Delivery / Entrega</option>
                    <option value="Atacado">Atacado / Bar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Forma de Pagamento</label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:border-amber-500 outline-none"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartao de Credito">Cartão de Crédito</option>
                    <option value="Cartao de Debito">Cartão de Débito</option>
                    <option value="Fiado">Fiado (Anotar Conta)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cascos Devolvidos</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Qtd cascos"
                    value={cascosDevolvidos || ''}
                    onChange={(e) => setCascosDevolvidos(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Totais */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-200">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Desconto (R$):</span>
                <input
                  type="number"
                  step="0.50"
                  value={desconto || ''}
                  onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                  className="w-20 bg-slate-900 border border-slate-800 text-right px-2 py-1 rounded text-xs text-slate-200 outline-none"
                />
              </div>
              {tipoVenda === 'Delivery' && (
                <div className="flex justify-between items-center text-slate-400">
                  <span>Taxa de Entrega (R$):</span>
                  <input
                    type="number"
                    step="1.00"
                    value={taxaEntrega || ''}
                    onChange={(e) => setTaxaEntrega(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-slate-900 border border-slate-800 text-right px-2 py-1 rounded text-xs text-slate-200 outline-none"
                  />
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-100 pt-2 border-t border-slate-800">
                <span>Total a Pagar:</span>
                <span className="text-amber-400 text-lg">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleFinalizar}
            disabled={carrinho.length === 0}
            className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all ${
              carrinho.length > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>Finalizar Venda (R$ {total.toFixed(2)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
