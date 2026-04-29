import { buscarCaixaBanco } from "../models/caixaBancoModel.js";
import { buscarCentroDeCusto } from "../models/centroDeCustoModel.js";
import { buscarCliente } from "../models/clienteModel.js";
import { buscarContaGerencial } from "../models/contaGerencialModel.js";
import { buscarFilial } from "../models/filialModel.js";
import { buscarFornecedor } from "../models/fornecedorModel.js";
import { ConsultarHosts } from "../models/integracaoComClienteModel.js";
import { buscarSetor } from "../models/setorModel.js";
import { buscarSMS } from "../models/SMSModel.js";
import { buscarDespesas } from "../models/solicitacaoDeDespesaModel.js";
import { buscarUsuario } from "../models/usuarioModel.js";
import { buscarVale } from "../models/valeModal.js";
import { buscarVeiculo } from "../models/veiculoModal.js";

let processando = false;
let inicioProcessamento = null;
const TIMEOUT_INTEGRACAO_MS = 10 * 60 * 1000; // 10 minutos — libera automaticamente se travar

export async function Integrar() {
    const agora = Date.now();

    // Se já está processando mas passou do timeout, libera (ex: restart no meio da integração)
    if (processando && inicioProcessamento && (agora - inicioProcessamento) < TIMEOUT_INTEGRACAO_MS) {
        console.log("Já está em processamento.");
        return;
    }

    processando = true;
    inicioProcessamento = agora;
    const inicio = new Date(); 
    console.log(`Iniciando processamento em: ${inicio.toLocaleString()}`);

    try {
        const integracoes = await ConsultarHosts();

        //trazer para base dev as tabelas do winthor
        // Cria um array de Promises
        const tarefas = integracoes.map((integracao) => {
            switch (integracao.id_integracao) {
                case 2:  return buscarFilial(integracao);
                case 3:  return buscarSetor(integracao);
                case 4:  return buscarUsuario(integracao);
                case 5:  return buscarFornecedor(integracao);
                case 8:  return buscarVeiculo(integracao);
                case 9:  return buscarCliente(integracao);
                case 10: return buscarContaGerencial(integracao);
                case 11: return buscarCentroDeCusto(integracao);
                //case 13: return buscarSMS(integracao);
                //case 15: return buscarDespesas(integracao);
                case 18: return buscarCaixaBanco(integracao);
                case 19: return buscarVale(integracao);
                default: return Promise.resolve(); // ignora integrações não tratadas
            }
        });

        // Executa todas em paralelo sem travar o fluxo
        const resultados = await Promise.allSettled(tarefas);

        // Log do resultado de cada integração
        resultados.forEach((resultado, index) => {
            const integracao = integracoes[index];
            if (resultado.status === "fulfilled") {
                console.log(`Integração ${integracao.id_integracao} concluída com sucesso.`);
            } else {
                console.error(`Integração ${integracao.id_integracao} falhou:`, resultado.reason);
            }
        });

    } catch (error) {
        console.error("Erro durante a integração:", error);
    } finally {
        const fim = new Date(); 
        console.log(`Processamento finalizado em: ${fim.toLocaleString()}`);
        console.log(`Duração: ${(fim - inicio) / 1000} segundos`);
        processando = false;
        inicioProcessamento = null;
    }
}

export default Integrar;
