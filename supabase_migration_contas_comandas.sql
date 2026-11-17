-- =====================================================================
-- MIGRATION: MÓDULO DE CONTAS E COMANDAS DA DISTRIBUIDORA
-- Permite controle de consumo de clientes no balcão/mesa/proximidades
-- Integrado ao PDV, produtos, estoque, caixa e auditoria
-- =====================================================================

-- 1. TABELA PRINCIPAL DE CONTAS/COMANDAS
CREATE TABLE IF NOT EXISTS public.contas_comandas (
    id TEXT PRIMARY KEY,
    numero_conta INTEGER NOT NULL,
    cliente_nome TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ABERTA', -- 'ABERTA' | 'ENCERRADA' | 'CANCELADA'
    data_abertura TIMESTAMPTZ DEFAULT NOW(),
    data_encerramento TIMESTAMPTZ,
    usuario_abertura TEXT DEFAULT 'admin',
    usuario_encerramento TEXT,
    total NUMERIC(10,2) DEFAULT 0.00,
    venda_id TEXT,
    venda_numero INTEGER,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE ITENS DA COMANDA
CREATE TABLE IF NOT EXISTS public.contas_comandas_itens (
    id TEXT PRIMARY KEY,
    conta_id TEXT NOT NULL REFERENCES public.contas_comandas(id) ON DELETE CASCADE,
    produto_id TEXT NOT NULL,
    produto_nome TEXT NOT NULL,
    produto_codigo TEXT,
    quantidade INTEGER NOT NULL DEFAULT 1,
    preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    data_lancamento TIMESTAMPTZ DEFAULT NOW(),
    usuario TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ÍNDICES PARA BUSCA RÁPIDA
CREATE INDEX IF NOT EXISTS idx_contas_comandas_status ON public.contas_comandas(status);
CREATE INDEX IF NOT EXISTS idx_contas_comandas_numero ON public.contas_comandas(numero_conta);
CREATE INDEX IF NOT EXISTS idx_contas_comandas_cliente ON public.contas_comandas(cliente_nome);
CREATE INDEX IF NOT EXISTS idx_contas_comandas_itens_conta ON public.contas_comandas_itens(conta_id);

-- 4. SEGURANÇA E RLS (ROW LEVEL SECURITY)
ALTER TABLE public.contas_comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_comandas_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Contas Comandas" ON public.contas_comandas;
CREATE POLICY "Permissao Total Contas Comandas" ON public.contas_comandas FOR ALL USING (true);

DROP POLICY IF EXISTS "Permissao Total Contas Comandas Itens" ON public.contas_comandas_itens;
CREATE POLICY "Permissao Total Contas Comandas Itens" ON public.contas_comandas_itens FOR ALL USING (true);
