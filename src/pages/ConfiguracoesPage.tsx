import React, { useState } from 'react';
import { Database, CheckCircle2, Copy, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';

interface ConfiguracoesPageProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  onSaveCredentials: (url: string, key: string) => void;
  onTestConnection: () => void;
  isTesting: boolean;
  testResult: { success: boolean; message: string; needTables?: boolean } | null;
}

export const ConfiguracoesPage: React.FC<ConfiguracoesPageProps> = ({
  supabaseUrl,
  supabaseAnonKey,
  onSaveCredentials,
  onTestConnection,
  isTesting,
  testResult
}) => {
  const [url, setUrl] = useState(supabaseUrl);
  const [key, setKey] = useState(supabaseAnonKey);
  const [copied, setCopied] = useState(false);

  const sqlSchemaText = `-- ===================================================
-- SCHEMA SUPABASE PARA DISTRIBUIDORA DE BEBIDAS
-- Copie e cole este código no SQL Editor do seu Supabase
-- ===================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_fantasia TEXT NOT NULL,
    cnpj_cpf TEXT,
    contato_nome TEXT,
    telefone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    codigo_barras TEXT,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    tipo_embalagem TEXT DEFAULT 'Garrafa 600ml',
    retornavel BOOLEAN DEFAULT false,
    preco_custo NUMERIC(10, 2) DEFAULT 0.00,
    preco_venda_unitario NUMERIC(10, 2) DEFAULT 0.00,
    preco_venda_fardo NUMERIC(10, 2),
    unidades_por_fardo INTEGER DEFAULT 1,
    estoque_atual INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 10,
    imagem_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    telefone TEXT,
    endereco TEXT,
    bairro TEXT,
    limite_fiado NUMERIC(10, 2) DEFAULT 0.00,
    saldo_devedor NUMERIC(10, 2) DEFAULT 0.00,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    tipo_venda TEXT DEFAULT 'Balcao',
    status TEXT DEFAULT 'Entregue',
    forma_pagamento TEXT DEFAULT 'PIX',
    subtotal NUMERIC(10, 2) DEFAULT 0.00,
    desconto NUMERIC(10, 2) DEFAULT 0.00,
    taxa_entrega NUMERIC(10, 2) DEFAULT 0.00,
    valor_total NUMERIC(10, 2) DEFAULT 0.00,
    valor_pago NUMERIC(10, 2) DEFAULT 0.00,
    troco NUMERIC(10, 2) DEFAULT 0.00,
    cascos_devolvidos INTEGER DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.itens_venda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    produto_nome TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    is_fardo BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.movimentacoes_caixa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL,
    categoria TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    forma_pagamento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_caixa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo em categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em fornecedores" ON public.fornecedores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em vendas" ON public.vendas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em itens_venda" ON public.itens_venda FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em movimentacoes_caixa" ON public.movimentacoes_caixa FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.categorias (nome, descricao) VALUES
('Cervejas', 'Cervejas lata, garrafa, retornáveis e artesanais'),
('Refrigerantes', 'Refrigerantes pet, lata e garrafas de vidro'),
('Destilados', 'Whisky, Vodka, Cachaça, Gin e Licores'),
('Vinhos & Espumantes', 'Vinhos de mesa, finos e espumantes'),
('Águas & Energéticos', 'Água mineral com e sem gás, energéticos e isotônicos'),
('Gelo & Petiscos', 'Sacos de gelo, carvão, amendoins e petiscos')
ON CONFLICT (nome) DO NOTHING;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchemaText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCredentials(url, key);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-500" />
          <span>Configuração e Conexão Supabase</span>
        </h1>
        <p className="text-xs text-slate-400">Gerencie a conexão e crie as tabelas no seu projeto Supabase</p>
      </div>

      {/* Card Status Conexão */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Projeto Supabase Atual</span>
            <div className="text-sm font-bold text-slate-200 mt-0.5">{url || 'Não configurado'}</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onTestConnection}
              disabled={isTesting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testando...' : 'Testar Conexão Supabase'}</span>
            </button>

            <a
              href="https://supabase.com/dashboard/project/oouwhmhlfqobkhfgwqbl/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
            >
              <span>Abrir SQL Editor do Supabase</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {testResult && (
          <div className={`p-4 rounded-xl text-xs flex items-start gap-3 ${
            testResult.success
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
          }`}>
            {testResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <div>
              <div className="font-bold text-sm">{testResult.success ? 'Conexão OK!' : 'Aviso do Banco Supabase'}</div>
              <div>{testResult.message}</div>
            </div>
          </div>
        )}
      </div>

      {/* Formulário de Credenciais */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-slate-100 text-base">Credenciais de API do Supabase</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">SUPABASE URL</label>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">SUPABASE ANON KEY</label>
            <input
              type="text"
              required
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all"
          >
            Salvar Credenciais
          </button>
        </form>
      </div>

      {/* Gerador de Tabelas SQL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="font-bold text-slate-100 text-base flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-500" />
              <span>Script de Criação das Tabelas no Supabase (SQL DDL)</span>
            </h2>
            <p className="text-xs text-slate-400">Copie o SQL abaixo e cole no SQL Editor do Supabase para criar as tabelas automaticamente</p>
          </div>

          <button
            onClick={handleCopySql}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              copied
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>{copied ? 'SQL Copiado com Sucesso!' : 'Copiar SQL (1-Clique)'}</span>
          </button>
        </div>

        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-amber-300/90 overflow-x-auto max-h-80 overflow-y-auto">
          {sqlSchemaText}
        </pre>
      </div>
    </div>
  );
};
