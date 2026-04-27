import { z } from '../docs/zod.js';

export const listarSolicitacaoSchema = z.object({
  id_grupo_empresa: z.number({
    required_error: 'Grupo de empresa é obrigatório'
  }),
  id_usuario: z.number({
    required_error: 'Usuário é obrigatório'
  }),
  pnumsolicitacao: z.number().optional(),
  pstatus: z.enum(['T','A','EA','AJ','L','P','N','F','I']).optional(),
  tipoConsulta: z.string().optional(),
  status: z.string().optional(),
  dataSolicitacaoInicial: z.string().optional(),
  dataSolicitacaoFinal: z.string().optional(),
  id_contagerencial: z.number().optional()
});

export const consultarSolicitacaoNumeroSchema= z.object({
  pnumsolicitacao: z.coerce.number({
    required_error: "Nº Solicitação é obrigatório",
    invalid_type_error: "Nº Solicitação deve ser numérico"
  })
  .int("Nº Solicitação deve ser um número inteiro")
  .positive("Nº Solicitação deve ser maior que zero")  
});

export const itemSolicitacaoSchema = z.object({
  coditem: z.coerce.number({
    required_error: 'Código do item é obrigatório',
    invalid_type_error: 'Código do item deve ser numérico'
  })
  .int('Código do item deve ser inteiro')
  .positive('Código do item deve ser maior que zero'),

  quantidade: z.coerce.number({
    required_error: 'Quantidade é obrigatória',
    invalid_type_error: 'Quantidade deve ser numérica'
  })
  .positive('Quantidade deve ser maior que zero'),

  vlunit: z.coerce.number({
    required_error: 'Valor unitário é obrigatório',
    invalid_type_error: 'Valor unitário deve ser numérico'
  })
  .nonnegative('Valor unitário não pode ser negativo')
});

export const solicitaDespesaSchema = z.object({
  /* =======================
   * DADOS DA SOLICITAÇÃO
   * ======================= */
  tipodespesa: z.string({
    required_error: "Tipo de despesa é obrigatório"
  }),

  numsolicitacao: z.coerce
    .number({
      required_error: "Nº Solicitação é obrigatório",
      invalid_type_error: "Nº Solicitação deve ser numérico"
    })
    .int("Nº Solicitação deve ser um número inteiro")
    .positive("Nº Solicitação deve ser maior que zero"),

  dataEstimada: z.preprocess(
    (val) => {
      if (!val) return val;

      // Se vier no formato YYYY-MM-DD
      if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [ano, mes, dia] = val.split("-").map(Number);
        return new Date(ano, mes - 1, dia); // LOCAL, sem UTC
      }

      return val;
    },
    z.date({
      required_error: "Data estimada é obrigatória"
    }).refine(
      (data) => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        return data >= hoje;
      },
      {
        message: "Data estimada não pode ser menor que a data atual"
      }
    )
  ),

  objetivo: z.string({
    required_error: "Objetivo é obrigatório"
  }).min(1, "Objetivo não pode ser vazio"),

  /* =======================
   * USUÁRIO / EMPRESA
   * ======================= */
  id_solicitante: z.coerce
    .number({
      required_error: "Solicitante é obrigatório"
    })
    .int()
    .positive(),

  id_EmpresaFunc: z.coerce
    .number({
      required_error: "Filial do funcionário é obrigatória"
    })
    .int()
    .positive(),

  id_Filialdespesa: z.coerce
    .number({
      required_error: "Filial de despesa é obrigatória",
      invalid_type_error: "Código da filial deve ser numérico"
    })
    .int()
    .positive("Filial da despesa é obrigatória"),

  id_grupo_empresa: z.coerce
    .number({
      required_error: "Grupo de empresa é obrigatório"
    })
    .int()
    .positive(),

  /* =======================
   * FORNECEDOR
   * ======================= */
  tipofornecedor: z.enum(["fo", "us"], {
    required_error: "Tipo de fornecedor é obrigatório",
    invalid_type_error: "Tipo de fornecedor inválido (use 'fo' ou 'us')"
  }),

  id_Fornecedor: z.coerce
    .number({
      required_error: "Fornecedor é obrigatório"
    })
    .int()
    .positive("Fornecedor é obrigatório"),

  /* =======================
   * PAGAMENTO
   * ======================= */
  id_formadepagamento: z.coerce
    .number({
      required_error: "Forma de pagamento é obrigatória"
    })
    .min(1, "Forma de pagamento é obrigatória"),

  chavepix: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val !== "string") return undefined;
      if (val.trim() === "") return undefined;
      return val;
    },
    z.string().optional()
  ),

  id_banco: z.coerce.number().optional(),

  agencia: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val !== "string") return undefined;
      if (val.trim() === "") return undefined;
      return val;
    },
    z.string().optional()
  ),

  contaBancaria: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val !== "string") return undefined;
      if (val.trim() === "") return undefined;
      return val;
    },
    z.string().optional()
  ),

  operacao: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val !== "string") return undefined;
      if (val.trim() === "") return undefined;
      return val;
    },
    z.string().optional()
  ),

  tipoconta: z.coerce.number().optional(),

  /* =======================
   * ITENS
   * ======================= */
  itens: z.array(itemSolicitacaoSchema).min(1, "Nenhum item informado")
});




