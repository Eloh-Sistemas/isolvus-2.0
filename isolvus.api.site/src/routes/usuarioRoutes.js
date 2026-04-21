import express from 'express';
import { Logar, ConsultarDadosFuncionario, Listar, ConsultarUsuarioComplet, CadastrarFuncionario, credencias, ConsultarRateioFuncionario, InserirRateioFuncionario, DeletarRateioFuncionario, SalvarFoto, ConsultarFoto, uploadFoto } from '../controllers/usuarioController.js';

const router = express.Router();

router.post('/logar', Logar);
router.post('/consultarDadosFuncionario', ConsultarDadosFuncionario);
router.post('/consultarRateioFuncionario', ConsultarRateioFuncionario);
router.post('/inserirRateioFuncionario', InserirRateioFuncionario);
router.post('/deletarRateioFuncionario', DeletarRateioFuncionario);
router.post('/consultarusuario', Listar);
router.post('/consultarUsuarioComplete', ConsultarUsuarioComplet);
router.post('/cadastrarFuncionario', CadastrarFuncionario);
router.post('/usuario/credencias', credencias);
router.post('/usuario/salvarFoto', uploadFoto.single('foto'), SalvarFoto);
router.post('/usuario/consultarFoto', ConsultarFoto);

export default router;