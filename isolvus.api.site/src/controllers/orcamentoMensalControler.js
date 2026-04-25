import { SetReceber, GetConsultar, SetAtualizar, SetExcluir } from "../models/orcamentoMensalModel.js";

export async function Receber(req, res) {
    try {
        const jsonReq = req.body;
        const parametros = req.params;
        if (jsonReq.length == 0) {
            res.status(400).json({ error: 'Nenhum dado informado!' });
        } else if (!parametros.idusuario) {
            res.status(400).json({ error: 'Usuário não informado!' });
        } else if (!parametros.idgrupoempresa) {
            res.status(400).json({ error: 'Grupo de empresa não informado!' });
        } else {
            res.json(await SetReceber(jsonReq, parametros));
        }
    } catch (error) {
        res.status(500).json({ error });
    }
}

export async function Consultar(req, res) {
    try {
        const { idgrupoempresa } = req.params;
        if (!idgrupoempresa) {
            return res.status(400).json({ error: 'Grupo de empresa não informado!' });
        }
        const filtros = {
            filial:   req.query.filial   || null,
            ano:      req.query.ano      || null,
            codconta: req.query.codconta || null,
            conta:    req.query.conta    || null,
        };
        const dados = await GetConsultar(idgrupoempresa, filtros);
        res.json(dados);
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
}

export async function Atualizar(req, res) {
    try {
        const { idgrupoempresa, idusuario } = req.params;
        if (!idgrupoempresa) {
            return res.status(400).json({ error: 'Grupo de empresa não informado!' });
        }
        const row = req.body;
        if (!row.CodConta || !row.Ano || !row.Filial) {
            return res.status(400).json({ error: 'CodConta, Ano e Filial são obrigatórios!' });
        }
        await SetAtualizar(row, idgrupoempresa, idusuario);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
}

export async function Excluir(req, res) {
    try {
        const { idgrupoempresa, idusuario } = req.params;
        if (!idgrupoempresa) {
            return res.status(400).json({ error: 'Grupo de empresa não informado!' });
        }
        const row = req.body;
        if (!row.CodConta || !row.Ano || !row.Filial) {
            return res.status(400).json({ error: 'CodConta, Ano e Filial são obrigatórios!' });
        }
        await SetExcluir(row, idgrupoempresa, idusuario);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
}