export const direcionarSolicitacaoSchema = z.object(
{
  numsolicitacao: z.coerce.number({
    required_error: "Nº Solicitação é obrigatório",
    invalid_type_error: "Nº Solicitação deve ser numérico"
  }),
  codconta: z.coerce.number({
    required_error: "Conta é obrigatório",
    invalid_type_error: "Numero da conta deve ser numérico"
  }).min(1, "Conta é obrigatório"),
  id_user_controladoria: z.coerce.number({
    required_error: "Código do Usuario é obrigatório",
    invalid_type_error: "Código do usuario deve ser numerico"
  })
}
);

export const valeConformidadeSchema = z.object({
  id_vale: z.coerce.number(),
  data_vencimento: z.string(),
  flegar: z.enum(["S","N", "B"]),
  id_lancamento_erp: z.number(),
  valor: z.number()
});

export const ordenarSolicitacaoSchema = z.object({
  numsolicitacao: z.coerce.number({
    required_error: "Nº Solicitação é obrigatório",
    invalid_type_error: "Nº Solicitação deve ser numérico"
  }),

  valesSelecionados: z.array(valeConformidadeSchema).optional(),

  id_ordenador: z.coerce.number({
    required_error: "Código do Usuário é obrigatório",
    invalid_type_error: "Código do usuário deve ser numérico"
  }),

  status: z.string({
    required_error: "Status é obrigatório"
  })
  .trim()
  .toUpperCase()
  .refine(val => ["A", "N", "P", "L", "EA", "AJ", "I", "F"].includes(val), {
    message: "Status inválido"
  }),

  // 👉 CAMPO FALTANTE (tem que existir no schema)
  obs_ordenador: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val !== "string") return undefined;
      if (val.trim() === "") return undefined;
      return val;
    },
    z.string().optional()
  )

})
.superRefine((data, ctx) => {

  // regra de negócio
  if (data.status !== "L" && !data.obs_ordenador) {
    ctx.addIssue({
      path: ["obs_ordenador"],
      message: "Observação do ordenador é obrigatória quando status diferente de Liberado",
      code: z.ZodIssueCode.custom
    });
  }

});



export const conformidadeSolicitacaoSchema = z.object({

  numsolicitacao: z.coerce.number({
    required_error: "Nº Solicitação é obrigatório",
    invalid_type_error: "Nº Solicitação deve ser numérico"
  }),

  id_rotina_integracao: z.coerce.number({
    required_error: "Informe uma integração válida",
    invalid_type_error: "Código de integração deve ser numérico"
  }).refine(
    (val) => [746, 749, 631, 99999].includes(val),
    { message: "Integração não permitida" }
  ),

  id_grupo_empresa: z.coerce.number({
    required_error: "Código do grupo de empresa é obrigatório",
    invalid_type_error: "Código do grupo de empresa deve ser numérico"
  }),

  id_caixabanco: z.coerce.number({
    invalid_type_error: "Caixa/Banco deve ser numérico"
  }).optional(),

  valesSelecionados: z.array(z.any()).optional(),

  id_user_financeiro: z.coerce.number({
    required_error: "Código do Usuário é obrigatório",
    invalid_type_error: "Código do usuário deve ser numérico"
  }),

  obs_financeiro: z.string({
    required_error: "Parecer financeiro é obrigatório",
    invalid_type_error: "Parecer financeiro é obrigatório"
  })
  .trim()
  .min(1, "Parecer financeiro é obrigatório"),

  historico1: z.string()
  .trim()
  .max(200, "Quantidade de caracteres maior que o permitido para o historico 1")
  .optional(),

  historico2: z.string()
  .trim()
  .max(200, "Quantidade de caracteres maior que o permitido para o historico 2")
  .optional(),

}).superRefine((data, ctx) => {

  if (data.id_rotina_integracao === 631 && !data.id_caixabanco) {
    ctx.addIssue({
      path: ["id_caixabanco"],
      message: "Caixa/Banco é obrigatório para esta integração",
      code: z.ZodIssueCode.custom
    });
  }

  if (data.id_rotina_integracao !== 99999 && !String(data.historico1 || "").trim()) {
    ctx.addIssue({
      path: ["historico1"],
      message: "Historico 1 é obrigatório",
      code: z.ZodIssueCode.custom
    });
  }

  if (data.id_rotina_integracao !== 99999 && !String(data.historico2 || "").trim()) {
    ctx.addIssue({
      path: ["historico2"],
      message: "Historico 2 é obrigatório",
      code: z.ZodIssueCode.custom
    });
  }

});

