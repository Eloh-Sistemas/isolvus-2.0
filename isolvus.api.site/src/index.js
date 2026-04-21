import express from 'express';
import cors from 'cors';
import path from 'path';
import usuarioRoutes from './routes/usuarioRoutes.js';
import permissoesRoutes from './routes/permissoesRoutes.js';
import filialRoutes from './routes/filialRoutes.js';
import fornecedorRoutes from './routes/fornecedorRoutes.js';
import contaGerencialRoutes from './routes/contaGerencialRoutes.js';
import centroDeCustoRoutes from './routes/centroDeCustoRoutes.js';
import itemDespesaRoutes from './routes/itemDespesaRoutes.js';
import solicitacaoDeDespesaRoutes from './routes/solicitacaoDeDespesaRoutes.js';
import clienteRoutes from './routes/clienteRoutes.js';
import uploadArquivosRoutes from './routes/uploadArquivosRoutes.js';
import atividadePromotorRoutes from './routes/atividadePromotorRoutes.js';
import formularioRoutes from './routes/formularioRoutes.js';
import ordenadorRoutes from './routes/ordenadorRoutes.js';
import veiculoRoutes from './routes/veiculoRoutes.js';
import promotorRoutes from './routes/promotorRoutes.js';
import acompanhamentodedespesaRoutes from './routes/acompanhamentodedespesaRoutes.js';
import endpointsRoutes from './routes/endpointsRoutes.js';
import Integrar from './controllers/integracaoComAPIClienteController.js';
import orcamentoMensal from './routes/orcamentoMensal.js';
import notificacaoRoutes from './routes/notificacaoRoutes.js';
import fs from 'fs';
import https from 'https';
import iaChatRoutes from './routes/iaChatRoutes.js';
import integracaoFornecedorRoutes from './routes/integracaoFornecedorRoutes.js';
import clienteCadastroRoutes from './routes/clienteCadastroRoutes.js';
import auditarLocalizacaoRoutes from './routes/auditarLocalizacaoRoutes.js';
import instituicaoBancariaRoutes from './routes/instituicaoBancariaRoutes.js';
import caixabancoRoutes from "./routes/caixabancoRoutes.js";
import valeRoutes from "./routes/valeRoutes.js";
import comunicadoRoutes from "./routes/comunicadoRoutes.js";
import formaDePagamentoRoutes from "./routes/formaDePagamentoRoutes.js";
import enqueteRoutes from "./routes/enqueteRoutes.js";
import reacaoRoutes from "./routes/reacaoRoutes.js";
import comentarioRoutes from "./routes/comentarioRoutes.js";
import swaggerRoutes from './routes/swaggerRoutes.js';

import { errorHandler } from './middlewares/errorHandler.js';


const app = express();
const portahttp = 3011; // Usa variável de ambiente ou padrão 3001
const portahttps = 58624;
const apiVersion = "/v1"; // Variável para a versão da API

// Middleware
app.use(cors());

// Servir arquivos de mídia dos comunicados
app.use('/midias', express.static(path.join(process.cwd(), 'src/midias')));

// Aumentando o limite de requisição para 50MB (modifique conforme necessário)
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));

// Lista de rotas para evitar repetição
const rotas = [
  usuarioRoutes,
  permissoesRoutes,
  filialRoutes,
  fornecedorRoutes,
  contaGerencialRoutes,
  centroDeCustoRoutes,
  itemDespesaRoutes,
  solicitacaoDeDespesaRoutes,
  ordenadorRoutes,
  acompanhamentodedespesaRoutes,
  endpointsRoutes,
  orcamentoMensal,
  clienteRoutes,
  veiculoRoutes,
  promotorRoutes,
  iaChatRoutes,
  uploadArquivosRoutes,
  atividadePromotorRoutes,
  formularioRoutes,
  integracaoFornecedorRoutes,
  clienteCadastroRoutes,
  auditarLocalizacaoRoutes,
  instituicaoBancariaRoutes,
  caixabancoRoutes,
  valeRoutes,
  comunicadoRoutes,
  formaDePagamentoRoutes,
  enqueteRoutes,
  reacaoRoutes,
  comentarioRoutes,
  swaggerRoutes,
  notificacaoRoutes
];


//buscando atualização nos cliente
//Integrar();
//setInterval(Integrar, 10000)

// Aplica todas as rotas dinamicamente
rotas.forEach(route => app.use(apiVersion, route));

app.use(errorHandler);

// Iniciar o servidor
app.listen(portahttp, () => {
  console.log(`Api Rodando em http na porta: ${portahttp}`);
});


/*https.createServer({
  cert: fs.readFileSync('C:/Users/Douglas Sousa/Documents/GitHub/isolvus.api.site/src/certificados/crt/certificate.crt'),
  key: fs.readFileSync('C:/Users/Douglas Sousa/Documents/GitHub/isolvus.api.site/src/certificados/crt/private.key')
}, app).listen(portahttps, () => console.log(`API Rodando em https na porta: ${portahttps}`));*/
