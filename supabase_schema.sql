CREATE TABLE IF NOT EXISTS public.produtos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    codigo TEXT NOT NULL,
    codigo_barras TEXT,
    categoria TEXT DEFAULT 'Bebidas',
    marca TEXT,
    tipo_embalagem TEXT DEFAULT 'Unidade',
    unidades_por_caixa INTEGER DEFAULT 1,
    quantidade INTEGER DEFAULT 0,
    preco NUMERIC(10,2) DEFAULT 0.00,
    estoque_minimo INTEGER DEFAULT 5,
    controlar_estoque BOOLEAN DEFAULT true,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendas (
    id TEXT PRIMARY KEY,
    numero_venda INTEGER NOT NULL,
    data_hora TIMESTAMPTZ DEFAULT NOW(),
    usuario TEXT DEFAULT 'admin',
    cliente_nome TEXT DEFAULT 'Cliente Balcão',
    produtos JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(10,2) DEFAULT 0.00,
    desconto_valor NUMERIC(10,2) DEFAULT 0.00,
    desconto_porcentagem NUMERIC(10,2) DEFAULT 0.00,
    total NUMERIC(10,2) DEFAULT 0.00,
    forma_pagamento TEXT NOT NULL,
    pagamentos JSONB DEFAULT '[]'::jsonb,
    parcelas_credito INTEGER,
    valor_recebido NUMERIC(10,2),
    troco NUMERIC(10,2) DEFAULT 0.00,
    status TEXT DEFAULT 'Concluída',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
    id TEXT PRIMARY KEY,
    data_hora TIMESTAMPTZ DEFAULT NOW(),
    produto_id TEXT NOT NULL,
    produto_nome TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    usuario TEXT DEFAULT 'admin',
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contas_receber (
    id TEXT PRIMARY KEY,
    cliente_nome TEXT NOT NULL,
    venda_numero INTEGER,
    valor_total NUMERIC(10,2) NOT NULL,
    valor_recebido NUMERIC(10,2) DEFAULT 0.00,
    status TEXT DEFAULT 'Em Aberto',
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.caixas (
    id TEXT PRIMARY KEY,
    data DATE NOT NULL,
    status TEXT DEFAULT 'Aberto',
    usuario_abertura TEXT DEFAULT 'admin',
    usuario_fechamento TEXT,
    hora_abertura TEXT,
    hora_fechamento TEXT,
    valor_inicial NUMERIC(10,2) DEFAULT 0.00,
    valor_vendas NUMERIC(10,2) DEFAULT 0.00,
    valor_entradas NUMERIC(10,2) DEFAULT 0.00,
    valor_saidas NUMERIC(10,2) DEFAULT 0.00,
    valor_despesas NUMERIC(10,2) DEFAULT 0.00,
    saldo_esperado NUMERIC(10,2) DEFAULT 0.00,
    valor_informado NUMERIC(10,2),
    diferenca NUMERIC(10,2),
    observacao TEXT,
    movimentacoes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    data_hora TIMESTAMPTZ DEFAULT NOW(),
    usuario TEXT DEFAULT 'admin',
    acao TEXT NOT NULL,
    registro_relacionado TEXT,
    detalhes TEXT
);

CREATE TABLE IF NOT EXISTS public.notificacoes (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT DEFAULT 'info',
    data_hora TIMESTAMPTZ DEFAULT NOW(),
    lida BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.config_empresa (
    id INTEGER PRIMARY KEY DEFAULT 1,
    nome TEXT DEFAULT '010 Distribuidora de Bebidas',
    cnpj TEXT DEFAULT '12.345.678/0001-90',
    telefone TEXT DEFAULT '(11) 99999-0101',
    endereco TEXT DEFAULT 'Av. Comercial, 1010 - Centro',
    logo_url TEXT
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Produtos" ON public.produtos;
CREATE POLICY "Permissao Total Produtos" ON public.produtos FOR ALL USING (true);

DROP POLICY IF EXISTS "Permissao Total Vendas" ON public.vendas;
CREATE POLICY "Permissao Total Vendas" ON public.vendas FOR ALL USING (true);

DROP POLICY IF EXISTS "Permissao Total Movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Permissao Total Movimentacoes" ON public.movimentacoes_estoque FOR ALL USING (true);

DROP POLICY IF EXISTS "Permissao Total Contas" ON public.contas_receber;
CREATE POLICY "Permissao Total Contas" ON public.contas_receber FOR ALL USING (true);

DROP POLICY IF EXISTS "Permissao Total Caixas" ON public.caixas;
CREATE POLICY "Permissao Total Caixas" ON public.caixas FOR ALL USING (true);

DROP POLICY IF EXISTS "Permissao Total Audit" ON public.audit_logs;
CREATE POLICY "Permissao Total Audit" ON public.audit_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Permissao Total Notificacoes" ON public.notificacoes;
CREATE POLICY "Permissao Total Notificacoes" ON public.notificacoes FOR ALL USING (true);

DROP POLICY IF EXISTS "Permissao Total Config" ON public.config_empresa;
CREATE POLICY "Permissao Total Config" ON public.config_empresa FOR ALL USING (true);

INSERT INTO public.produtos (id, nome, codigo, codigo_barras, categoria, tipo_embalagem, unidades_por_caixa, quantidade, preco, estoque_minimo, controlar_estoque, descricao)
VALUES 
  ('p-1', 'Cerveja Skol 600ml Garrafa (Unidade)', '7891149010101', '7891149010101', 'Cervejas', 'Unidade', 1, 120, 6.50, 24, true, 'Garrafa retornável 600ml'),
  ('p-1-cx', 'Cerveja Skol 600ml Garrafa (Caixa c/ 24)', '7891149010101-CX', '7891149010101-CX', 'Cervejas', 'Caixa', 24, 15, 144.00, 3, true, 'Caixa com 24 garrafas'),
  ('p-2', 'Heineken Long Neck 330ml (Unidade)', '7891149020202', '7891149020202', 'Cervejas', 'Unidade', 1, 85, 7.90, 18, true, 'Long Neck 330ml'),
  ('p-2-cx', 'Heineken Long Neck 330ml (Fardo c/ 12)', '7891149020202-CX', '7891149020202-CX', 'Cervejas', 'Fardo', 12, 10, 90.00, 2, true, 'Fardo com 12 unidades'),
  ('p-3', 'Coca-Cola 2 Litros PET', '7894900011517', '7894900011517', 'Refrigerantes', 'Unidade', 1, 45, 9.50, 12, true, 'Embalagem PET 2L'),
  ('p-4', 'Whisky Red Label 1L', '5000267014005', '5000267014005', 'Destilados', 'Unidade', 1, 12, 98.00, 4, true, 'Garrafa 1 Litro'),
  ('p-5', 'Energético Red Bull 250ml', '9002490100070', '9002490100070', 'Energéticos', 'Unidade', 1, 60, 10.50, 15, true, 'Lata 250ml'),
  ('p-6', 'Gelo em Cubos 5kg', '7898901234567', '7898901234567', 'Gelo e Conveniência', 'Unidade', 1, 30, 12.00, 10, true, 'Saco de gelo 5kg')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.config_empresa (id, nome, cnpj, telefone, endereco)
VALUES (1, '010 Distribuidora de Bebidas', '12.345.678/0001-90', '(11) 99999-0101', 'Av. Comercial, 1010 - Centro')
ON CONFLICT (id) DO NOTHING;

-- CONTAS E COMANDAS
CREATE TABLE IF NOT EXISTS public.contas_comandas (
    id TEXT PRIMARY KEY,
    numero_conta INTEGER NOT NULL,
    cliente_nome TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ABERTA',
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

ALTER TABLE public.contas_comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_comandas_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Contas Comandas" ON public.contas_comandas;
CREATE POLICY "Permissao Total Contas Comandas" ON public.contas_comandas FOR ALL USING (true);

DROP POLICY IF EXISTS "Permissao Total Contas Comandas Itens" ON public.contas_comandas_itens;
CREATE POLICY "Permissao Total Contas Comandas Itens" ON public.contas_comandas_itens FOR ALL USING (true);
