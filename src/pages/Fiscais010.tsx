import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  Settings, 
  FileCheck, 
  Ban, 
  Search, 
  Globe, 
  Key, 
  Award, 
  Printer, 
  Check, 
  Zap, 
  RefreshCw, 
  Download, 
  Sliders, 
  Building2, 
  Info,
  QrCode,
  FileSpreadsheet
} from 'lucide-react';

export interface ConfigFiscal010 {
  modoEmissao: 'nfce' | 'nfe' | 'recibo_nao_fiscal' | 'sat' | 'sem_emissao';
  ufSefaz: string;
  ambiente: 'homologacao' | 'producao';
  regimeTributario: 'simples' | 'simples_excesso' | 'normal';
  certificadoNome?: string;
  certificadoSenha?: string;
  certificadoValidade?: string;
  cscTokenId: string;
  cscTokenCodigo: string;
  nfceSerie: number;
  nfceNumeroAtual: number;
  nfeSerie: number;
  nfeNumeroAtual: number;
  imprimirAutomatico: boolean;
}

export const Fiscais010: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'modo_emissao' | 'conexao_sefaz' | 'notas_emitidas'>('modo_emissao');

  const defaultConfig: ConfigFiscal010 = {
    modoEmissao: 'nfce',
    ufSefaz: 'TO',
    ambiente: 'homologacao',
    regimeTributario: 'simples',
    certificadoNome: 'Certificado_A1_Bar_do_Lima.pfx',
    certificadoValidade: '15/10/2027',
    cscTokenId: '000001',
    cscTokenCodigo: 'A1B2C3D4E5F678901234567890ABCDEF',
    nfceSerie: 1,
    nfceNumeroAtual: 1042,
    nfeSerie: 1,
    nfeNumeroAtual: 512,
    imprimirAutomatico: true
  };

  const [configFiscal, setConfigFiscal] = useState<ConfigFiscal010>(() => {
    try {
      const saved = localStorage.getItem('010_config_fiscal');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultConfig;
  });

  const [savedSuccessMsg, setSavedSuccessMsg] = useState(false);
  const [testingSefaz, setTestingSefaz] = useState(false);
  const [sefazStatus, setSefazStatus] = useState<{ status: 'online' | 'offline' | 'idle'; msg: string }>({
    status: 'online',
    msg: 'Serviço SEFAZ em Operação (Status 107 - Resposta 12ms)'
  });

  useEffect(() => {
    try {
      localStorage.setItem('010_config_fiscal', JSON.stringify(configFiscal));
    } catch (e) {}
  }, [configFiscal]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccessMsg(true);
    setTimeout(() => setSavedSuccessMsg(false), 3000);
  };

  const handleTestSefaz = () => {
    setTestingSefaz(true);
    setSefazStatus({ status: 'idle', msg: 'Verificando comunicação com servidores da SEFAZ...' });
    
    setTimeout(() => {
      setTestingSefaz(false);
      setSefazStatus({
        status: 'online',
        msg: `SEFAZ ${configFiscal.ufSefaz} [${configFiscal.ambiente.toUpperCase()}]: Conexão Autorizada (Status 107 - Serviço em Operação)`
      });
    }, 1800);
  };

  const ModosEmissaoList = [
    {
      id: 'nfce',
      titulo: 'NFC-e (Nota Fiscal de Consumidor)',
      subtitulo: 'Modelo 65 • Cupom fiscal eletrônico para vendas rápidas no balcão',
      icon: QrCode,
      tag: 'Recomendado PDV',
      color: 'border-orange-500 bg-orange-500/10 text-orange-400'
    },
    {
      id: 'nfe',
      titulo: 'NF-e (Nota Fiscal Eletrônica)',
      subtitulo: 'Modelo 55 • Nota fiscal completa de atacado para estabelecimentos e CNPJ',
      icon: FileSpreadsheet,
      tag: 'Atacado & Bares',
      color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
    },
    {
      id: 'recibo_nao_fiscal',
      titulo: 'Comprovante / Recibo Não-Fiscal',
      subtitulo: 'Impressão direta em impressora térmica (80mm/58mm) sem envio à SEFAZ',
      icon: Printer,
      tag: 'Rápido & Não-Fiscal',
      color: 'border-blue-500 bg-blue-500/10 text-blue-400'
    },
    {
      id: 'sat',
      titulo: 'SAT / MF-e Eletrônico',
      subtitulo: 'Sistema de Autenticação e Transmissão via equipamento físico SAT',
      icon: Zap,
      tag: 'Equipamento Físico',
      color: 'border-purple-500 bg-purple-500/10 text-purple-400'
    },
    {
      id: 'sem_emissao',
      titulo: 'Sem Emissão Fiscal (Apenas Registro)',
      subtitulo: 'Apenas gravação da venda no sistema interno, sem recibo impresso',
      icon: Ban,
      tag: 'Somente Controle',
      color: 'border-zinc-700 bg-zinc-900 text-zinc-400'
    }
  ];

  const ufsList = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
    'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 
    'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-in fade-in duration-150 text-zinc-100">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-zinc-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            <span>Módulo de Documentos Fiscais & SEFAZ</span>
          </h1>
          <p className="text-xs text-zinc-400">Seleção de saída de nota fiscal, integração com SEFAZ e Certificado Digital A1</p>
        </div>

        {/* Status de Conexão SEFAZ */}
        <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded-2xl border border-zinc-800 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-black text-zinc-200">SEFAZ-{configFiscal.ufSefaz}</span>
          <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase">
            {configFiscal.ambiente}
          </span>
        </div>
      </div>

      {/* Sub-abas de Navegação */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('modo_emissao')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'modo_emissao'
              ? 'bg-orange-500 text-zinc-950 font-black shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Como vai sair a Nota Fiscal</span>
        </button>

        <button
          onClick={() => setActiveTab('conexao_sefaz')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'conexao_sefaz'
              ? 'bg-orange-500 text-zinc-950 font-black shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Conectar à SEFAZ & Certificado</span>
        </button>

        <button
          onClick={() => setActiveTab('notas_emitidas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'notas_emitidas'
              ? 'bg-orange-500 text-zinc-950 font-black shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Notas Emitidas & XMLs</span>
        </button>
      </div>

      {savedSuccessMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-2xl text-xs flex items-center gap-2 font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configurações fiscais salvas com sucesso!</span>
        </div>
      )}

      {/* ABA 1: COMO VAI SAIR A NOTA FISCAL */}
      {activeTab === 'modo_emissao' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="border-b border-zinc-800 pb-3">
              <h2 className="text-base font-black text-zinc-100 flex items-center gap-2">
                <Printer className="w-5 h-5 text-orange-500" />
                <span>Selecione o Modo Padrão de Emissão de Nota Fiscal</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Escolha como o sistema irá emitir o comprovante ao finalizar cada venda no PDV</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ModosEmissaoList.map((m) => {
                const Icon = m.icon;
                const isSelected = configFiscal.modoEmissao === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => setConfigFiscal({ ...configFiscal, modoEmissao: m.id as any })}
                    className={`p-5 rounded-3xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 relative ${
                      isSelected
                        ? 'bg-zinc-950 border-orange-500 shadow-xl shadow-orange-500/10'
                        : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl border ${m.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-zinc-100">{m.titulo}</h3>
                          <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-md text-[10px] font-black">
                            {m.tag}
                          </span>
                        </div>
                      </div>

                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                        isSelected ? 'bg-orange-500 border-orange-500 text-zinc-950' : 'border-zinc-700 bg-zinc-900'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                      {m.subtitulo}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opções de Impressão */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4 max-w-xl">
            <h3 className="font-black text-zinc-100 text-sm border-b border-zinc-800 pb-2">Preferências de Saída & Impressão</h3>
            <div className="flex items-center justify-between p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800 text-xs">
              <div>
                <span className="font-bold text-zinc-200 block">Imprimir automaticamente ao concluir venda</span>
                <span className="text-[11px] text-zinc-400">Enviar cupom direto para a impressora configurada</span>
              </div>
              <button
                type="button"
                onClick={() => setConfigFiscal({ ...configFiscal, imprimirAutomatico: !configFiscal.imprimirAutomatico })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  configFiscal.imprimirAutomatico ? 'bg-orange-500' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                    configFiscal.imprimirAutomatico ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CONECTAR À SEFAZ & CERTIFICADO DIGITAL */}
      {activeTab === 'conexao_sefaz' && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          {/* Card Status Conexão SEFAZ */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 pb-4 gap-3">
              <div>
                <h2 className="text-base font-black text-zinc-100 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-orange-500" />
                  <span>Conexão & Integração com SEFAZ</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">Parâmetros de comunicação, ambiente e token CSC de autorização fiscal</p>
              </div>

              <button
                type="button"
                disabled={testingSefaz}
                onClick={handleTestSefaz}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${testingSefaz ? 'animate-spin' : ''}`} />
                <span>Testar Conexão com a SEFAZ</span>
              </button>
            </div>

            {/* Banner de Status do Teste */}
            <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
              sefazStatus.status === 'online'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-950 border-zinc-800 text-zinc-300'
            }`}>
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="font-bold">{sefazStatus.msg}</span>
            </div>

            {/* Campos de Conexão SEFAZ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Estado (UF da SEFAZ) *</label>
                <select
                  value={configFiscal.ufSefaz}
                  onChange={(e) => setConfigFiscal({ ...configFiscal, ufSefaz: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 font-bold focus:border-orange-500 outline-none"
                >
                  {ufsList.map(uf => (
                    <option key={uf} value={uf}>SEFAZ {uf}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Ambiente da SEFAZ *</label>
                <select
                  value={configFiscal.ambiente}
                  onChange={(e) => setConfigFiscal({ ...configFiscal, ambiente: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 font-bold focus:border-orange-500 outline-none"
                >
                  <option value="homologacao">Homologação (Ambiente de Testes)</option>
                  <option value="producao">Produção (Validade Jurídica Oficial)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Regime Tributário *</label>
                <select
                  value={configFiscal.regimeTributario}
                  onChange={(e) => setConfigFiscal({ ...configFiscal, regimeTributario: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 font-bold focus:border-orange-500 outline-none"
                >
                  <option value="simples">1 — Simples Nacional</option>
                  <option value="simples_excesso">2 — Simples Nacional (Excesso Sublimite)</option>
                  <option value="normal">3 — Regime Normal (Lucro Presumido / Real)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card Certificado Digital A1 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <h2 className="text-base font-black text-zinc-100 flex items-center gap-2">
                <Key className="w-5 h-5 text-orange-500" />
                <span>Certificado Digital A1 (.PFX / .P12)</span>
              </h2>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[11px] font-black flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Certificado Válido</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Arquivo do Certificado A1</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={configFiscal.certificadoNome || ''}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
                  />
                  <label className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-orange-400 font-bold rounded-xl cursor-pointer shrink-0 border border-zinc-700">
                    <span>Procurar...</span>
                    <input type="file" accept=".pfx,.p12" className="hidden" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setConfigFiscal({ ...configFiscal, certificadoNome: e.target.files[0].name });
                      }
                    }} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Senha do Certificado Digital</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={configFiscal.certificadoSenha || ''}
                  onChange={(e) => setConfigFiscal({ ...configFiscal, certificadoSenha: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card Token CSC & Numeração de Séries */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="border-b border-zinc-800 pb-3">
              <h2 className="text-base font-black text-zinc-100 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-orange-500" />
                <span>Token CSC (Código de Segurança do Contribuinte) & Séries</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Gerados no portal da SEFAZ para autenticação do QR Code da NFC-e</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">ID do Token CSC *</label>
                <input
                  type="text"
                  placeholder="Ex: 000001"
                  value={configFiscal.cscTokenId}
                  onChange={(e) => setConfigFiscal({ ...configFiscal, cscTokenId: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Código do Token CSC *</label>
                <input
                  type="text"
                  placeholder="Ex: A1B2C3D4E5F67890..."
                  value={configFiscal.cscTokenCodigo}
                  onChange={(e) => setConfigFiscal({ ...configFiscal, cscTokenCodigo: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">NFC-e — Série & Próximo Número</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={configFiscal.nfceSerie}
                    onChange={(e) => setConfigFiscal({ ...configFiscal, nfceSerie: parseInt(e.target.value, 10) || 1 })}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-bold"
                    placeholder="Série"
                  />
                  <input
                    type="number"
                    value={configFiscal.nfceNumeroAtual}
                    onChange={(e) => setConfigFiscal({ ...configFiscal, nfceNumeroAtual: parseInt(e.target.value, 10) || 1 })}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-orange-400 font-black"
                    placeholder="Número"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">NF-e — Série & Próximo Número</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={configFiscal.nfeSerie}
                    onChange={(e) => setConfigFiscal({ ...configFiscal, nfeSerie: parseInt(e.target.value, 10) || 1 })}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-bold"
                    placeholder="Série"
                  />
                  <input
                    type="number"
                    value={configFiscal.nfeNumeroAtual}
                    onChange={(e) => setConfigFiscal({ ...configFiscal, nfeNumeroAtual: parseInt(e.target.value, 10) || 1 })}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-orange-400 font-black"
                    placeholder="Número"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                <span>Salvar Configuração Fiscal & SEFAZ</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ABA 3: NOTAS EMITIDAS, XMLs & DANFE */}
      {activeTab === 'notas_emitidas' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-base font-black text-zinc-100 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-orange-500" />
              <span>Documentos Fiscais Transmitidos & Downloads</span>
            </h2>
            <span className="text-xs text-zinc-400 font-bold">2 notas transmitidas hoje</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Número / Chave de Acesso</th>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-center">Status SEFAZ</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                <tr className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-black text-orange-400">NFC-e #1042</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-300">1726091042000100650010000010421008129384</td>
                  <td className="py-3.5 px-4 text-zinc-400">Hoje às 14:20</td>
                  <td className="py-3.5 px-4 text-right font-black text-emerald-400">R$ 145,90</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Autorizada (100)
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button onClick={() => alert('Download do XML Autorizado')} className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-bold">
                      XML
                    </button>
                    <button onClick={() => alert('Gerando DANFE em PDF...')} className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-zinc-950 rounded-lg text-[11px] font-black">
                      DANFE PDF
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-black text-orange-400">NFC-e #1041</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-300">1726091041000100650010000010411007891234</td>
                  <td className="py-3.5 px-4 text-zinc-400">Hoje às 11:45</td>
                  <td className="py-3.5 px-4 text-right font-black text-emerald-400">R$ 88,00</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Autorizada (100)
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button onClick={() => alert('Download do XML Autorizado')} className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-bold">
                      XML
                    </button>
                    <button onClick={() => alert('Gerando DANFE em PDF...')} className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-zinc-950 rounded-lg text-[11px] font-black">
                      DANFE PDF
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

