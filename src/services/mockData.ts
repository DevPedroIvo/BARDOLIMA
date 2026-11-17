import { Categoria, Produto, Cliente, Venda, MovimentacaoCaixa } from '../types/database';

export const INITIAL_CATEGORIAS: Categoria[] = [
  { id: 'cat-1', nome: 'Cervejas', descricao: 'Lata, garrafas 600ml/1L, retornáveis e artesanais' },
  { id: 'cat-2', nome: 'Refrigerantes', descricao: 'PET 2L, lata 350ml e garrafas retornáveis' },
  { id: 'cat-3', nome: 'Destilados', descricao: 'Whisky, Vodka, Gin, Cachaça e Licores' },
  { id: 'cat-4', nome: 'Vinhos & Espumantes', descricao: 'Vinhos suaves, secos e espumantes' },
  { id: 'cat-5', nome: 'Águas & Energéticos', descricao: 'Água mineral 500ml/5L, energéticos Red Bull e Monster' },
  { id: 'cat-6', nome: 'Gelo & Petiscos', descricao: 'Gelo em cubo, gelo de coco, amendoim e carvão' }
];

export const INITIAL_PRODUTOS: Produto[] = [
  {
    id: 'prod-1',
    nome: 'Cerveja Skol Pilsen 600ml (Retornável)',
    codigo_barras: '7891149010101',
    categoria_id: 'cat-1',
    tipo_embalagem: 'Garrafa 600ml',
    retornavel: true,
    preco_custo: 4.80,
    preco_venda_unitario: 7.50,
    preco_venda_fardo: 84.00,
    unidades_por_fardo: 12,
    estoque_atual: 120,
    estoque_minimo: 30,
    imagem_url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'prod-2',
    nome: 'Cerveja Heineken Long Neck 330ml',
    codigo_barras: '7891149020202',
    categoria_id: 'cat-1',
    tipo_embalagem: 'Long Neck',
    retornavel: false,
    preco_custo: 4.20,
    preco_venda_unitario: 6.99,
    preco_venda_fardo: 156.00,
    unidades_por_fardo: 24,
    estoque_atual: 85,
    estoque_minimo: 24,
    imagem_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'prod-3',
    nome: 'Cerveja Amstel 350ml (Lata)',
    codigo_barras: '7891149030303',
    categoria_id: 'cat-1',
    tipo_embalagem: 'Lata',
    retornavel: false,
    preco_custo: 2.60,
    preco_venda_unitario: 4.20,
    preco_venda_fardo: 45.00,
    unidades_por_fardo: 12,
    estoque_atual: 8, // Alerta estoque baixo
    estoque_minimo: 24,
    imagem_url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'prod-4',
    nome: 'Refrigerante Coca-Cola 2L PET',
    codigo_barras: '7894900011517',
    categoria_id: 'cat-2',
    tipo_embalagem: 'PET 2L',
    retornavel: false,
    preco_custo: 6.50,
    preco_venda_unitario: 9.99,
    preco_venda_fardo: 56.00,
    unidades_por_fardo: 6,
    estoque_atual: 42,
    estoque_minimo: 12,
    imagem_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'prod-5',
    nome: 'Whisky Red Label 1L',
    codigo_barras: '5000267014005',
    categoria_id: 'cat-3',
    tipo_embalagem: 'Garrafa 1L',
    retornavel: false,
    preco_custo: 68.00,
    preco_venda_unitario: 98.90,
    unidades_por_fardo: 1,
    estoque_atual: 15,
    estoque_minimo: 5,
    imagem_url: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'prod-6',
    nome: 'Energético Red Bull 250ml',
    codigo_barras: '9002490100070',
    categoria_id: 'cat-5',
    tipo_embalagem: 'Lata',
    retornavel: false,
    preco_custo: 5.90,
    preco_venda_unitario: 9.50,
    preco_venda_fardo: 210.00,
    unidades_por_fardo: 24,
    estoque_atual: 60,
    estoque_minimo: 12,
    imagem_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'prod-7',
    nome: 'Saco de Gelo em Cubo 5kg',
    codigo_barras: '7898901234567',
    categoria_id: 'cat-6',
    tipo_embalagem: 'Fardo/Caixa',
    retornavel: false,
    preco_custo: 4.00,
    preco_venda_unitario: 12.00,
    unidades_por_fardo: 1,
    estoque_atual: 35,
    estoque_minimo: 10,
    imagem_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=300'
  }
];

