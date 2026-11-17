import React, { useState, useRef } from 'react';
import { 
  FileUp, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  DollarSign, 
  Building2, 
  Calendar, 
  ArrowRight, 
  X, 
  Sparkles,
  HelpCircle,
  TrendingUp,
  Plus
} from 'lucide-react';
import { Produto010, CompraEstoqueNFe, ItemCompraNFe, MovimentacaoEstoque010 } from '../types/010types';
import { parseNFeXML, associarItensNFeComEstoque, ParsedNFeData } from '../lib/nfeParser';

interface ImportadorNFeModalProps {
  produtosAtuais: Produto010[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmarImportacao: (params: {
    compra: CompraEstoqueNFe;
    produtosAtualizadosOuCriados: Produto010[];
    movimentacoes: Partial<MovimentacaoEstoque010>[];
  }) => void;
  usuarioAtual: string;
}

export const ImportadorNFeModal: React.FC<ImportadorNFeModalProps> = ({
  produtosAtuais,
  isOpen,
  onClose,
  onConfirmarImportacao,
  usuarioAtual
}) => {
  const [xmlContent, setXmlContent] = useState('');
  const [parsedData, setParsedData] = useState<ParsedNFeData | null>(null);
  const [itensProcessados, setItensProcessados] = useState<ItemCompraNFe[]>([]);
  const [precosVendaNovos, setPrecosVendaNovos] = useState<Record<number, number>>({});
  const [margemPadrao, setMargemPadrao] = useState<number>(40); // 40% de margem padrão
  const [erro, setErro] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessarXML = (conteudo: string) => {
    setErro(null);
    try {
      const data = parseNFeXML(conteudo);
      const associados = associarItensNFeComEstoque(data.itens, produtosAtuais);
      setParsedData(data);
      setItensProcessados(associados);

      // Prepara sugestão de preços de venda para produtos novos
      const precosIniciais: Record<number, number> = {};
      associados.forEach((it, idx) => {
        if (it.status_associacao === 'novo') {
          const precoSugerido = it.valor_unitario_custo * (1 + margemPadrao / 100);
          precosIniciais[idx] = parseFloat(precoSugerido.toFixed(2));
        }
      });
      setPrecosVendaNovos(precosIniciais);
    } catch (e: any) {
      setErro(e?.message || 'Falha ao processar o arquivo XML da NF-e.');
      setParsedData(null);
      setItensProcessados([]);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xml')) {
      setErro('Por favor, selecione um arquivo no formato XML da NF-e.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setXmlContent(text);
      handleProcessarXML(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Exemplo de teste rápido de NF-e para demonstração / homologação
  const handleCarregarExemploTeste = () => {
    const xmlExemplo = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35261012345678000190550010000049211234567890">
      <ide>
        <nNF>4921</nNF>
        <serie>1</serie>
        <dhEmi>2026-10-07T14:30:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>02345678000190</CNPJ>
        <xNome>AMBEV BRASIL BEBIDAS LTDA</xNome>
        <xFant>AMBEV DISTRIBUIDORA REGIONAL</xFant>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>SKOL-600</cProd>
          <cEAN>7891149010101</cEAN>
          <xProd>Cerveja Skol 600ml Garrafa (Unidade)</xProd>
          <NCM>22030000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>48.0000</qCom>
          <vUnCom>4.8500</vUnCom>
          <vProd>232.80</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>HEIN-330</cProd>
          <cEAN>7891149020202</cEAN>
          <xProd>Heineken Long Neck 330ml (Unidade)</xProd>
          <NCM>22030000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>60.0000</qCom>
          <vUnCom>5.6000</vUnCom>
          <vProd>336.00</vProd>
        </prod>
      </det>
      <det nItem="3">
        <prod>
          <cProd>CORONA-330</cProd>
          <cEAN>7891991001234</cEAN>
          <xProd>Cerveja Corona Extra Long Neck 330ml</xProd>
          <NCM>22030000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>36.0000</qCom>
          <vUnCom>6.2000</vUnCom>
          <vProd>223.20</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vProd>792.00</vProd>
          <vNF>792.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;
    setXmlContent(xmlExemplo);
    handleProcessarXML(xmlExemplo);
  };

  const handleConfirmar = () => {
    if (!parsedData || itensProcessados.length === 0) return;

    const compraId = `compra-${Date.now()}`;
    const dataHoraIso = new Date().toISOString();

    const produtosResultado: Produto010[] = [];
    const movimentacoes: Partial<MovimentacaoEstoque010>[] = [];

    itensProcessados.forEach((item, idx) => {
      if (item.status_associacao === 'existente' && item.produto_id) {
        // Atualiza produto existente
        const prodOriginal = produtosAtuais.find(p => p.id === item.produto_id);
        if (prodOriginal) {
          const novaQuantidade = (prodOriginal.quantidade || 0) + item.quantidade;
          const produtoAtualizado: Produto010 = {
            ...prodOriginal,
            quantidade: novaQuantidade,
            preco_custo: item.valor_unitario_custo, // Atualiza preço de custo com o valor pago na NF
          };
          produtosResultado.push(produtoAtualizado);

          movimentacoes.push({
            id: `mov-nfe-${Date.now()}-${idx}`,
            produto_id: prodOriginal.id,
            produto_nome: prodOriginal.nome,
            quantidade: item.quantidade,
            tipo: 'Entrada',
            usuario: usuarioAtual,
            observacao: `Entrada via NF-e nº ${parsedData.numero_nota} (${parsedData.fornecedor_nome}) - Custo Unit: R$ ${item.valor_unitario_custo.toFixed(2)}`
          });
        }
      } else {
        // Cadastra novo produto
        const precoVenda = precosVendaNovos[idx] || (item.valor_unitario_custo * 1.4);
        const novoProdutoId = `p-${Date.now()}-${idx}`;
        const novoProduto: Produto010 = {
          id: novoProdutoId,
          nome: item.nome,
          codigo: item.codigo_fornecedor || item.codigo_barras || `PROD-${idx + 1}`,
          codigo_barras: item.codigo_barras || item.codigo_fornecedor,
          categoria: 'Bebidas',
          tipo_embalagem: item.unidade.includes('CX') ? 'Caixa' : (item.unidade.includes('FD') ? 'Fardo' : 'Unidade'),
          unidades_por_caixa: 1,
          quantidade: item.quantidade,
          preco: precoVenda,
          preco_custo: item.valor_unitario_custo,
          estoque_minimo: 6,
          controlar_estoque: true,
          descricao: `Cadastrado via importação NF-e nº ${parsedData.numero_nota} - ${parsedData.fornecedor_nome}`,
          created_at: dataHoraIso
        };
        produtosResultado.push(novoProduto);

        movimentacoes.push({
          id: `mov-nfe-${Date.now()}-${idx}`,
          produto_id: novoProdutoId,
          produto_nome: novoProduto.nome,
          quantidade: item.quantidade,
          tipo: 'Entrada',
          usuario: usuarioAtual,
          observacao: `Novo produto via NF-e nº ${parsedData.numero_nota} (${parsedData.fornecedor_nome})`
        });
      }
    });

    const registroCompra: CompraEstoqueNFe = {
      id: compraId,
      numero_nota: parsedData.numero_nota || 'S/N',
      serie: parsedData.serie,
      chave_acesso: parsedData.chave_acesso,
      data_emissao: parsedData.data_emissao,
      fornecedor_nome: parsedData.fornecedor_nome,
      fornecedor_cnpj: parsedData.fornecedor_cnpj,
      valor_total: parsedData.valor_total,
      valor_produtos: parsedData.valor_produtos,
      itens: itensProcessados,
      created_at: dataHoraIso
    };

    onConfirmarImportacao({
      compra: registroCompra,
      produtosAtualizadosOuCriados: produtosResultado,
      movimentacoes
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-zinc-100">
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-zinc-100 text-lg flex items-center gap-2">
                <span>Importar Nota Fiscal (NF-e XML)</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Estoque & Custos
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Lê produtos, quantidades compradas e valores pagos para atualizar o estoque e lançar no Financeiro
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Erro se houver */}
        {erro && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* PASSO 1: Upload ou Colar XML */}
        {!parsedData ? (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                dragActive 
                  ? 'border-orange-500 bg-orange-500/10 scale-[0.99]' 
                  : 'border-zinc-800 hover:border-orange-500/60 bg-zinc-950/60 hover:bg-zinc-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-500/10">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-sm text-zinc-200">
                  Clique para selecionar o arquivo XML ou arraste aqui
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Arquivos XML de NF-e (Modelo 55 ou NFC-e 65 autorizados pela SEFAZ)
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-zinc-400 font-medium">Deseja simular uma nota fiscal de fornecedor de bebidas?</span>
              <button
                type="button"
                onClick={handleCarregarExemploTeste}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-orange-400 hover:text-orange-300 font-bold text-xs rounded-xl border border-zinc-700 flex items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span>Carregar Exemplo de Teste (Ambev Bebidas)</span>
              </button>
            </div>
          </div>
        ) : (
          /* PASSO 2: VISUALIZAÇÃO E CONFIRMAÇÃO DOS PRODUTOS DA NF-e */
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Card de Informações da Nota Fiscal */}
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Fornecedor</span>
                <span className="font-black text-zinc-100 truncate block">{parsedData.fornecedor_nome}</span>
                <span className="text-[11px] text-zinc-400 font-mono">{parsedData.fornecedor_cnpj}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Nota Fiscal</span>
                <span className="font-black text-zinc-100">Nº {parsedData.numero_nota}</span>
                <span className="text-[11px] text-zinc-400 block">Série: {parsedData.serie}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Emissão</span>
                <span className="font-bold text-zinc-200">
                  {new Date(parsedData.data_emissao).toLocaleDateString('pt-BR')}
                </span>
                <span className="text-[11px] text-zinc-500 block">Autorizada SEFAZ</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Valor Total NF-e</span>
                <span className="font-black text-emerald-400 text-base">
                  R$ {parsedData.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-400 block">{itensProcessados.length} itens encontrados</span>
              </div>
            </div>

            {/* Configuração de Margem para Produtos Novos */}
            <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <span className="font-bold text-zinc-300">
                  Margem de lucro sugerida para novos produtos:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={margemPadrao}
                  onChange={(e) => {
                    const novaMargem = parseFloat(e.target.value) || 0;
                    setMargemPadrao(novaMargem);
                    const novosPrecos: Record<number, number> = {};
                    itensProcessados.forEach((it, idx) => {
                      if (it.status_associacao === 'novo') {
                        novosPrecos[idx] = parseFloat((it.valor_unitario_custo * (1 + novaMargem / 100)).toFixed(2));
                      }
                    });
                    setPrecosVendaNovos(novosPrecos);
                  }}
                  className="w-20 bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1 text-center font-black text-orange-400 outline-none"
                />
                <span className="font-bold text-zinc-400">%</span>
              </div>
            </div>

            {/* Tabela de Produtos da NF-e */}
            <div className="border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Produto NF-e</th>
                      <th className="py-2.5 px-3">Código / EAN</th>
                      <th className="py-2.5 px-3 text-center">Qtd NF</th>
                      <th className="py-2.5 px-3 text-right">Custo Pago</th>
                      <th className="py-2.5 px-3 text-center">Associação no Estoque</th>
                      <th className="py-2.5 px-3 text-right">Preço de Venda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium">
                    {itensProcessados.map((item, idx) => {
                      const prodExistente = produtosAtuais.find(p => p.id === item.produto_id);
                      const isExistente = item.status_associacao === 'existente' && prodExistente;

                      return (
                        <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-bold text-zinc-100 block">{item.nome}</span>
                            <span className="text-[10px] text-zinc-500 font-medium">Un: {item.unidade}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-zinc-400">
                            {item.codigo_barras || item.codigo_fornecedor || 'S/N'}
                          </td>
                          <td className="py-3 px-3 text-center font-black text-zinc-200">
                            +{item.quantidade}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-400">
                            R$ {item.valor_unitario_custo.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isExistente ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>No Estoque ({prodExistente.quantidade} un ➔ {(prodExistente.quantidade || 0) + item.quantidade} un)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                <Plus className="w-3 h-3" />
                                <span>Novo Produto (Cadastrar)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isExistente ? (
                              <span className="text-zinc-300 font-bold">
                                R$ {prodExistente.preco.toFixed(2)}
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-zinc-500 font-bold text-[10px]">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={precosVendaNovos[idx] || ''}
                                  onChange={(e) => setPrecosVendaNovos({
                                    ...precosVendaNovos,
                                    [idx]: parseFloat(e.target.value) || 0
                                  })}
                                  className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-right text-xs font-black text-orange-400 outline-none focus:border-orange-500"
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ações Inferiores */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setParsedData(null);
                  setItensProcessados([]);
                  setXmlContent('');
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-colors"
              >
                Trocar Arquivo XML
              </button>

              <button
                type="button"
                onClick={handleConfirmar}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/25 flex items-center gap-2 transition-all transform active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Entrada no Estoque & Salvar no Financeiro</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
