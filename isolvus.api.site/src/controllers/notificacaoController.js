import { consultarNotificacoesService, notificacaoEnviarService, notificacaoLidoService, notificacaoRegistrarTokenService } from "../services/notificacao.service.js";

export async function consultarNotificacoes(req, res, next) {

    try {    
        const dados = await consultarNotificacoesService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }
}

export async function notificacaoLido(req, res, next) {

    try {    
        const dados = await notificacaoLidoService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }

}

export async function notificacaoEnviar(req, res, next) {

    try {    
        const dados = await notificacaoEnviarService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }

}

export async function notificacaoRegistrarToken(req, res, next) {

    try {
        const dados = await notificacaoRegistrarTokenService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }

}