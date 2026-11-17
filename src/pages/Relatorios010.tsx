import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download, 
  Filter, 
  Package, 
  Search, 
  ArrowUpDown, 
  Award, 
  ShoppingBag, 
  DollarSign, 
  Layers, 
  Percent, 
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { Venda010, Produto010, ItemCarrinho010 } from '../types/010types';
import { round2 } from '../utils/money';
import { formatDateTimeLocal, isSameDayLocal, parseDateSafe } from '../utils/dateUtils';

interface Relatorios010Props {
  vendas?: Venda010[];
  produtos?: Produto010[];
}

interface ProdutoVendidoConsolidado {
  id: string;
  produto_id: string;
  nome: string;
  codigo: string;
  categoria: string;
  quantidadeTotal: number;
  totalFaturado: number;
  precoMedio: number;
  precoCustoMedio: number;
  lucroEstimado: number;
  numeroVendas: number;
  participacaoFaturamento: number;
}

export const Relatorios010: React.FC<Relatorios010Props> = ({ 
  vendas = [], 
  produtos = [] 
}) => {
  const [tipoRelatorio, setTipoRelatorio] = useState<string>('produtos_vendidos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('7d');
  const [buscaProduto, setBuscaProduto] = useState<string>('');
  const [ordenacao, setOrdenacao] = useState<'qtd' | 'valor' | 'nome'>('qtd');

  const relatoriosDisponiveis = [
    { id: 'produtos_vendidos', label: 'Produtos Vendidos' },
    { id: 'mais_vendidos', label: 'Top Mais Vendidos' },
    { id: 'vendas', label: 'Vendas Geral' },
    { id: 'estoque', label: 'Inventário de Estoque' }
  ];

  const periodos = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'ontem', label: 'Ontem' },
    { id: '7d', label: '7 Dias' },
    { id: '30d', label: '30 Dias' },
    { id: 'mes_atual', label: 'Mês Atual' },
    { id: 'todos', label: 'Todo o Histórico' }
  ];

  // Filtra as vendas válidas (não canceladas) no período selecionado
  const vendasFiltradas = useMemo(() => {
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);

    const dataLimite7d = new Date(hoje);
    dataLimite7d.setDate(hoje.getDate() - 7);
    dataLimite7d.setHours(0, 0, 0, 0);

    const dataLimite30d = new Date(hoje);
    dataLimite30d.setDate(hoje.getDate() - 30);
    dataLimite30d.setHours(0, 0, 0, 0);

    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    return vendas.filter(v => {
      if (v.status === 'Cancelada') return false;
      if (!v.data_hora) return true;

      const d = parseDateSafe(v.data_hora);

      switch (filtroPeriodo) {
        case 'hoje':
          return isSameDayLocal(v.data_hora, hoje);
        case 'ontem':
          return isSameDayLocal(v.data_hora, ontem);
        case '7d':
          return d >= dataLimite7d;
        case '30d':
          return d >= dataLimite30d;
        case 'mes_atual':
          return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        case 'todos':
        default:
          return true;
      }
    });
  }, [vendas, filtroPeriodo]);

  // Mapa rápido de informações cadastrais dos produtos
  const produtosMap = useMemo(() => {
    const map = new Map<string, Produto010>();
    produtos.forEach(p => {
      map.set(p.id, p);
      if (p.codigo) map.set(p.codigo.toLowerCase(), p);
      if (p.codigo_barras) map.set(p.codigo_barras.toLowerCase(), p);
    });
    return map;
  }, [produtos]);

  // Consolidação de todos os produtos vendidos nas vendas do período
  const produtosVendidosConsolidados = useMemo(() => {
    const mapaItens = new Map<string, {
      produto_id: string;
      nome: string;
      codigo: string;
      categoria: string;
      quantidadeTotal: number;
      totalFaturado: number;
      precoCustoMedio: number;
      numeroVendas: number;
    }>();

    let totalGeralFaturado = 0;

    vendasFiltradas.forEach(v => {
      const itens: ItemCarrinho010[] = Array.isArray(v.produtos) 
        ? v.produtos 
        : (typeof v.produtos === 'string' ? (() => { try { return JSON.parse(v.produtos); } catch { return []; } })() : []);

      itens.forEach(item => {
        if (!item) return;
        const key = item.produto_id || item.codigo || item.nome.trim().toLowerCase();
        const prodCadastrado = produtosMap.get(item.produto_id) || produtosMap.get(item.codigo?.toLowerCase() || '') || null;
        
        const sub = round2(item.subtotal || ((item.quantidade || 0) * (item.preco_unitario || 0)));
        const qtd = item.quantidade || 0;
        totalGeralFaturado += sub;

        const existente = mapaItens.get(key);
        if (existente) {
          existente.quantidadeTotal += qtd;
          existente.totalFaturado = round2(existente.totalFaturado + sub);
          existente.numeroVendas += 1;
        } else {
          mapaItens.set(key, {
            produto_id: item.produto_id || key,
            nome: item.nome || prodCadastrado?.nome || 'Produto sem nome',
            codigo: item.codigo || prodCadastrado?.codigo || '',
            categoria: prodCadastrado?.categoria || 'Geral',
            quantidadeTotal: qtd,
            totalFaturado: sub,
            precoCustoMedio: prodCadastrado?.preco_custo || 0,
            numeroVendas: 1
          });
        }
      });
    });

    const lista: ProdutoVendidoConsolidado[] = Array.from(mapaItens.entries()).map(([key, data]) => {
      const precoMedio = data.quantidadeTotal > 0 ? round2(data.totalFaturado / data.quantidadeTotal) : 0;
      const custoTotal = round2(data.quantidadeTotal * (data.precoCustoMedio || 0));
      const lucroEstimado = round2(Math.max(0, data.totalFaturado - custoTotal));
      const participacao = totalGeralFaturado > 0 ? round2((data.totalFaturado / totalGeralFaturado) * 100) : 0;

      return {
        id: key,
        produto_id: data.produto_id,
        nome: data.nome,
        codigo: data.codigo,
        categoria: data.categoria,
        quantidadeTotal: data.quantidadeTotal,
        totalFaturado: data.totalFaturado,
        precoMedio,
        precoCustoMedio: data.precoCustoMedio,
        lucroEstimado,
        numeroVendas: data.numeroVendas,
        participacaoFaturamento: participacao
      };
    });

    // Ordenação
    if (ordenacao === 'qtd') {
      lista.sort((a, b) => b.quantidadeTotal - a.quantidadeTotal);
    } else if (ordenacao === 'valor') {
      lista.sort((a, b) => b.totalFaturado - a.totalFaturado);
    } else {
      lista.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    return lista;
  }, [vendasFiltradas, produtosMap, ordenacao]);

  // Filtra por termo de busca digitado pelo usuário
  const produtosFiltradosPorBusca = useMemo(() => {
    const term = buscaProduto.trim().toLowerCase();
    if (!term) return produtosVendidosConsolidados;

    return produtosVendidosConsolidados.filter(p => 
      p.nome.toLowerCase().includes(term) || 
      p.codigo.toLowerCase().includes(term) ||
      p.categoria.toLowerCase().includes(term)
    );
  }, [produtosVendidosConsolidados, buscaProduto]);

  // Métricas Totais
  const totalItensVendidos = useMemo(() => {
    return produtosVendidosConsolidados.reduce((acc, p) => acc + p.quantidadeTotal, 0);
  }, [produtosVendidosConsolidados]);

  const faturamentoTotalProdutos = useMemo(() => {
    return round2(produtosVendidosConsolidados.reduce((acc, p) => acc + p.totalFaturado, 0));
  }, [produtosVendidosConsolidados]);

  const produtoCampeao = useMemo(() => {
    if (produtosVendidosConsolidados.length === 0) return null;
    return [...produtosVendidosConsolidados].sort((a, b) => b.quantidadeTotal - a.quantidadeTotal)[0];
  }, [produtosVendidosConsolidados]);

  const maxQuantidadeVendida = useMemo(() => {
    return Math.max(...produtosVendidosConsolidados.map(p => p.quantidadeTotal), 1);
  }, [produtosVendidosConsolidados]);

  // Exportar Relatório em CSV real
  const handleExportarCSV = () => {
    if (produtosVendidosConsolidados.length === 0) {
      alert('Nenhum dado de vendas disponível para exportar no período selecionado.');
      return;
    }

    const headers = ['Posição', 'Código', 'Produto', 'Categoria', 'Qtd Vendida (un)', 'Preço Médio (R$)', 'Faturamento Total (R$)', 'Participação (%)'];
    const rows = produtosVendidosConsolidados.map((p, idx) => [
      `#${idx + 1}`,
      `"${p.codigo || ''}"`,
      `"${p.nome.replace(/"/g, '""')}"`,
      `"${p.categoria}"`,
      p.quantidadeTotal,
      p.precoMedio.toFixed(2),
      p.totalFaturado.toFixed(2),
      `${p.participacaoFaturamento.toFixed(1)}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_produtos_vendidos_${filtroPeriodo}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-in fade-in duration-150">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <span>Relatórios & Análise de Produtos Vendidos</span>
          </h1>
          <p className="text-xs text-zinc-400">Consolidação em tempo real dos produtos vendidos, faturamento e desempenho</p>
        </div>

        <button
          onClick={handleExportarCSV}
          className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-zinc-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-orange-500/20"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Exportar Planilha (CSV)</span>
        </button>
      </div>

      {/* Seletores de Relatório e Filtro de Período */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3.5 shadow-md">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
          <span className="text-xs font-bold text-zinc-400 uppercase mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-orange-500" /> Relatório:
          </span>
          {relatoriosDisponiveis.map(r => (
            <button
              key={r.id}
              onClick={() => setTipoRelatorio(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tipoRelatorio === r.id
                  ? 'bg-orange-500 text-zinc-950 shadow-md font-black'
                  : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 uppercase mr-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-orange-500" /> Período:
          </span>
          {periodos.map(p => (
            <button
              key={p.id}
              onClick={() => setFiltroPeriodo(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filtroPeriodo === p.id
                  ? 'bg-zinc-800 text-orange-400 border border-orange-500/40 shadow-sm'
                  : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Cards Principais de Indicadores Reais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Itens Vendidos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase">Total Itens Vendidos</span>
            <Package className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-100">
            {totalItensVendidos} <span className="text-xs text-zinc-400 font-bold">un</span>
          </div>
          <div className="text-[10px] text-zinc-400">Distribuídos em {vendasFiltradas.length} venda(s)</div>
        </div>

        {/* Faturamento em Produtos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase">Faturamento Produtos</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-500">
            R$ {faturamentoTotalProdutos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-400 font-medium">Receita bruta gerada</div>
        </div>

        {/* Produto Campeão */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase">Produto Mais Vendido</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-black text-zinc-100 truncate" title={produtoCampeao?.nome || 'Nenhum'}>
            {produtoCampeao ? produtoCampeao.nome : 'Sem vendas'}
          </div>
          <div className="text-[10px] text-amber-400 font-bold">
            {produtoCampeao ? `${produtoCampeao.quantidadeTotal} un vendidas (R$ ${produtoCampeao.totalFaturado.toFixed(2)})` : 'Aguardando vendas'}
          </div>
        </div>

        {/* Variedade de Itens */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase">Mix de Produtos</span>
            <Layers className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-100">
            {produtosVendidosConsolidados.length} <span className="text-xs text-zinc-400 font-bold">itens distintos</span>
          </div>
          <div className="text-[10px] text-zinc-400">Vendidos no período selecionado</div>
        </div>
      </div>

      {/* SEÇÃO 1: TABELA DETALHADA DE PRODUTOS VENDIDOS */}
      {(tipoRelatorio === 'produtos_vendidos' || tipoRelatorio === 'mais_vendidos') && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-3">
            <div>
              <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                <span>
                  {tipoRelatorio === 'mais_vendidos' ? 'Ranking dos Produtos Mais Vendidos' : 'Detalhamento de Produtos Vendidos'}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Lista de todos os produtos comercializados no período com quantidades e valores faturados
              </p>
            </div>

            {/* Barra de Busca e Ordenação */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                  placeholder="Buscar produto..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setOrdenacao('qtd')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${ordenacao === 'qtd' ? 'bg-orange-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'}`}
                  title="Ordenar por Quantidade"
                >
                  Qtd
                </button>
                <button
                  onClick={() => setOrdenacao('valor')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${ordenacao === 'valor' ? 'bg-orange-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'}`}
                  title="Ordenar por Faturamento"
                >
                  R$
                </button>
                <button
                  onClick={() => setOrdenacao('nome')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${ordenacao === 'nome' ? 'bg-orange-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'}`}
                  title="Ordenar por Nome"
                >
                  A-Z
                </button>
              </div>
            </div>
          </div>

          {/* Tabela de Produtos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-center">Qtd Vendida</th>
                  <th className="py-3 px-4 text-right">Preço Médio</th>
                  <th className="py-3 px-4 text-right">Faturamento Total</th>
                  <th className="py-3 px-4 text-right">% Mix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {produtosFiltradosPorBusca.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500 text-xs">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Package className="w-8 h-8 text-zinc-600" />
                        <span className="font-bold text-zinc-400">Nenhum produto vendido encontrado para o período selecionado.</span>
                        <span className="text-[11px] text-zinc-500">Realize vendas no PDV ou altere o filtro de período acima.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  produtosFiltradosPorBusca.map((prod, idx) => {
                    const barraPct = Math.max((prod.quantidadeTotal / maxQuantidadeVendida) * 100, 3);
                    const isTop1 = idx === 0 && ordenacao === 'qtd';
                    const isTop2 = idx === 1 && ordenacao === 'qtd';
                    const isTop3 = idx === 2 && ordenacao === 'qtd';

                    return (
                      <tr key={prod.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4 text-center">
                          {isTop1 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-xs mx-auto">
                              1º
                            </span>
                          ) : isTop2 ? (
                            <span className="w-6 h-6 rounded-full bg-zinc-400/20 text-zinc-300 border border-zinc-400/30 flex items-center justify-center font-black text-xs mx-auto">
                              2º
                            </span>
                          ) : isTop3 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/30 flex items-center justify-center font-black text-xs mx-auto">
                              3º
                            </span>
                          ) : (
                            <span className="font-mono text-zinc-500 text-xs">#{idx + 1}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-zinc-100 block break-words max-w-sm">
                            {prod.nome}
                          </div>
                          {prod.codigo && (
                            <span className="text-[10px] text-zinc-500 font-mono">Cód: {prod.codigo}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400 text-[11px]">
                            {prod.categoria}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col items-center">
                            <span className="font-black text-zinc-100 text-sm">
                              {prod.quantidadeTotal} un
                            </span>
                            <div className="w-24 bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800 mt-1">
                              <div className="bg-orange-500 h-full rounded-full" style={{ width: `${barraPct}%` }} />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                          R$ {prod.precoMedio.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-black text-orange-500 text-sm font-mono">
                          R$ {prod.totalFaturado.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-bold text-xs text-zinc-300">
                            {prod.participacaoFaturamento.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEÇÃO 2: RELATÓRIO DE VENDAS GERAL */}
      {tipoRelatorio === 'vendas' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="border-b border-zinc-800 pb-3">
            <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              <span>Vendas Registradas no Período ({vendasFiltradas.length})</span>
            </h3>
            <p className="text-xs text-zinc-400">Histórico detalhado de cupons e tickets emitidos</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Venda Nº</th>
                  <th className="py-3 px-4">Cliente / Operador</th>
                  <th className="py-3 px-4">Produtos Vendidos</th>
                  <th className="py-3 px-4">Pagamento</th>
                  <th className="py-3 px-4 text-right">Total (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {vendasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-zinc-500 text-xs">
                      Nenhuma venda encontrada para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  vendasFiltradas.map(v => {
                    const itens: ItemCarrinho010[] = Array.isArray(v.produtos) 
                      ? v.produtos 
                      : (typeof v.produtos === 'string' ? (() => { try { return JSON.parse(v.produtos); } catch { return []; } })() : []);

                    return (
                      <tr key={v.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                          {formatDateTimeLocal(v.data_hora)}
                        </td>
                        <td className="py-3 px-4 font-black text-zinc-100">
                          #{v.numero_venda}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-zinc-200 block">{v.cliente_nome || 'Cliente Balcão'}</span>
                          <span className="text-[10px] text-zinc-500">Operador: {v.usuario || 'admin'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-zinc-200 max-w-sm line-clamp-2 font-medium" title={itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}>
                            {itens.length > 0 ? itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ') : 'Produtos da venda'}
                          </div>
                          <span className="text-[10px] text-zinc-500">{itens.length} item(s)</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-orange-400 text-[10px] font-bold">
                            {v.forma_pagamento}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-orange-500 text-sm font-mono">
                          R$ {v.total.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEÇÃO 3: RELATÓRIO DE INVENTÁRIO DE ESTOQUE */}
      {tipoRelatorio === 'estoque' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="border-b border-zinc-800 pb-3">
            <h3 className="font-black text-zinc-100 text-base flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              <span>Inventário Geral do Catálogo ({produtos.length} produtos)</span>
            </h3>
            <p className="text-xs text-zinc-400">Posição física de estoque e valor estimado de prateleira</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-center">Estoque Atual</th>
                  <th className="py-3 px-4 text-right">Preço Venda</th>
                  <th className="py-3 px-4 text-right">Valor em Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {produtos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-zinc-500 text-xs">
                      Nenhum produto cadastrado no catálogo.
                    </td>
                  </tr>
                ) : (
                  produtos.map(p => {
                    const semEstoque = p.quantidade <= 0;
                    const estoqueBaixo = p.quantidade > 0 && p.quantidade <= p.estoque_minimo;
                    const valorTotalEstoque = round2(p.quantidade * p.preco);

                    return (
                      <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-400 text-xs">
                          #{p.codigo}
                        </td>
                        <td className="py-3 px-4 font-bold text-zinc-200">
                          {p.nome}
                        </td>
                        <td className="py-3 px-4 text-zinc-400">
                          {p.categoria}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                            semEstoque 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' 
                              : estoqueBaixo 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {p.quantidade} un
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-300">
                          R$ {p.preco.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-orange-500">
                          R$ {valorTotalEstoque.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
