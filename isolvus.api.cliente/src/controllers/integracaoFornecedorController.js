import { getintegracaoFornecedorDadosArquivo } from "../models/integracaoFornecedorModel.js";


export async function integracaoFornecedorDadosArquivo(req, res) {

    try {

        const jsonReq = req.body;
       
        
        if (!jsonReq.sql){
            res.status(400).json({error: 'Sql não informado!'});
        }else{
            
            res.json( await getintegracaoFornecedorDadosArquivo(jsonReq));
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }

}


