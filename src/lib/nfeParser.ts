import { CompraEstoqueNFe, ItemCompraNFe, Produto010 } from '../types/010types';

export interface ParsedNFeData {
  numero_nota: string;
  serie: string;
  chave_acesso: string;
  data_emissao: string;
  fornecedor_nome: string;
  fornecedor_cnpj: string;
  valor_total: number;
  valor_produtos: number;
  itens: Omit<ItemCompraNFe, 'status_associacao' | 'produto_id'>[];
}

/**
 * Função utilitária para extrair texto de elementos XML de forma segura,
 * tolerando prefixos de namespace (ex: <nfe:det> ou <det>).
 */
function getTagText(parent: Element, tagName: string): string {
  // Procura por tag sem namespace e com namespace
  let el = parent.getElementsByTagName(tagName)[0];
  if (!el) {
    // Procura por qualquer tag que termine com tagName
    const all = parent.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) {
      const nodeName = all[i].nodeName;
      if (nodeName === tagName || nodeName.endsWith(':' + tagName)) {
        el = all[i];
        break;
      }
    }
  }
  return el?.textContent?.trim() || '';
}

/**
 * Faz o parser do arquivo XML de NF-e (Modelo 55 ou 65 da SEFAZ)
 */
export function parseNFeXML(xmlString: string): ParsedNFeData {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Verifica erro de parse
  const parseError = xmlDoc.getElementsByTagName('parsererror')[0];
  if (parseError) {
    throw new Error('O arquivo selecionado não é um XML válido ou está corrompido.');
  }

  // Chave de acesso: atributo Id na tag infNFe (ex: Id="NFe352309...")
  const infNFe = xmlDoc.getElementsByTagName('infNFe')[0] || 
                 Array.from(xmlDoc.getElementsByTagName('*')).find(el => el.nodeName.endsWith('infNFe'));

  let chaveAcesso = '';
  if (infNFe) {
    const rawId = infNFe.getAttribute('Id') || '';
    chaveAcesso = rawId.replace(/^NFe/, '').trim();
  }

  // Dados da Identificação (<ide>)
  const ideEl = xmlDoc.getElementsByTagName('ide')[0] ||
                Array.from(xmlDoc.getElementsByTagName('*')).find(el => el.nodeName.endsWith('ide'));
  
  const numeroNota = ideEl ? getTagText(ideEl, 'nNF') : '';
  const serie = ideEl ? getTagText(ideEl, 'serie') : '1';
  let dataEmissao = ideEl ? (getTagText(ideEl, 'dhEmi') || getTagText(ideEl, 'dEmi')) : '';

  if (!dataEmissao) {
    dataEmissao = new Date().toISOString();
  }

  // Dados do Fornecedor / Emitente (<emit>)
  const emitEl = xmlDoc.getElementsByTagName('emit')[0] ||
                 Array.from(xmlDoc.getElementsByTagName('*')).find(el => el.nodeName.endsWith('emit'));
  
  let fornecedorNome = 'Fornecedor Desconhecido';
  let fornecedorCnpj = '';

  if (emitEl) {
    fornecedorNome = getTagText(emitEl, 'xFant') || getTagText(emitEl, 'xNome') || 'Fornecedor';
    fornecedorCnpj = getTagText(emitEl, 'CNPJ') || getTagText(emitEl, 'CPF') || '';
    if (fornecedorCnpj && fornecedorCnpj.length === 14) {
      // Formata CNPJ: 00.000.000/0000-00
      fornecedorCnpj = fornecedorCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
  }

  // Totais da Nota (<total><ICMSTot>)
  const icmsTot = xmlDoc.getElementsByTagName('ICMSTot')[0] ||
                  Array.from(xmlDoc.getElementsByTagName('*')).find(el => el.nodeName.endsWith('ICMSTot'));

  const valorTotal = icmsTot ? parseFloat(getTagText(icmsTot, 'vNF') || '0') : 0;
  const valorProdutos = icmsTot ? parseFloat(getTagText(icmsTot, 'vProd') || '0') : valorTotal;

  // Itens da Nota (<det>)
  const detList = Array.from(xmlDoc.getElementsByTagName('*')).filter(el => 
    el.nodeName === 'det' || el.nodeName.endsWith(':det')
  );

  if (detList.length === 0) {
    throw new Error('Nenhum item ou produto foi encontrado nesta Nota Fiscal (tag <det> ausente).');
  }

  const itens: Omit<ItemCompraNFe, 'status_associacao' | 'produto_id'>[] = [];

  detList.forEach(detEl => {
    const prodEl = detEl.getElementsByTagName('prod')[0] ||
                   Array.from(detEl.getElementsByTagName('*')).find(el => el.nodeName.endsWith('prod'));

    if (!prodEl) return;

    const cProd = getTagText(prodEl, 'cProd');
    let cEAN = getTagText(prodEl, 'cEAN');
    if (cEAN === 'SEM GTIN' || cEAN === '0' || !cEAN) {
      cEAN = '';
    }

    const xProd = getTagText(prodEl, 'xProd');
    const ncm = getTagText(prodEl, 'NCM');
    const cfop = getTagText(prodEl, 'CFOP');
    const uCom = getTagText(prodEl, 'uCom') || 'UN';
    const qCom = parseFloat(getTagText(prodEl, 'qCom') || '1');
    const vUnCom = parseFloat(getTagText(prodEl, 'vUnCom') || '0');
    const vProd = parseFloat(getTagText(prodEl, 'vProd') || String(qCom * vUnCom));

    itens.push({
      codigo_fornecedor: cProd,
      codigo_barras: cEAN || undefined,
      nome: xProd,
      ncm: ncm || undefined,
      cfop: cfop || undefined,
      unidade: uCom.toUpperCase(),
      quantidade: isNaN(qCom) || qCom <= 0 ? 1 : Math.round(qCom),
      valor_unitario_custo: isNaN(vUnCom) ? 0 : vUnCom,
      valor_total: isNaN(vProd) ? (qCom * vUnCom) : vProd
    });
  });

  return {
    numero_nota: numeroNota,
    serie,
    chave_acesso: chaveAcesso,
    data_emissao: dataEmissao,
    fornecedor_nome: fornecedorNome,
    fornecedor_cnpj: fornecedorCnpj,
    valor_total: valorTotal || itens.reduce((acc, i) => acc + i.valor_total, 0),
    valor_produtos: valorProdutos || itens.reduce((acc, i) => acc + i.valor_total, 0),
    itens
  };
}

/**
 * Cruza os itens lidos na NF-e com a base atual de produtos do estoque.
 * Faz match por Código de Barras (EAN), depois por Código, depois por Nome aproximado.
 */
export function associarItensNFeComEstoque(
  itensNFe: Omit<ItemCompraNFe, 'status_associacao' | 'produto_id'>[],
  produtosEstoque: Produto010[]
): ItemCompraNFe[] {
  return itensNFe.map(item => {
    // 1. Tentar match por código de barras
    let produtoEncontrado: Produto010 | undefined;
    
    if (item.codigo_barras) {
      produtoEncontrado = produtosEstoque.find(p => 
        p.codigo_barras === item.codigo_barras || p.codigo === item.codigo_barras
      );
    }

    // 2. Tentar match por código do produto
    if (!produtoEncontrado && item.codigo_fornecedor) {
      produtoEncontrado = produtosEstoque.find(p => 
        p.codigo === item.codigo_fornecedor || p.codigo_barras === item.codigo_fornecedor
      );
    }

    // 3. Tentar match por nome normalizado
    if (!produtoEncontrado && item.nome) {
      const nomeNFeNorm = item.nome.trim().toLowerCase();
      produtoEncontrado = produtosEstoque.find(p => 
        p.nome.trim().toLowerCase() === nomeNFeNorm
      );
    }

    if (produtoEncontrado) {
      return {
        ...item,
        produto_id: produtoEncontrado.id,
        status_associacao: 'existente'
      };
    }

    return {
      ...item,
      status_associacao: 'novo'
    };
  });
}
