import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  Produto010, 
  Venda010, 
  MovimentacaoEstoque010, 
  ContaReceber010, 
  Caixa010, 
  AuditLog010,
  ContaComanda010,
  ItemContaComanda010,
  PagamentoContaComanda010
} from '../types/010types';
import { round2 } from '../utils/money';
import { getNowIsoWithTimezone } from '../utils/dateUtils';
import { idbCache } from '../lib/indexedDbCache';
import { egressTracker } from '../lib/egressTracker';

export const supabaseService = {
  isConfigured: isSupabaseConfigured,

  // ================= VERIFICAÇÃO LEVE DE DELTAS (EGRESS SAVER) =================
  // Consulta assinaturas ultra-leves (incluindo cancelamentos, caixa ativo e itens de comanda)
  // Consome apenas ~300 bytes por ciclo para verificar se houve inserção, cancelamento,
  // fechamento ou movimentação em outro terminal antes de baixar qualquer tabela.
  async checkDeltas(): Promise<{
    hasChanges: boolean;
    changes: {
      vendas: boolean;
      produtos: boolean;
      caixas: boolean;
      comandas: boolean;
      movimentacoes: boolean;
    };
  }> {
    if (!isSupabaseConfigured()) {
      return { hasChanges: false, changes: { vendas: false, produtos: false, caixas: false, comandas: false, movimentacoes: false } };
    }

    try {
      const [vRes, vCancRes, pRes, auditRes, cRes, openCaixaRes, comRes, comItensRes, comOpenRes, mRes] = await Promise.all([
        supabase.from('vendas').select('data_hora', { count: 'exact' }).order('data_hora', { ascending: false }).limit(1),
        supabase.from('vendas').select('id', { count: 'exact', head: true }).eq('status', 'Cancelada'),
        supabase.from('produtos').select('created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(1),
        supabase.from('audit_logs').select('data_hora', { count: 'exact' }).order('data_hora', { ascending: false }).limit(1),
        supabase.from('caixas').select('data', { count: 'exact' }).order('data', { ascending: false }).limit(1),
        supabase.from('caixas').select('id, status, valor_vendas, saldo_esperado').eq('status', 'Aberto').limit(1),
        supabase.from('contas_comandas').select('created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(1),
        supabase.from('contas_comandas_itens').select('id', { count: 'exact', head: true }),
        supabase.from('contas_comandas').select('id', { count: 'exact', head: true }).eq('status', 'ABERTA'),
        supabase.from('movimentacoes_estoque').select('data_hora', { count: 'exact' }).order('data_hora', { ascending: false }).limit(1)
      ]);

      egressTracker.registrar('deltas_head', 'HEAD', 320, 'sync-check');

      // Assinatura de vendas: data/hora recente + total + canceladas
      const vSig = `${vRes.data?.[0]?.data_hora || ''}_${vRes.count || 0}_canc${vCancRes.count || 0}`;

      // Assinatura de produtos: catalogo + ultimo log de auditoria (detecta edições de preço/cadastro)
      const pSig = `${pRes.data?.[0]?.created_at || ''}_${pRes.count || 0}_aud${auditRes.data?.[0]?.data_hora || ''}_${auditRes.count || 0}`;

      // Assinatura de caixas: total caixas + estado em tempo real do caixa atualmente aberto
      const openCx = openCaixaRes.data?.[0];
      const cSig = `${cRes.data?.[0]?.data || ''}_${cRes.count || 0}_cx${openCx?.id || 'none'}_${openCx?.status || ''}_${openCx?.valor_vendas || 0}_${openCx?.saldo_esperado || 0}`;

      // Assinatura de comandas: total comandas + total itens de comanda + total de comandas abertas
      const comSig = `${comRes.data?.[0]?.created_at || ''}_${comRes.count || 0}_it${comItensRes.count || 0}_ab${comOpenRes.count || 0}`;

      // Assinatura de movimentações de estoque
      const mSig = `${mRes.data?.[0]?.data_hora || ''}_${mRes.count || 0}`;

      const lastSigStr = sessionStorage.getItem('010_db_signatures');
      const lastSig = lastSigStr ? JSON.parse(lastSigStr) : {};

      const changes = {
        vendas: lastSig.vendas !== vSig,
        produtos: lastSig.produtos !== pSig,
        caixas: lastSig.caixas !== cSig,
        comandas: lastSig.comandas !== comSig,
        movimentacoes: lastSig.movimentacoes !== mSig
      };

      const hasChanges = changes.vendas || changes.produtos || changes.caixas || changes.comandas || changes.movimentacoes;

      sessionStorage.setItem('010_db_signatures', JSON.stringify({
        vendas: vSig,
        produtos: pSig,
        caixas: cSig,
        comandas: comSig,
        movimentacoes: mSig
      }));

      return { hasChanges, changes };
    } catch {
      return { hasChanges: true, changes: { vendas: true, produtos: true, caixas: true, comandas: true, movimentacoes: true } };
    }
  },
  // ================= PRODUTOS =================
  async fetchProdutos(limit: number = 1000, forceRefresh: boolean = false): Promise<Produto010[] | null> {
    if (!isSupabaseConfigured()) return null;

    if (!forceRefresh) {
      try {
        const cached = await idbCache.get<Produto010[]>('produtos_catalogo');
        if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
          if (Date.now() - cached.timestamp < 180000) { // 3 minutos
            egressTracker.registrar('produtos', 'SELECT', cached.data, 'cache-local', true);
            return cached.data;
          }
        }
      } catch {}
    }

    try {
      const colunasOtimizadas = 'id, nome, codigo, codigo_barras, categoria, marca, tipo_embalagem, unidades_por_caixa, quantidade, preco, preco_custo, estoque_minimo, controlar_estoque, descricao, created_at';
      let res: any = await supabase
        .from('produtos')
        .select(colunasOtimizadas)
        .order('nome', { ascending: true })
        .limit(limit);

      if (res.error) {
        // Fallback básico se alguma coluna opcional divergir
        res = await supabase
          .from('produtos')
          .select('id, nome, codigo, codigo_barras, categoria, quantidade, preco, preco_custo, descricao')
          .order('nome', { ascending: true })
          .limit(limit);
      }

      const data = res.data;
      if (res.error || !Array.isArray(data)) {
        const fallback = await idbCache.get<Produto010[]>('produtos_catalogo');
        if (fallback) return fallback.data;
        return null;
      }

      egressTracker.registrar('produtos', 'SELECT', data, 'supabase');

      const mapped = data.map(p => {
        let produto_pai_id = (p as any).produto_pai_id;
        let preco_custo = (p as any).preco_custo !== undefined && (p as any).preco_custo !== null ? Number((p as any).preco_custo) : 0;

        if (p.descricao) {
          if (!produto_pai_id) {
            const m = String(p.descricao).match(/\[PAI:([^\]]+)\]/);
            if (m) produto_pai_id = m[1];
          }
          if (!preco_custo) {
            const mCusto = String(p.descricao).match(/\[CUSTO:([^\]]+)\]/);
            if (mCusto) preco_custo = parseFloat(mCusto[1]) || 0;
          }
        }

        return {
          id: String(p.id),
          nome: String(p.nome || 'Produto sem Nome'),
          codigo: String(p.codigo || ''),
          codigo_barras: String(p.codigo_barras || p.codigo || ''),
          categoria: String(p.categoria || 'Bebidas'),
          marca: String(p.marca || ''),
          tipo_embalagem: p.tipo_embalagem || 'Unidade',
          unidades_por_caixa: Number(p.unidades_por_caixa) || 1,
          produto_pai_id: produto_pai_id ? String(produto_pai_id) : undefined,
          quantidade: Number(p.quantidade) || 0,
          preco: Number(p.preco) || 0,
          preco_custo: preco_custo,
          estoque_minimo: Number(p.estoque_minimo) || 5,
          controlar_estoque: p.controlar_estoque !== undefined ? Boolean(p.controlar_estoque) : true,
          descricao: String(p.descricao || ''),
          created_at: p.created_at
        };
      });

      idbCache.set('produtos_catalogo', mapped);
      return mapped;
    } catch {
      const fallback = await idbCache.get<Produto010[]>('produtos_catalogo');
      if (fallback) return fallback.data;
      return null;
    }
  },

  async insertProduto(prod: Partial<Produto010>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    let descFinal = prod.descricao || '';
    if (prod.produto_pai_id && !descFinal.includes('[PAI:')) {
      descFinal = `${descFinal} [PAI:${prod.produto_pai_id}]`.trim();
    }
    if (prod.preco_custo !== undefined && prod.preco_custo > 0 && !descFinal.includes('[CUSTO:')) {
      descFinal = `${descFinal} [CUSTO:${prod.preco_custo}]`.trim();
    }

    const payload: Record<string, any> = {
      id: prod.id,
      nome: prod.nome,
      codigo: prod.codigo,
      codigo_barras: prod.codigo_barras || prod.codigo,
      categoria: prod.categoria || 'Bebidas',
      marca: prod.marca || '',
      tipo_embalagem: prod.tipo_embalagem || 'Unidade',
      unidades_por_caixa: prod.unidades_por_caixa || 1,
      quantidade: prod.quantidade !== undefined ? Number(prod.quantidade) : 0,
      preco: prod.preco !== undefined ? Number(prod.preco) : 0,
      preco_custo: prod.preco_custo !== undefined ? Number(prod.preco_custo) : 0,
      estoque_minimo: prod.estoque_minimo !== undefined ? Number(prod.estoque_minimo) : 5,
      controlar_estoque: prod.controlar_estoque !== undefined ? prod.controlar_estoque : true,
      descricao: descFinal
    };

    try {
      let { error } = await supabase.from('produtos').insert([payload]);
      if (error && error.message?.includes('preco_custo')) {
        delete payload.preco_custo;
        const res2 = await supabase.from('produtos').insert([payload]);
        error = res2.error;
      }
      if (error) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async updateProduto(id: string, prod: Partial<Produto010>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    // Sanitização das colunas aceitas pelo Supabase REST API
    const allowedCols = [
      'nome', 'codigo', 'codigo_barras', 'categoria', 'marca',
      'tipo_embalagem', 'unidades_por_caixa', 'quantidade',
      'preco', 'preco_custo', 'estoque_minimo', 'controlar_estoque', 'descricao'
    ];

    const payload: Record<string, any> = {};
    for (const key of allowedCols) {
      if ((prod as any)[key] !== undefined) {
        payload[key] = (prod as any)[key];
      }
    }

    let descAtual = payload.descricao !== undefined ? payload.descricao : (prod.descricao || '');
    if (prod.produto_pai_id && !descAtual.includes('[PAI:')) {
      descAtual = `${descAtual} [PAI:${prod.produto_pai_id}]`.trim();
    }
    if (prod.preco_custo !== undefined) {
      descAtual = descAtual.replace(/\[CUSTO:[^\]]+\]/g, '').trim();
      if (prod.preco_custo > 0) {
        descAtual = `${descAtual} [CUSTO:${prod.preco_custo}]`.trim();
      }
    }
    payload.descricao = descAtual;

    try {
      let { error } = await supabase.from('produtos').update(payload).eq('id', id);
      if (error && error.message?.includes('preco_custo')) {
        delete payload.preco_custo;
        const res2 = await supabase.from('produtos').update(payload).eq('id', id);
        error = res2.error;
      }
      if (error) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async deleteProduto(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async upsertProdutosBatch(prods: Produto010[]): Promise<boolean> {
    if (!isSupabaseConfigured() || prods.length === 0) return false;
    const payload = prods.map(prod => ({
      id: prod.id,
      nome: prod.nome,
      codigo: prod.codigo,
      codigo_barras: prod.codigo_barras || prod.codigo,
      categoria: prod.categoria || 'Bebidas',
      marca: prod.marca || '',
      tipo_embalagem: prod.tipo_embalagem || 'Unidade',
      unidades_por_caixa: prod.unidades_por_caixa || 1,
      quantidade: prod.quantidade || 0,
      preco: prod.preco || 0,
      estoque_minimo: prod.estoque_minimo || 5,
      controlar_estoque: prod.controlar_estoque !== undefined ? prod.controlar_estoque : true,
      descricao: prod.descricao || ''
    }));

    try {
      const { error } = await supabase.from('produtos').upsert(payload);
      if (error) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  // ================= VENDAS =================
  async fetchVendas(limit: number = 800, forceRefresh: boolean = false): Promise<Venda010[] | null> {
    if (!isSupabaseConfigured()) return null;

    if (!forceRefresh) {
      try {
        const cached = await idbCache.get<Venda010[]>('vendas_recentes');
        if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
          if (Date.now() - cached.timestamp < 45000) { // 45 segundos
            egressTracker.registrar('vendas', 'SELECT', cached.data, 'cache-local', true);
            return cached.data;
          }
        }
      } catch {}
    }

    try {
      const colunasOtimizadas = 'id, caixa_id, comanda_id, comanda_numero, numero_venda, data_hora, usuario, cliente_nome, produtos, subtotal, desconto_valor, desconto_porcentagem, total, forma_pagamento, pagamentos, parcelas_credito, valor_recebido, troco, status';
      let res: any = await supabase
        .from('vendas')
        .select(colunasOtimizadas)
        .order('data_hora', { ascending: false })
        .limit(limit);

      if (res.error) {
        // Fallback básico sem colunas extras caso a tabela esteja no esquema legado
        res = await supabase
          .from('vendas')
          .select('id, numero_venda, data_hora, usuario, cliente_nome, produtos, subtotal, desconto_valor, desconto_porcentagem, total, forma_pagamento, pagamentos, parcelas_credito, valor_recebido, troco, status')
          .order('data_hora', { ascending: false })
          .limit(limit);
      }

      const data = res.data;
      if (res.error || !Array.isArray(data)) {
        const fallback = await idbCache.get<Venda010[]>('vendas_recentes');
        if (fallback) return fallback.data;
        return null;
      }

      egressTracker.registrar('vendas', 'SELECT', data, 'supabase');

      const safeParseJson = (val: any, fallback: any = []) => {
        if (!val) return fallback;
        if (Array.isArray(val)) return val;
        if (typeof val === 'object') return val;
        if (typeof val === 'string') {
          try {
            const parsed = JSON.parse(val);
            return parsed !== null && parsed !== undefined ? parsed : fallback;
          } catch {
            return fallback;
          }
        }
        return fallback;
      };

      const mapped: Venda010[] = data.map(v => {
        const prods = safeParseJson(v.produtos, []);
        const pags = safeParseJson(v.pagamentos, []);
        const itemTaxa = Array.isArray(prods) ? prods.find((p: any) => p?.produto_id === 'taxa-deslocamento') : null;

        return {
          id: String(v.id),
          caixa_id: (v as any).caixa_id ? String((v as any).caixa_id) : undefined,
          comanda_id: (v as any).comanda_id ? String((v as any).comanda_id) : undefined,
          comanda_numero: (v as any).comanda_numero ? Number((v as any).comanda_numero) : undefined,
          numero_venda: Number(v.numero_venda) || 0,
          data_hora: String(v.data_hora),
          usuario: String(v.usuario || ''),
          cliente_nome: String(v.cliente_nome || 'Cliente Balcão'),
          produtos: Array.isArray(prods) ? prods : [],
          subtotal: Number(v.subtotal) || 0,
          desconto_valor: Number(v.desconto_valor) || 0,
          desconto_porcentagem: Number(v.desconto_porcentagem) || 0,
          taxa_deslocamento: itemTaxa ? Number(itemTaxa.subtotal) || 0 : undefined,
          total: Number(v.total) || 0,
          forma_pagamento: v.forma_pagamento || 'Pix',
          pagamentos: Array.isArray(pags) ? pags : [],
          parcelas_credito: v.parcelas_credito ? Number(v.parcelas_credito) : undefined,
          valor_recebido: Number(v.valor_recebido) || 0,
          troco: Number(v.troco) || 0,
          status: (v.status === 'Cancelada' ? 'Cancelada' : 'Concluída') as 'Concluída' | 'Cancelada'
        };
      });

      idbCache.set('vendas_recentes', mapped);
      return mapped;
    } catch {
      const fallback = await idbCache.get<Venda010[]>('vendas_recentes');
      if (fallback) return fallback.data;
      return null;
    }
  },

  // Consulta sob demanda por período para Relatórios e Histórico sem sobrecarregar o polling
  async fetchVendasPorPeriodo(dataInicio: string, dataFim?: string, limit: number = 300): Promise<Venda010[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const cacheKey = `vendas_periodo_${dataInicio}_${dataFim || 'hoje'}`;
      const cached = await idbCache.get<Venda010[]>(cacheKey);
      if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
        if (Date.now() - cached.timestamp < 120000) { // 2 minutos
          egressTracker.registrar('vendas_periodo', 'SELECT', cached.data, 'cache-local', true);
          return cached.data;
        }
      }

      const colunasOtimizadas = 'id, caixa_id, comanda_id, comanda_numero, numero_venda, data_hora, usuario, cliente_nome, produtos, subtotal, desconto_valor, desconto_porcentagem, total, forma_pagamento, pagamentos, parcelas_credito, valor_recebido, troco, status';
      let query = supabase
        .from('vendas')
        .select(colunasOtimizadas)
        .gte('data_hora', dataInicio);

      if (dataFim) {
        query = query.lte('data_hora', dataFim);
      }

      const { data, error } = await query.order('data_hora', { ascending: false }).limit(limit);
      if (error || !Array.isArray(data)) return [];

      egressTracker.registrar('vendas_periodo', 'SELECT', data, 'supabase');

      const safeParseJson = (val: any, fallback: any = []) => {
        if (!val) return fallback;
        if (Array.isArray(val)) return val;
        if (typeof val === 'object') return val;
        if (typeof val === 'string') {
          try {
            const parsed = JSON.parse(val);
            return parsed !== null && parsed !== undefined ? parsed : fallback;
          } catch {
            return fallback;
          }
        }
        return fallback;
      };

      const mapped: Venda010[] = data.map(v => ({
        id: String(v.id),
        caixa_id: (v as any).caixa_id ? String((v as any).caixa_id) : undefined,
        comanda_id: (v as any).comanda_id ? String((v as any).comanda_id) : undefined,
        comanda_numero: (v as any).comanda_numero ? Number((v as any).comanda_numero) : undefined,
        numero_venda: Number(v.numero_venda) || 0,
        data_hora: String(v.data_hora),
        usuario: String(v.usuario || ''),
        cliente_nome: String(v.cliente_nome || 'Cliente Balcão'),
        produtos: Array.isArray(safeParseJson(v.produtos)) ? safeParseJson(v.produtos) : [],
        subtotal: Number(v.subtotal) || 0,
        desconto_valor: Number(v.desconto_valor) || 0,
        desconto_porcentagem: Number(v.desconto_porcentagem) || 0,
        total: Number(v.total) || 0,
        forma_pagamento: v.forma_pagamento || 'Pix',
        pagamentos: Array.isArray(safeParseJson(v.pagamentos)) ? safeParseJson(v.pagamentos) : [],
        parcelas_credito: v.parcelas_credito ? Number(v.parcelas_credito) : undefined,
        valor_recebido: Number(v.valor_recebido) || 0,
        troco: Number(v.troco) || 0,
        status: (v.status === 'Cancelada' ? 'Cancelada' : 'Concluída') as 'Concluída' | 'Cancelada'
      }));

      idbCache.set(cacheKey, mapped);
      return mapped;
    } catch {
      return [];
    }
  },

  // Consulta sob demanda de todas as vendas de um caixa fechado específico
  async fetchVendasCaixa(caixaId: string): Promise<Venda010[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const cacheKey = `vendas_caixa_${caixaId}`;
      const cached = await idbCache.get<Venda010[]>(cacheKey);
      if (cached && Array.isArray(cached.data)) {
        egressTracker.registrar('vendas_caixa', 'SELECT', cached.data, 'cache-local', true);
        return cached.data;
      }

      const colunasOtimizadas = 'id, caixa_id, comanda_id, comanda_numero, numero_venda, data_hora, usuario, cliente_nome, produtos, subtotal, desconto_valor, desconto_porcentagem, total, forma_pagamento, pagamentos, parcelas_credito, valor_recebido, troco, status';
      const { data, error } = await supabase
        .from('vendas')
        .select(colunasOtimizadas)
        .eq('caixa_id', caixaId)
        .order('data_hora', { ascending: false });

      if (error || !Array.isArray(data)) return [];

      egressTracker.registrar('vendas_caixa', 'SELECT', data, 'supabase');
      const safeParseJson = (val: any) => {
        try { return typeof val === 'string' ? JSON.parse(val) : (val || []); } catch { return []; }
      };

      const mapped: Venda010[] = data.map(v => ({
        id: String(v.id),
        caixa_id: String(v.caixa_id),
        comanda_id: (v as any).comanda_id ? String((v as any).comanda_id) : undefined,
        comanda_numero: (v as any).comanda_numero ? Number((v as any).comanda_numero) : undefined,
        numero_venda: Number(v.numero_venda) || 0,
        data_hora: String(v.data_hora),
        usuario: String(v.usuario || ''),
        cliente_nome: String(v.cliente_nome || 'Cliente Balcão'),
        produtos: safeParseJson(v.produtos),
        subtotal: Number(v.subtotal) || 0,
        desconto_valor: Number(v.desconto_valor) || 0,
        desconto_porcentagem: Number(v.desconto_porcentagem) || 0,
        total: Number(v.total) || 0,
        forma_pagamento: v.forma_pagamento || 'Pix',
        pagamentos: safeParseJson(v.pagamentos),
        parcelas_credito: v.parcelas_credito ? Number(v.parcelas_credito) : undefined,
        valor_recebido: Number(v.valor_recebido) || 0,
        troco: Number(v.troco) || 0,
        status: (v.status === 'Cancelada' ? 'Cancelada' : 'Concluída') as 'Concluída' | 'Cancelada'
      }));

      idbCache.set(cacheKey, mapped);
      return mapped;
    } catch {
      return [];
    }
  },

  async insertVenda(venda: Partial<Venda010>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const basePayload: any = {
      id: venda.id,
      numero_venda: venda.numero_venda,
      data_hora: venda.data_hora || getNowIsoWithTimezone(),
      usuario: venda.usuario || 'admin',
      cliente_nome: venda.cliente_nome || 'Cliente Balcão',
      produtos: typeof venda.produtos === 'string' ? venda.produtos : JSON.stringify(venda.produtos || []),
      subtotal: venda.subtotal || 0,
      desconto_valor: venda.desconto_valor || 0,
      desconto_porcentagem: venda.desconto_porcentagem || 0,
      total: venda.total || 0,
      forma_pagamento: venda.forma_pagamento || 'Pix',
      pagamentos: typeof venda.pagamentos === 'string' ? venda.pagamentos : JSON.stringify(venda.pagamentos || []),
      parcelas_credito: venda.parcelas_credito,
      valor_recebido: venda.valor_recebido,
      troco: venda.troco || 0,
      status: venda.status || 'Concluída'
    };

    const fullPayload = {
      ...basePayload,
      ...(venda.caixa_id ? { caixa_id: venda.caixa_id } : {}),
      ...(venda.comanda_id ? { comanda_id: venda.comanda_id } : {}),
      ...(venda.comanda_numero ? { comanda_numero: venda.comanda_numero } : {})
    };

    try {
      const { error } = await supabase.from('vendas').insert([fullPayload]);
      if (error) {
        if (error.message && (error.message.includes('column') || error.message.includes('does not exist'))) {
          const { error: retryError } = await supabase.from('vendas').insert([basePayload]);
          if (retryError) return false;
          return true;
        }
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async upsertVendasBatch(vendList: Venda010[]): Promise<boolean> {
    if (!isSupabaseConfigured() || vendList.length === 0) return false;
    const fullPayload = vendList.map(venda => ({
      id: venda.id,
      numero_venda: venda.numero_venda,
      caixa_id: venda.caixa_id || null,
      comanda_id: venda.comanda_id || null,
      comanda_numero: venda.comanda_numero || null,
      data_hora: venda.data_hora || getNowIsoWithTimezone(),
      usuario: venda.usuario || 'admin',
      cliente_nome: venda.cliente_nome || 'Cliente Balcão',
      produtos: typeof venda.produtos === 'string' ? venda.produtos : JSON.stringify(venda.produtos || []),
      subtotal: venda.subtotal || 0,
      desconto_valor: venda.desconto_valor || 0,
      desconto_porcentagem: venda.desconto_porcentagem || 0,
      total: venda.total || 0,
      forma_pagamento: venda.forma_pagamento || 'Pix',
      pagamentos: typeof venda.pagamentos === 'string' ? venda.pagamentos : JSON.stringify(venda.pagamentos || []),
      parcelas_credito: venda.parcelas_credito ?? null,
      valor_recebido: venda.valor_recebido ?? null,
      troco: venda.troco || 0,
      status: venda.status || 'Concluída'
    }));

    try {
      const { error } = await supabase.from('vendas').upsert(fullPayload);
      if (error) {
        if (error.message && (error.message.includes('column') || error.message.includes('does not exist'))) {
          const simplePayload = fullPayload.map(({ caixa_id, comanda_id, comanda_numero, ...rest }) => rest);
          const { error: retryError } = await supabase.from('vendas').upsert(simplePayload);
          if (retryError) return false;
          return true;
        }
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async updateVenda(id: string, updates: Partial<Venda010>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase.from('vendas').update(updates).eq('id', id);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  },

  async deleteVenda(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase.from('vendas').delete().eq('id', id);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  },

  // ================= CAIXAS =================
  // Otimização extrema de Egress:
  // Carrega apenas os cabeçalhos numéricos dos caixas (sem o pesado JSONB movimentacoes histórico de 500KB)
  // e anexa as movimentações apenas do Caixa atualmente Aberto.
  async fetchCaixas(limit: number = 30, forceRefresh: boolean = false): Promise<Caixa010[] | null> {
    if (!isSupabaseConfigured()) return null;

    if (!forceRefresh) {
      try {
        const cached = await idbCache.get<Caixa010[]>('caixas_resumo');
        if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
          if (Date.now() - cached.timestamp < 30000) { // 30 segundos
            egressTracker.registrar('caixas', 'SELECT', cached.data, 'cache-local', true);
            return cached.data;
          }
        }
      } catch {}
    }

    try {
      // 1. Busca cabeçalhos sem o JSONB pesado
      const colunasHeader = 'id, data, status, usuario_abertura, usuario_fechamento, hora_abertura, hora_fechamento, valor_inicial, valor_vendas, valor_entradas, valor_saidas, valor_despesas, saldo_esperado, valor_informado, diferenca, observacao';
      const { data, error } = await supabase
        .from('caixas')
        .select(colunasHeader)
        .order('data', { ascending: false })
        .limit(limit);

      if (error || !Array.isArray(data)) {
        const fallback = await idbCache.get<Caixa010[]>('caixas_resumo');
        if (fallback) return fallback.data;
        return null;
      }

      egressTracker.registrar('caixas', 'SELECT', data, 'supabase');

      // 2. Busca movimentações detalhadas apenas se houver caixa com status 'Aberto'
      let openMovs: any[] = [];
      const openCaixa = data.find(c => c.status === 'Aberto');
      if (openCaixa) {
        try {
          const { data: openData } = await supabase
            .from('caixas')
            .select('movimentacoes')
            .eq('id', openCaixa.id)
            .single();
          if (openData?.movimentacoes) {
            openMovs = typeof openData.movimentacoes === 'string'
              ? JSON.parse(openData.movimentacoes)
              : openData.movimentacoes;
            egressTracker.registrar('caixas_open_movs', 'SELECT', openMovs, 'supabase');
          }
        } catch {}
      }

      const mapped: Caixa010[] = data.map(c => ({
        id: String(c.id),
        data: String(c.data),
        status: c.status,
        usuario_abertura: String(c.usuario_abertura || ''),
        usuario_fechamento: c.usuario_fechamento ? String(c.usuario_fechamento) : undefined,
        hora_abertura: String(c.hora_abertura || ''),
        hora_fechamento: c.hora_fechamento ? String(c.hora_fechamento) : undefined,
        valor_inicial: Number(c.valor_inicial) || 0,
        valor_vendas: Number(c.valor_vendas) || 0,
        valor_entradas: Number(c.valor_entradas) || 0,
        valor_saidas: Number(c.valor_saidas) || 0,
        valor_despesas: Number(c.valor_despesas) || 0,
        saldo_esperado: Number(c.saldo_esperado) || 0,
        valor_informado: c.valor_informado !== null && c.valor_informado !== undefined ? Number(c.valor_informado) : undefined,
        diferenca: c.diferenca !== null && c.diferenca !== undefined ? Number(c.diferenca) : undefined,
        observacao: c.observacao || undefined,
        movimentacoes: c.status === 'Aberto' ? openMovs : []
      }));

      const sorted = mapped.sort((a, b) => {
        if (a.status === 'Aberto' && b.status !== 'Aberto') return -1;
        if (a.status !== 'Aberto' && b.status === 'Aberto') return 1;
        return (b.data || '').localeCompare(a.data || '');
      });

      idbCache.set('caixas_resumo', sorted);
      return sorted;
    } catch {
      const fallback = await idbCache.get<Caixa010[]>('caixas_resumo');
      if (fallback) return fallback.data;
      return null;
    }
  },

  // Busca sob demanda o histórico de movimentações de um caixa fechado específico ao clicar em ver/imprimir
  async fetchCaixaMovimentacoes(caixaId: string): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const cacheKey = `caixa_movs_${caixaId}`;
      const cached = await idbCache.get<any[]>(cacheKey);
      if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
        egressTracker.registrar('caixa_detalhes_movs', 'SELECT', cached.data, 'cache-local', true);
        return cached.data;
      }

      const { data, error } = await supabase
        .from('caixas')
        .select('movimentacoes')
        .eq('id', caixaId)
        .single();

      if (error || !data) return [];

      egressTracker.registrar('caixa_detalhes_movs', 'SELECT', data.movimentacoes, 'supabase');
      const movs = typeof data.movimentacoes === 'string' ? JSON.parse(data.movimentacoes) : (data.movimentacoes || []);
      idbCache.set(cacheKey, movs);
      return movs;
    } catch {
      return [];
    }
  },

  async insertCaixa(caixa: Partial<Caixa010>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const payload = {
      id: caixa.id,
      data: caixa.data,
      status: caixa.status || 'Aberto',
      usuario_abertura: caixa.usuario_abertura || 'admin',
      hora_abertura: caixa.hora_abertura,
      valor_inicial: caixa.valor_inicial || 0,
      valor_vendas: caixa.valor_vendas || 0,
      valor_entradas: caixa.valor_entradas || 0,
      valor_saidas: caixa.valor_saidas || 0,
      valor_despesas: caixa.valor_despesas || 0,
      saldo_esperado: caixa.saldo_esperado || 0,
      observacao: caixa.observacao,
      movimentacoes: typeof caixa.movimentacoes === 'string' ? caixa.movimentacoes : JSON.stringify(caixa.movimentacoes || [])
    };

    try {
      const { error } = await supabase.from('caixas').upsert([payload]);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  },

  async updateCaixa(id: string, caixa: Partial<Caixa010>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const payload: any = { ...caixa, id };
    if (payload.movimentacoes && typeof payload.movimentacoes !== 'string') {
      payload.movimentacoes = JSON.stringify(payload.movimentacoes);
    }

    try {
      const { error } = await supabase.from('caixas').upsert([payload]);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  },

  async upsertCaixasBatch(caixasList: Caixa010[]): Promise<boolean> {
    if (!isSupabaseConfigured() || caixasList.length === 0) return false;
    const payload = caixasList.map(caixa => ({
      id: caixa.id,
      data: caixa.data,
      status: caixa.status || 'Aberto',
      usuario_abertura: caixa.usuario_abertura || 'admin',
      usuario_fechamento: caixa.usuario_fechamento ?? null,
      hora_abertura: caixa.hora_abertura ?? null,
      hora_fechamento: caixa.hora_fechamento ?? null,
      valor_inicial: caixa.valor_inicial || 0,
      valor_vendas: caixa.valor_vendas || 0,
      valor_entradas: caixa.valor_entradas || 0,
      valor_saidas: caixa.valor_saidas || 0,
      valor_despesas: caixa.valor_despesas || 0,
      saldo_esperado: caixa.saldo_esperado || 0,
      valor_informado: caixa.valor_informado ?? null,
      diferenca: caixa.diferenca ?? null,
      observacao: caixa.observacao ?? null,
      movimentacoes: typeof caixa.movimentacoes === 'string' ? caixa.movimentacoes : JSON.stringify(caixa.movimentacoes || [])
    }));

    try {
      const { error } = await supabase.from('caixas').upsert(payload);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  },

  // ================= CONTAS A RECEBER =================
  async fetchContasReceber(limit: number = 200): Promise<ContaReceber010[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const colunasOtimizadas = 'id, cliente_nome, venda_numero, valor_total, valor_recebido, status, data_vencimento, data_pagamento';
      const { data, error } = await supabase
        .from('contas_receber')
        .select(colunasOtimizadas)
        .order('data_vencimento', { ascending: true })
        .limit(limit);

      if (error || !Array.isArray(data)) {
        return null;
      }

      const mapped: ContaReceber010[] = data.map(c => ({
        id: String(c.id),
        cliente_nome: String(c.cliente_nome || ''),
        venda_numero: c.venda_numero ? Number(c.venda_numero) : undefined,
        valor_total: Number(c.valor_total) || 0,
        valor_recebido: Number(c.valor_recebido) || 0,
        status: c.status || 'Em Aberto',
        data_vencimento: String(c.data_vencimento || ''),
        data_pagamento: c.data_pagamento ? String(c.data_pagamento) : undefined
      }));

      return mapped;
    } catch {
      return null;
    }
  },

  async insertContaReceber(conta: Partial<ContaReceber010>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const payload = {
      id: conta.id,
      cliente_nome: conta.cliente_nome,
      venda_numero: conta.venda_numero,
      valor_total: conta.valor_total || 0,
      valor_recebido: conta.valor_recebido || 0,
      status: conta.status || 'Em Aberto',
      data_vencimento: conta.data_vencimento
    };

    try {
      const { error } = await supabase.from('contas_receber').insert([payload]);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  },

  async updateContaReceber(id: string, conta: Partial<ContaReceber010>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const payload: any = { ...conta };
    delete payload.id;

    try {
      const { error } = await supabase.from('contas_receber').update(payload).eq('id', id);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  },

  async upsertContasReceberBatch(contas: ContaReceber010[]): Promise<boolean> {
    if (!isSupabaseConfigured() || contas.length === 0) return false;
    const payload = contas.map(conta => ({
      id: conta.id,
      cliente_nome: conta.cliente_nome,
      venda_numero: conta.venda_numero ?? null,
      valor_total: conta.valor_total || 0,
      valor_recebido: conta.valor_recebido || 0,
      status: conta.status || 'Em Aberto',
      data_vencimento: conta.data_vencimento,
      data_pagamento: conta.data_pagamento ?? null
    }));

    try {
      const { error } = await supabase.from('contas_receber').upsert(payload);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  },

  // ================= MOVIMENTAÇÕES DE ESTOQUE =================
  async fetchMovimentacoes(limit: number = 50, forceRefresh: boolean = false): Promise<MovimentacaoEstoque010[] | null> {
    if (!isSupabaseConfigured()) return null;

    if (!forceRefresh) {
      try {
        const cached = await idbCache.get<MovimentacaoEstoque010[]>('movimentacoes_estoque');
        if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
          if (Date.now() - cached.timestamp < 60000) {
            egressTracker.registrar('movimentacoes_estoque', 'SELECT', cached.data, 'cache-local', true);
            return cached.data;
          }
        }
      } catch {}
    }

    try {
      const colunasOtimizadas = 'id, data_hora, produto_id, produto_nome, quantidade, tipo, usuario, observacao';
      const { data, error } = await supabase
        .from('movimentacoes_estoque')
        .select(colunasOtimizadas)
        .order('data_hora', { ascending: false })
        .limit(limit);

      if (error || !Array.isArray(data)) {
        const fallback = await idbCache.get<MovimentacaoEstoque010[]>('movimentacoes_estoque');
        if (fallback) return fallback.data;
        return null;
      }

      egressTracker.registrar('movimentacoes_estoque', 'SELECT', data, 'supabase');
      idbCache.set('movimentacoes_estoque', data);
      return data;
    } catch {
      const fallback = await idbCache.get<MovimentacaoEstoque010[]>('movimentacoes_estoque');
      if (fallback) return fallback.data;
      return null;
    }
  },

  async insertMovimentacao(mov: Partial<MovimentacaoEstoque010>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const payload = {
      id: mov.id,
      data_hora: mov.data_hora || getNowIsoWithTimezone(),
      produto_id: mov.produto_id,
      produto_nome: mov.produto_nome,
      quantidade: mov.quantidade || 0,
      tipo: mov.tipo || 'Entrada',
      usuario: mov.usuario || 'admin',
      observacao: mov.observacao
    };

    try {
      const { error } = await supabase.from('movimentacoes_estoque').insert([payload]);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  },

  async upsertMovimentacoesBatch(movs: MovimentacaoEstoque010[]): Promise<boolean> {
    if (!isSupabaseConfigured() || movs.length === 0) return false;
    const payload = movs.map(mov => ({
      id: mov.id,
      data_hora: mov.data_hora || getNowIsoWithTimezone(),
      produto_id: mov.produto_id,
      produto_nome: mov.produto_nome,
      quantidade: mov.quantidade || 0,
      tipo: mov.tipo || 'Entrada',
      usuario: mov.usuario || 'admin',
      observacao: mov.observacao
    }));

    try {
      const { error } = await supabase.from('movimentacoes_estoque').upsert(payload);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  },

  // ================= AUDIT LOGS =================
  async fetchAuditLogs(limit: number = 100): Promise<AuditLog010[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const colunasOtimizadas = 'id, data_hora, usuario, acao, registro_relacionado, detalhes';
      const { data, error } = await supabase
        .from('audit_logs')
        .select(colunasOtimizadas)
        .order('data_hora', { ascending: false })
        .limit(limit);

      if (error || !Array.isArray(data)) {
        return [];
      }
      return data;
    } catch {
      return [];
    }
  },

  async insertAuditLog(log: Partial<AuditLog010>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const payload = {
      id: log.id,
      data_hora: log.data_hora || getNowIsoWithTimezone(),
      usuario: log.usuario || 'admin',
      acao: log.acao,
      registro_relacionado: log.registro_relacionado,
      detalhes: log.detalhes
    };

    try {
      const { error } = await supabase.from('audit_logs').insert([payload]);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  },

  // ================= CONTAS E COMANDAS =================
  // Carrega todas as comandas ABERTAS ativas + comandas recentes com todos os itens consumidos mapeados
  async fetchContasComandas(limit: number = 100, forceRefresh: boolean = false): Promise<ContaComanda010[] | null> {
    if (!isSupabaseConfigured()) {
      try {
        const local = localStorage.getItem('010_contas_comandas');
        return local ? JSON.parse(local) : [];
      } catch {
        return [];
      }
    }

    if (!forceRefresh) {
      try {
        const cached = await idbCache.get<ContaComanda010[]>('contas_comandas_ativas');
        if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
          if (Date.now() - cached.timestamp < 30000) { // 30 segundos
            egressTracker.registrar('contas_comandas', 'SELECT', cached.data, 'cache-local', true);
            return cached.data;
          }
        }
      } catch {}
    }

    try {
      const colunasContas = 'id, numero_conta, cliente_nome, status, data_abertura, data_encerramento, usuario_abertura, usuario_encerramento, total, venda_id, venda_numero, observacao, created_at';
      
      // 1. Busca todas as abertas + até 100 mais recentes encerradas
      const [resOpen, resClosed] = await Promise.all([
        supabase
          .from('contas_comandas')
          .select(colunasContas)
          .eq('status', 'ABERTA')
          .order('numero_conta', { ascending: false }),
        supabase
          .from('contas_comandas')
          .select(colunasContas)
          .neq('status', 'ABERTA')
          .order('numero_conta', { ascending: false })
          .limit(limit)
      ]);

      const openData = Array.isArray(resOpen.data) ? resOpen.data : [];
      const closedData = Array.isArray(resClosed.data) ? resClosed.data : [];
      const contasData = [...openData, ...closedData];

      if (contasData.length === 0) {
        const local = localStorage.getItem('010_contas_comandas');
        return local ? JSON.parse(local) : [];
      }

      egressTracker.registrar('contas_comandas', 'SELECT', contasData, 'supabase');

      const contaIds = contasData.map((c: any) => String(c.id));

      // Busca paginada por lotes de comandas: contorna o limite de 1000 linhas por requisição
      // do Supabase, garantindo que TODOS os itens de TODAS as comandas carregadas venham.
      const buscarPorContas = async (tabela: string, colunas: string, ordem: string): Promise<any[]> => {
        const resultado: any[] = [];
        const tamanhoLote = 50;
        const tamanhoPagina = 1000;
        for (let i = 0; i < contaIds.length; i += tamanhoLote) {
          const lote = contaIds.slice(i, i + tamanhoLote);
          let inicio = 0;
          while (true) {
            const { data, error } = await supabase
              .from(tabela)
              .select(colunas)
              .in('conta_id', lote)
              .order(ordem, { ascending: true })
              .range(inicio, inicio + tamanhoPagina - 1);
            if (error) throw error;
            if (!Array.isArray(data)) break;
            resultado.push(...data);
            if (data.length < tamanhoPagina) break;
            inicio += tamanhoPagina;
          }
        }
        return resultado;
      };

      // 2. Busca itens consumidos de todas as comandas carregadas
      const colunasItens = 'id, conta_id, produto_id, produto_nome, produto_codigo, quantidade, preco_unitario, subtotal, data_lancamento, usuario, created_at';
      const itens = await buscarPorContas('contas_comandas_itens', colunasItens, 'data_lancamento');
      egressTracker.registrar('contas_comandas_itens', 'SELECT', itens, 'supabase');

      // 2.1. Busca pagamentos das contas carregadas
      let pagamentosData: any[] = [];
      try {
        const colunasPags = 'id, conta_id, data_hora, valor, forma_pagamento, usuario, venda_id, venda_numero, observacao, created_at';
        pagamentosData = await buscarPorContas('contas_comandas_pagamentos', colunasPags, 'data_hora');
        egressTracker.registrar('contas_comandas_pagamentos', 'SELECT', pagamentosData, 'supabase');
      } catch {}

      // Fallback: carrega pagamentos salvos localmente
      let localPagamentos: any[] = [];
      try {
        const lStr = localStorage.getItem('010_comandas_pagamentos');
        if (lStr) localPagamentos = JSON.parse(lStr);
      } catch {}

      // 3. Monta o mapa de itens e pagamentos por conta com total consolidado
      const contasComItens: ContaComanda010[] = contasData.map((c: any) => {
        const itensDaConta = itens
          .filter((it: any) => String(it.conta_id).trim() === String(c.id).trim())
          .map((it: any) => ({
            id: String(it.id),
            conta_id: String(it.conta_id),
            produto_id: String(it.produto_id),
            produto_nome: String(it.produto_nome),
            produto_codigo: it.produto_codigo ? String(it.produto_codigo) : undefined,
            quantidade: Number(it.quantidade) || 1,
            preco_unitario: Number(it.preco_unitario) || 0,
            subtotal: Number(it.subtotal) || 0,
            data_lancamento: it.data_lancamento || new Date().toISOString(),
            usuario: String(it.usuario || 'admin'),
            created_at: it.created_at
          }));

        // Junta pagamentos do Supabase, do metadado da observação [PAGOS:...] e do localStorage
        const pagsMap = new Map<string, any>();
        pagamentosData.filter((p: any) => String(p.conta_id).trim() === String(c.id).trim()).forEach(p => pagsMap.set(p.id, p));
        localPagamentos.filter((p: any) => String(p.conta_id).trim() === String(c.id).trim()).forEach(p => pagsMap.set(p.id, p));

        // Metadado na observação
        let obsLimpa = c.observacao ? String(c.observacao) : '';
        const matchPagos = obsLimpa.match(/\[PAGOS:([^\]]+)\]/);
        if (matchPagos) {
          try {
            const parsed = JSON.parse(decodeURIComponent(matchPagos[1]));
            if (Array.isArray(parsed)) {
              parsed.forEach((p: any) => pagsMap.set(p.id, p));
            }
          } catch {}
          obsLimpa = obsLimpa.replace(/\[PAGOS:[^\]]+\]/, '').trim();
        }

        const pagamentosDaConta: PagamentoContaComanda010[] = Array.from(pagsMap.values()).map((p: any) => ({
          id: String(p.id),
          conta_id: String(p.conta_id),
          data_hora: p.data_hora || getNowIsoWithTimezone(),
          valor: Number(p.valor) || 0,
          forma_pagamento: p.forma_pagamento,
          usuario: String(p.usuario || 'admin'),
          venda_id: p.venda_id ? String(p.venda_id) : undefined,
          venda_numero: p.venda_numero ? Number(p.venda_numero) : undefined,
          observacao: p.observacao,
          created_at: p.created_at
        }));

        const totalCalculado = round2(itensDaConta.reduce((acc, it) => acc + it.subtotal, 0));
        const totalConta = round2(c.total !== undefined && c.total !== null ? Number(c.total) : totalCalculado);
        const totalPago = round2(pagamentosDaConta.reduce((acc, p) => acc + p.valor, 0));
        const saldoRestante = round2(Math.max(0, totalConta - totalPago));

        return {
          id: String(c.id),
          numero_conta: Number(c.numero_conta) || 1000,
          cliente_nome: String(c.cliente_nome || 'Cliente'),
          status: (c.status || 'ABERTA') as 'ABERTA' | 'ENCERRADA' | 'CANCELADA',
          data_abertura: c.data_abertura || new Date().toISOString(),
          data_encerramento: c.data_encerramento || undefined,
          usuario_abertura: String(c.usuario_abertura || 'admin'),
          usuario_encerramento: c.usuario_encerramento ? String(c.usuario_encerramento) : undefined,
          total: totalConta,
          total_pago: totalPago,
          saldo_restante: saldoRestante,
          venda_id: c.venda_id ? String(c.venda_id) : undefined,
          venda_numero: c.venda_numero ? Number(c.venda_numero) : undefined,
          observacao: obsLimpa || undefined,
          itens: itensDaConta,
          pagamentos: pagamentosDaConta,
          created_at: c.created_at
        };
      });

      // Salva snapshot local para resiliência offline e transição suave
      try {
        localStorage.setItem('010_contas_comandas', JSON.stringify(contasComItens));
        idbCache.set('contas_comandas_ativas', contasComItens);
      } catch {}

      return contasComItens;
    } catch {
      try {
        const local = localStorage.getItem('010_contas_comandas');
        return local ? JSON.parse(local) : [];
      } catch {
        return [];
      }
    }
  },

  // Busca pontual de itens de uma comanda específica sob demanda
  async fetchItensContaComanda(contaId: string): Promise<ItemContaComanda010[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const colunasItens = 'id, conta_id, produto_id, produto_nome, produto_codigo, quantidade, preco_unitario, subtotal, data_lancamento, usuario, created_at';
      const { data, error } = await supabase
        .from('contas_comandas_itens')
        .select(colunasItens)
        .eq('conta_id', contaId)
        .order('data_lancamento', { ascending: true });

      if (error || !Array.isArray(data)) return [];

      return data.map(it => ({
        id: String(it.id),
        conta_id: String(it.conta_id),
        produto_id: String(it.produto_id),
        produto_nome: String(it.produto_nome),
        produto_codigo: it.produto_codigo ? String(it.produto_codigo) : undefined,
        quantidade: Number(it.quantidade) || 1,
        preco_unitario: Number(it.preco_unitario) || 0,
        subtotal: Number(it.subtotal) || 0,
        data_lancamento: it.data_lancamento || new Date().toISOString(),
        usuario: String(it.usuario || 'admin'),
        created_at: it.created_at
      }));
    } catch {
      return [];
    }
  },

  async insertContaComanda(conta: Partial<ContaComanda010>): Promise<boolean> {
    const payload = {
      id: conta.id,
      numero_conta: conta.numero_conta,
      cliente_nome: conta.cliente_nome,
      status: conta.status || 'ABERTA',
      data_abertura: conta.data_abertura || new Date().toISOString(),
      usuario_abertura: conta.usuario_abertura || 'admin',
      total: conta.total || 0,
      observacao: conta.observacao
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('contas_comandas').insert([payload]);
      } catch {}
    }
    return true;
  },

  async updateContaComanda(id: string, updates: Partial<ContaComanda010>): Promise<boolean> {
    const payload: any = { ...updates };
    delete payload.itens;

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('contas_comandas').update(payload).eq('id', id);
      } catch {}
    }
    return true;
  },

  async insertItemContaComanda(item: ItemContaComanda010): Promise<boolean> {
    const payload = {
      id: item.id,
      conta_id: item.conta_id,
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      produto_codigo: item.produto_codigo,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      subtotal: item.subtotal,
      data_lancamento: item.data_lancamento || new Date().toISOString(),
      usuario: item.usuario || 'admin'
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('contas_comandas_itens').insert([payload]);
      } catch {}
    }
    return true;
  },

  async updateItemContaComanda(itemId: string, quantidade: number, subtotal: number): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('contas_comandas_itens')
          .update({ quantidade, subtotal })
          .eq('id', itemId);
      } catch {}
    }
    return true;
  },

  async deleteItemContaComanda(itemId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('contas_comandas_itens')
          .delete()
          .eq('id', itemId);
      } catch {}
    }
    return true;
  },

  async encerrarContaComanda(
    contaId: string, 
    vendaId: string, 
    vendaNumero?: number, 
    usuario?: string
  ): Promise<boolean> {
    const payload = {
      status: 'ENCERRADA',
      venda_id: vendaId,
      venda_numero: vendaNumero,
      data_encerramento: new Date().toISOString(),
      usuario_encerramento: usuario || 'admin'
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('contas_comandas')
          .update(payload)
          .eq('id', contaId);
      } catch {}
    }
    return true;
  },

  async insertPagamentoContaComanda(pagamento: PagamentoContaComanda010): Promise<boolean> {
    const payload = {
      id: pagamento.id,
      conta_id: pagamento.conta_id,
      data_hora: pagamento.data_hora || getNowIsoWithTimezone(),
      valor: pagamento.valor,
      forma_pagamento: pagamento.forma_pagamento,
      usuario: pagamento.usuario || 'admin',
      venda_id: pagamento.venda_id,
      venda_numero: pagamento.venda_numero,
      observacao: pagamento.observacao
    };

    // 1. Salva no localStorage para garantia absoluta
    try {
      const lStr = localStorage.getItem('010_comandas_pagamentos');
      const list: any[] = lStr ? JSON.parse(lStr) : [];
      list.push(payload);
      localStorage.setItem('010_comandas_pagamentos', JSON.stringify(list));
    } catch {}

    // 2. Tenta inserir na tabela contas_comandas_pagamentos no Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('contas_comandas_pagamentos').insert([payload]);

        // 3. Espelha os pagamentos da conta no campo observacao de contas_comandas
        const { data: cData } = await supabase.from('contas_comandas').select('observacao').eq('id', pagamento.conta_id).single();
        let obsBase = cData?.observacao ? String(cData.observacao).replace(/\[PAGOS:[^\]]+\]/, '').trim() : '';
        
        const lStr = localStorage.getItem('010_comandas_pagamentos');
        const list: any[] = lStr ? JSON.parse(lStr) : [];
        const pagsDestaConta = list.filter((p: any) => p.conta_id === pagamento.conta_id);
        const metaTag = `[PAGOS:${encodeURIComponent(JSON.stringify(pagsDestaConta))}]`;
        const novaObs = obsBase ? `${obsBase} ${metaTag}` : metaTag;

        await supabase.from('contas_comandas').update({ observacao: novaObs }).eq('id', pagamento.conta_id);
      } catch {}
    }
    return true;
  },

  async deleteContaComanda(contaId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('contas_comandas_itens').delete().eq('conta_id', contaId);
        await supabase.from('contas_comandas_pagamentos').delete().eq('conta_id', contaId);
        await supabase.from('contas_comandas').delete().eq('id', contaId);
      } catch {}
    }
    return true;
  }
};

