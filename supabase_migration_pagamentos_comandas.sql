-- =====================================================================
-- MIGRATION: HISTÓRICO DE PAGAMENTOS DE COMANDAS (PARCIAIS E TOTAIS)
-- Permite pagamentos de metade, valores parciais e quitação de comandas
-- Integrado com o Caixa, PDV e relatórios financeiros
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.contas_comandas_pagamentos (
    id TEXT PRIMARY KEY,
    conta_id TEXT NOT NULL REFERENCES public.contas_comandas(id) ON DELETE CASCADE,
    data_hora TIMESTAMPTZ DEFAULT NOW(),
    valor NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    forma_pagamento TEXT NOT NULL, -- 'Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito'
    usuario TEXT DEFAULT 'admin',
    venda_id TEXT,
    venda_numero INTEGER,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_comandas_pagamentos_conta ON public.contas_comandas_pagamentos(conta_id);
CREATE INDEX IF NOT EXISTS idx_comandas_pagamentos_data ON public.contas_comandas_pagamentos(data_hora);

-- RLS (Row Level Security)
ALTER TABLE public.contas_comandas_pagamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao Total Contas Comandas Pagamentos" ON public.contas_comandas_pagamentos;
CREATE POLICY "Permissao Total Contas Comandas Pagamentos" ON public.contas_comandas_pagamentos FOR ALL USING (true);