export const conformidadeSolicitacoesLoteSchema = z.object({
  idleitura: z.coerce.number({
    required_error: 'ID da leitura é obrigatório',
    invalid_type_error: 'ID da leitura deve ser numérico'
  })
    .int('ID da leitura deve ser um número inteiro')
    .positive('ID da leitura deve ser maior que zero'),

  id_rotina_integracao: z.coerce.number({
    required_error: 'Informe uma integração válida',
    invalid_type_error: 'Código de integração deve ser numérico'
  }).refine(
    (val) => [746, 749, 631, 99999].includes(val),
    { message: 'Integração não permitida' }
  ),

  id_grupo_empresa: z.coerce.number({
    required_error: 'Código do grupo de empresa é obrigatório',
    invalid_type_error: 'Código do grupo de empresa deve ser numérico'
  }),

  id_caixabanco: z.coerce.number({
    invalid_type_error: 'Caixa/Banco deve ser numérico'
  }).optional(),

  valesSelecionados: z.array(z.any()).optional(),

  id_user_financeiro: z.coerce.number({
    required_error: 'Código do Usuário é obrigatório',
    invalid_type_error: 'Código do usuário deve ser numérico'
  }),

  obs_financeiro: z.string({
    required_error: 'Parecer financeiro é obrigatório',
    invalid_type_error: 'Parecer financeiro é obrigatório'
  })
  .trim()
  .min(1, 'Parecer financeiro é obrigatório'),

  historico1: z.string()
  .trim()
  .max(200, 'Quantidade de caracteres maior que o permitido para o historico 1')
  .optional(),

  historico2: z.string()
  .trim()
  .max(200, 'Quantidade de caracteres maior que o permitido para o historico 2')
  .optional()

}).superRefine((data, ctx) => {
  if (data.id_rotina_integracao === 631 && !data.id_caixabanco) {
    ctx.addIssue({
      path: ['id_caixabanco'],
      message: 'Caixa/Banco é obrigatório para esta integração',
      code: z.ZodIssueCode.custom
    });
  }

  if (data.id_rotina_integracao !== 99999 && !String(data.historico1 || '').trim()) {
    ctx.addIssue({
      path: ['historico1'],
      message: 'Historico 1 é obrigatório',
      code: z.ZodIssueCode.custom
    });
  }

  if (data.id_rotina_integracao !== 99999 && !String(data.historico2 || '').trim()) {
    ctx.addIssue({
      path: ['historico2'],
      message: 'Historico 2 é obrigatório',
      code: z.ZodIssueCode.custom
    });
  }
});

export const relcontrolededespesaSchema = z.object({
  dataInicial: z.string(),
  dataFinal: z.string(),
  idUsu: z.coerce.number(),
  tipoLanc: z.string(),
  id_Fornecedor: z.coerce.number()
})


export const relautorizacaoPagamentoSchema = z.object({
    idFilialDespesa: z.coerce.number().optional(),
    codContaGerencial: z.coerce.number().optional(),    
    codCentroDeCusto: z.coerce.string().optional(),  
    idParceiro: z.coerce.number().optional(),  
    tipoFornecedor: z.coerce.string().optional(),            
    status: z.coerce.string().optional(),
    dataInicial: z.coerce.string(),
    dataFinal: z.coerce.string()
})


export const addRateioSchema = z.object({
    numsolicitacao: z.coerce.number({
    required_error: "Nº Solicitação é obrigatório",
    invalid_type_error: "Nº Solicitação deve ser numérico"
    }),

    codCentroDeCusto: z.coerce.string(),
    perrateio: z.number(),
    valor: z.number().min(0.001, "Valor do rateio deve ser maior que zero.")    
})

