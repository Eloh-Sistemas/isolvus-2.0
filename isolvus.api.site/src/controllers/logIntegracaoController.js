import {
    consultarLogs,
    consultarDetalhesLog,
    reprocessarIntegracao,
    consultarResumo
} from "../models/logIntegracaoModel.js";

export async function ConsultarLogs(req, res) {
    try {
        const { integracao, status, data_inicio, data_fim, id_servidor } = req.query;
        const dados = await consultarLogs({ integracao, status, data_inicio, data_fim, id_servidor });
        res.json(dados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function ConsultarDetalhes(req, res) {
    try {
        const { id_log } = req.params;
        const dados = await consultarDetalhesLog(id_log);
        res.json(dados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function Reprocessar(req, res) {
    try {
        const { id_servidor, id_integracao } = req.body;
        if (!id_servidor || !id_integracao) {
            return res.status(400).json({ error: "id_servidor e id_integracao são obrigatórios." });
        }
        await reprocessarIntegracao(id_servidor, id_integracao);
        res.json({ sucesso: true, mensagem: "Integração agendada para reprocessamento." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function ConsultarResumo(req, res) {
    try {
        const dados = await consultarResumo();
        res.json(dados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