export const INITIAL_CLIENTES: Cliente[] = [
  {
    id: 'cli-1',
    nome: 'Bar do Zé',
    telefone: '(11) 98765-4321',
    endereco: 'Rua das Flores, 120',
    bairro: 'Centro',
    limite_fiado: 1500.00,
    saldo_devedor: 420.00,
    observacoes: 'Cliente preferencial. Paga toda sexta-feira.'
  },
  {
    id: 'cli-2',
    nome: 'Conveniência Posto Central',
    telefone: '(11) 97777-8888',
    endereco: 'Av. Brasil, 1500',
    bairro: 'Jardim Amália',
    limite_fiado: 3000.00,
    saldo_devedor: 0.00,
    observacoes: 'Entrega sempre no período da manhã.'
  },
  {
    id: 'cli-3',
    nome: 'Carlos Eduardo (Residencial)',
    telefone: '(11) 99123-5544',
    endereco: 'Rua Piauí, 45, Ap 302',
    bairro: 'Vila Nova',
    limite_fiado: 300.00,
    saldo_devedor: 85.50,
    observacoes: 'Pedir confirmação via WhatsApp antes da entrega.'
  }
];

export const INITIAL_VENDAS: Venda[] = [
  {
    id: 'ven-1',
    cliente_id: 'cli-1',
    tipo_venda: 'Atacado',
    status: 'Entregue',
    forma_pagamento: 'Fiado',
    subtotal: 420.00,
    desconto: 0.00,
    taxa_entrega: 0.00,
    valor_total: 420.00,
    valor_pago: 0.00,
    troco: 0.00,
    cascos_devolvidos: 60,
    observacoes: 'Fiado anotado na conta do Bar do Zé',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    cliente: INITIAL_CLIENTES[0],
    itens: [
      { produto_nome: 'Cerveja Skol Pilsen 600ml (Retornável)', quantidade: 5, preco_unitario: 84.00, subtotal: 420.00, is_fardo: true }
    ]
  },
  {
    id: 'ven-2',
    cliente_id: 'cli-3',
    tipo_venda: 'Delivery',
    status: 'Saiu para Entrega',
    forma_pagamento: 'PIX',
    subtotal: 75.50,
    desconto: 0.00,
    taxa_entrega: 10.00,
    valor_total: 85.50,
    valor_pago: 85.50,
    troco: 0.00,
    cascos_devolvidos: 0,
    observacoes: 'Entregar na portaria',
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    cliente: INITIAL_CLIENTES[2],
    itens: [
      { produto_nome: 'Refrigerante Coca-Cola 2L PET', quantidade: 2, preco_unitario: 9.99, subtotal: 19.98 },
      { produto_nome: 'Cerveja Heineken Long Neck 330ml', quantidade: 6, preco_unitario: 6.99, subtotal: 41.94 },
      { produto_nome: 'Saco de Gelo em Cubo 5kg', quantidade: 1, preco_unitario: 13.58, subtotal: 13.58 }
    ]
  }
];

export const INITIAL_MOVIMENTACOES: MovimentacaoCaixa[] = [
  {
    id: 'mov-1',
    tipo: 'Abertura',
    categoria: 'Suprimento',
    descricao: 'Abertura de caixa do dia',
    valor: 200.00,
    forma_pagamento: 'Dinheiro',
    created_at: new Date(Date.now() - 3600000 * 8).toISOString()
  },
  {
    id: 'mov-2',
    tipo: 'Entrada',
    categoria: 'Venda',
    descricao: 'Venda V-2 (Delivery)',
    valor: 85.50,
    forma_pagamento: 'PIX',
    created_at: new Date(Date.now() - 3600000 * 1).toISOString()
  }
];