export const recalcularRaterioSchema = z.object({
    numsolicitacao: z.coerce.number({
    required_error: "Nº Solicitação é obrigatório",
    invalid_type_error: "Nº Solicitação deve ser numérico"
    }),

    valorDespesa: z.number().min(0.001, "Valor da despesa não pode ser menor ou igual a zero.")  
})


export const deleteRateioSchema = z.object({
  numsolicitacao: z.coerce.number({
    required_error: "Nº Solicitação é obrigatório",
    invalid_type_error: "Nº Solicitação deve ser numérico"
    }),
  id_rateio: z.number().min(1, "Id rateio obrigatório.")
})

const preAnaliseImportDespesaItemSchema = z.object({
  cnpj_filial: z.string()
    .length(14, "CNPJ deve ter 14 dígitos")
    .regex(/^\d{14}$/, "CNPJ deve conter apenas dígitos"),
  cpf_funcionario: z.string()
    .length(11, "CPF deve ter 11 dígitos")
    .regex(/^\d{11}$/, "CPF deve conter apenas dígitos"),
  valor: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Valor deve ser um número válido com até 2 casas decimais"),
  conta: z.string()
    .min(1, "Conta é obrigatória"),
  datalancamento: z.string()
    .regex(/^\d{8}$/, "Data de lançamento deve estar no formato DDMMAAAA")
    .refine(val => {
      const dia = parseInt(val.slice(0, 2));
      const mes = parseInt(val.slice(2, 4)) - 1; // mês é 0-indexado
      const ano = parseInt(val.slice(4, 8));
      const data = new Date(ano, mes, dia);
      return data.getFullYear() === ano && data.getMonth() === mes && data.getDate() === dia;
    }, "Data de lançamento inválida"),
  datapagamento: z.string()
    .regex(/^\d{8}$/, "Data de pagamento deve estar no formato DDMMAAAA")
    .refine(val => {
      const dia = parseInt(val.slice(0, 2));
      const mes = parseInt(val.slice(2, 4)) - 1;
      const ano = parseInt(val.slice(4, 8));
      const data = new Date(ano, mes, dia);
      return data.getFullYear() === ano && data.getMonth() === mes && data.getDate() === dia;
    }, "Data de pagamento inválida"),
  datageracao: z.string()
    .regex(/^\d{8}$/, "Data de geração deve estar no formato DDMMAAAA")
    .refine(val => {
      const dia = parseInt(val.slice(0, 2));
      const mes = parseInt(val.slice(2, 4)) - 1;
      const ano = parseInt(val.slice(4, 8));
      const data = new Date(ano, mes, dia);
      return data.getFullYear() === ano && data.getMonth() === mes && data.getDate() === dia;
    }, "Data de geração inválida"),
  historico: z.string()
    .min(1, "Histórico é obrigatório"),
  id_item: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      const texto = String(val).trim();
      return texto === '' ? undefined : texto;
    },
    z.string()
      .regex(/^\d+$/, "ID do item deve conter apenas dígitos")
      .optional()
  ),
  id_usuarioenv: z.string()
    .regex(/^\d+$/, "ID do usuário deve ser numérico")  ,
  descricaoenv: z.string().min(10, "Descrição do envio deve ter no mínimo 10 caracteres").max(200, "Descrição do envio deve ter no máximo 200 caracteres")
})

export const preAnaliseImportDespesaSchemma = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    if (Array.isArray(value.jsonReq)) return value.jsonReq;
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.body)) return value.body;

    const arrayField = Object.values(value).find((val) => Array.isArray(val));
    if (Array.isArray(arrayField)) {
      return arrayField;
    }
  }

  return value;
}, z.array(preAnaliseImportDespesaItemSchema));

export const processarDespesasImportacaoSchema = z.object({
  idleitura: z.coerce.number({
    required_error: 'ID da leitura é obrigatório',
    invalid_type_error: 'ID da leitura deve ser numérico'
  })
    .int('ID da leitura deve ser um número inteiro')
    .positive('ID da leitura deve ser maior que zero')
});

