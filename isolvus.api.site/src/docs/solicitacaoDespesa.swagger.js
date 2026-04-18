import { registry } from './registry.js';
import { conformidadeSolicitacaoSchema, consultarSolicitacaoNumeroSchema, direcionarSolicitacaoSchema, listarSolicitacaoSchema, ordenarSolicitacaoSchema, relcontrolededespesaSchema, solicitaDespesaSchema } from '../schemas/solicitacaoDespesa.schema.js';

registry.registerPath(

  {

  method: 'get',
  path: '/solicitacaoDespesa/proximoidsolicitadespesa',
  tags: ['Solicitação de Despesa'],

  responses: {
    200: {
      description: 'Retorna o id sequencial da proxima solicitação',
      content: {
        'application/json': {
          schema: {}
        }
      }
    }
  }
  
}

);

registry.registerPath(

  {

  method: 'post',
  path: '/solicitacaoDespesa/solicitaDespesa',
  tags: ['Solicitação de Despesa'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: solicitaDespesaSchema
        }
      }
    }
  },

  responses: {
    200: {
      description: 'Retorna o numero da solicitação cadastrada',
      content: {
        'application/json': {
          schema: {}
        }
      }
    }
  }
  
}
);


registry.registerPath(

  {

  method: 'post',
  path: '/solicitacaoDespesa/alteraSolicitaDespesa',
  tags: ['Solicitação de Despesa'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: solicitaDespesaSchema
        }
      }
    }
  },

  responses: {
    200: {
      description: 'Retorna o numero da solicitação cadastrada',
      content: {
        'application/json': {
          schema: {}
        }
      }
    }
  }
  
}
);

registry.registerPath(

  {

  method: 'post',
  path: '/solicitacaoDespesa/listar',
  tags: ['Solicitação de Despesa'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: listarSolicitacaoSchema
        }
      }
    }
  },

  responses: {
    200: {
      description: 'Retorna uma lista de solicitações',
      content: {
        'application/json': {
          schema: {}
        }
      }
    }
  }
  
}

);

registry.registerPath(

  {

  method: 'post',
  path: '/solicitacaoDespesa/consultarSolicitacaoCab',
  tags: ['Solicitação de Despesa'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: consultarSolicitacaoNumeroSchema
        }
      }
    }
  },

  responses: {
    200: {
      description: 'Retorna um json com o cabeçalho da solicitação',
      content: {
        'application/json': {
          schema: {}
        }
      }
    }
  }
  
}

);

registry.registerPath(

  {

  method: 'post',
  path: '/solicitacaoDespesa/consultarSolicitacaoItem',
  tags: ['Solicitação de Despesa'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: consultarSolicitacaoNumeroSchema
        }
      }
    }
  },

  responses: {
    200: {
      description: 'Retorna uma lista de item',
      content: {
        'application/json': {
          schema: {}
        }
      }
    }
  }
  
}

);

registry.registerPath(

  {

  method: 'get',
  path: '/solicitacaoDespesa/ordenarSolicitacao/validarsolicitacaoorcamento/{pnumsolicitacao}',
  tags: ['Solicitação de Despesa'],
  parameters: [
    {
      name: 'pnumsolicitacao',
      in: 'path',
      required: true,
      description: 'Número da solicitação de despesa',
      schema: {
        type: 'integer',
        example: 105566
      }
    }
  ],

  responses: {
    200: {
      description: 'Dados da validação orçado x realizado por conta/filial',
      content: {
        'application/json': {
          schema: {}
        }
      }
    }
  }
  
}

);

registry.registerPath(

  {

  method: 'post',
  path: '/solicitacaoDespesa/direcionarSolicitacao',
  tags: ['Solicitação de Despesa'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: direcionarSolicitacaoSchema
        }
      }
    }
  },

  responses: {
    200: {
      description: 'Retorna o numero da solicitação cadastrada',
      content: {
        'application/json': {
          schema: {}
        }
      }
    }
  }
  
}
);

registry.registerPath(

  {

  method: 'post',
  path: '/solicitacaoDespesa/ordenarSolicitacao',
  tags: ['Solicitação de Despesa'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ordenarSolicitacaoSchema
        }
      }
    }
  },

  responses: {
    200: {
      description: 'Retorna o numero da solicitação cadastrada',
      content: {
        'application/json': {
          schema: {}
        }
      }
    }
  }
  
}
);


registry.registerPath(

  {

  method: 'post',
  path: '/solicitacaoDespesa/conformidadeSolicitacao',
  tags: ['Solicitação de Despesa'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: conformidadeSolicitacaoSchema
        }
      }
    }
  },

  responses: {
    200: {
      description: 'Retorna o numero da solicitação cadastrada',
      content: {
        'application/json': {
          schema: {}
        }
      }
    }
  }
  
}
);

registry.registerPath(

  {

  method: 'post',
  path: '/solicitacaoDespesa/relatorio/controlededespesa',
  tags: ['Solicitação de Despesa'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: relcontrolededespesaSchema
        }
      }
    }
  },

  responses: {
    200: {
      description: 'Retorna o numero da solicitação cadastrada',
      content: {
        'application/json': {
          schema: {}
        }
      }
    }
  }
  
}
);