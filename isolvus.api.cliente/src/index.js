import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { metricsMiddleware, register } from './middlewares/metrics.js';
/*import fs from 'fs';
import https from 'https';*/
import filialRoutes from './routes/filialRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import fornecedorRoutes from './routes/fornecedorRoutes.js';
import contagerencialRoutes from './routes/contagerencialRoutes.js';
import centrodecustoRoutes from './routes/centrodecustoRoutes.js';
import setorRoutes from './routes/setorRoutes.js';
import veiculoRoutes from './routes/veiculoRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import clienteRoutes from './routes/clienteRoutes.js';
import solicitacaoDeDespesa from './routes/solicitacaoDeDespesa.js';
import clienteCadastroRoutes from './routes/clienteCadastroRoutes.js';
import integracaoFornecedorRoutes from './routes/integracaoFornecedorRoutes.js'
import caixabancoRoutes from "./routes/caixabancoRoutes.js";
import valeRoutes from "./routes/valeRoutes.js";

const app = express();
const portahttp = 3020;
const portahttps = 3010;
const apiVersion = "/v1";

// Middleware
app.use(cors());
app.use(metricsMiddleware);

// Endpoint de métricas para o Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Aumentando o limite de requisição para 50MB (modifique conforme necessário)
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));

// Lista de rotas para evitar repetição
const rotas = [
   filialRoutes,
   usuarioRoutes,
   fornecedorRoutes,
   contagerencialRoutes,
   centrodecustoRoutes,
   setorRoutes,
   veiculoRoutes,
   smsRoutes,
   solicitacaoDeDespesa,
   clienteRoutes,
   clienteCadastroRoutes,
   integracaoFornecedorRoutes,
   caixabancoRoutes,
   valeRoutes
];

// Aplica todas as rotas dinamicamente
rotas.forEach(route => app.use(apiVersion, route));

// Iniciar o servidor
app.listen(portahttp, () => {
  console.log(`Api Rodando em http na porta: ${portahttp}`);
});

/*https.createServer({
     cert: fs.readFileSync('C:/isolvus.api/src/certificados/crt/certificate.crt'),
     key: fs.readFileSync('C:/isolvus.api/src/certificados/crt/private.key')
}, app).listen(portahttps, () => console.log(`API Rodando em https na porta: ${portahttps}`)); */
  