export const atualizarDadosBancariosImportacaoSchema = z.object({
  id_usuario: z.coerce.number({
    required_error: 'ID do usuário é obrigatório',
    invalid_type_error: 'ID do usuário deve ser numérico'
  })
    .int('ID do usuário deve ser um número inteiro')
    .positive('ID do usuário deve ser maior que zero'),
  id_banco: z.preprocess(
    (val) => {
      if (val === undefined || val === null || String(val).trim() === '') return undefined;
      return val;
    },
    z.coerce.number({ invalid_type_error: 'ID do banco deve ser numérico' })
      .int('ID do banco deve ser um número inteiro')
      .positive('ID do banco deve ser maior que zero')
      .optional()
  ),
  agencia: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      const texto = String(val).trim();
      return texto === '' ? undefined : texto;
    },
    z.string().optional()
  ),
  conta: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      const texto = String(val).trim();
      return texto === '' ? undefined : texto;
    },
    z.string().optional()
  ),
  operacao: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      const texto = String(val).trim();
      return texto === '' ? undefined : texto;
    },
    z.string().optional()
  )
}).superRefine((data, ctx) => {
  if (!data.id_banco && !data.agencia && !data.conta && !data.operacao) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['id_banco'],
      message: 'Informe ao menos um dado bancário para atualização.'
    });
  }
});

export const deletePreAnaliseSchema = z.object({
  idleitura: z.coerce.number({
    required_error: 'ID da leitura é obrigatório',
    invalid_type_error: 'ID da leitura deve ser numérico'
  })
    .int('ID da leitura deve ser um número inteiro')
    .positive('ID da leitura deve ser maior que zero')
});

export const consultarDespesasVinculadasLeituraSchema = z.object({
  idleitura: z.coerce.number({
    required_error: 'ID da leitura é obrigatório',
    invalid_type_error: 'ID da leitura deve ser numérico'
  })
    .int('ID da leitura deve ser um número inteiro')
    .positive('ID da leitura deve ser maior que zero')
});

export const direcionarSolicitacoesLoteSchema = z.object({
  idleitura: z.coerce.number({
    required_error: 'ID da leitura é obrigatório',
    invalid_type_error: 'ID da leitura deve ser numérico'
  })
    .int('ID da leitura deve ser um número inteiro')
    .positive('ID da leitura deve ser maior que zero'),

  id_user_controladoria: z.coerce.number({
    required_error: 'Código do usuário da controladoria é obrigatório',
    invalid_type_error: 'Código do usuário da controladoria deve ser numérico'
  })
});

export const ordenarSolicitacoesLoteSchema = z.object({
  idleitura: z.coerce.number({
    required_error: 'ID da leitura é obrigatório',
    invalid_type_error: 'ID da leitura deve ser numérico'
  })
    .int('ID da leitura deve ser um número inteiro')
    .positive('ID da leitura deve ser maior que zero'),

  id_ordenador: z.coerce.number({
    required_error: 'Código do usuário é obrigatório',
    invalid_type_error: 'Código do usuário deve ser numérico'
  }),

  status: z.string({
    required_error: 'Status é obrigatório'
  })
    .trim()
    .toUpperCase()
    .refine((val) => ['A', 'N', 'P', 'L', 'EA', 'AJ', 'I', 'F'].includes(val), {
      message: 'Status inválido'
    }),

  obs_ordenador: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val !== 'string') return undefined;
      if (val.trim() === '') return undefined;
      return val;
    },
    z.string().optional()
  )
}).superRefine((data, ctx) => {
  if (data.status !== 'L' && !data.obs_ordenador) {
    ctx.addIssue({
      path: ['obs_ordenador'],
      message: 'Observação do ordenador é obrigatória quando status diferente de Liberado',
      code: z.ZodIssueCode.custom
    });
  }
});

export const consultarPreAnaliseAgrupadoSchema = z.object({
  filtro: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val !== 'string') return val;

      const texto = val.trim();
      return texto === '' ? undefined : texto;
    },
    z.string()
      .min(3, 'Informe ao menos 3 caracteres para pesquisar')
      .optional()
  ),
  dataInicial: z.string({
    required_error: 'Data inicial é obrigatória',
    invalid_type_error: 'Data inicial deve ser texto'
  })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial deve estar no formato YYYY-MM-DD'),
  dataFinal: z.string({
    required_error: 'Data final é obrigatória',
    invalid_type_error: 'Data final deve ser texto'
  })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final deve estar no formato YYYY-MM-DD')
}).superRefine((data, ctx) => {
  if (data.dataFinal < data.dataInicial) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataFinal'],
      message: 'Data final não pode ser menor que a data inicial'
    });
  }
});