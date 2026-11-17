export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  created_at?: string;
}

export interface Produto {
  id: string;
  nome: string;
  codigo_barras?: string;
  categoria_id?: string;
  tipo_embalagem: 'Lata' | 'Garrafa 600ml' | 'Garrafa 1L' | 'Long Neck' | 'PET 2L' | 'Fardo/Caixa' | 'Barril/Chopp';
  retornavel: boolean;
  preco_custo: number;
  preco_venda_unitario: number;
  preco_venda_fardo?: number;
  unidades_por_fardo: number;
  estoque_atual: number;
  estoque_minimo: number;
  imagem_url?: string;
  created_at?: string;
  categoria?: Categoria;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  endereco?: string;
  bairro?: string;
  limite_fiado: number;
  saldo_devedor: number;
  observacoes?: string;
  created_at?: string;
}

export interface ItemVenda {
  id?: string;
  venda_id?: string;
  produto_id?: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  is_fardo?: boolean;
}

export interface Venda {
  id: string;
  cliente_id?: string;
  tipo_venda: 'Balcao' | 'Delivery' | 'Atacado';
  status: 'Pendente' | 'Em Separacao' | 'Saiu para Entrega' | 'Entregue' | 'Cancelado';
  forma_pagamento: 'Dinheiro' | 'PIX' | 'Cartao de Credito' | 'Cartao de Debito' | 'Fiado';
  subtotal: number;
  desconto: number;
  taxa_entrega: number;
  valor_total: number;
  valor_pago: number;
  troco: number;
  cascos_devolvidos: number;
  observacoes?: string;
  created_at?: string;
  cliente?: Cliente;
  itens?: ItemVenda[];
}

export interface MovimentacaoCaixa {
  id: string;
  tipo: 'Entrada' | 'Saida' | 'Abertura' | 'Fechamento';
  categoria: 'Venda' | 'Suprimento' | 'Sangria' | 'Despesa' | 'Recebimento Fiado';
  descricao: string;
  valor: number;
  forma_pagamento?: string;
  created_at?: string;
}
