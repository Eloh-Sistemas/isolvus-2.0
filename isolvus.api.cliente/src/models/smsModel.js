import { executeQuery } from "../config/database.js";

export async function getConsultaSms() {

    const ssql = `
        select * from vw_bs_enviasms
    `;

    
    try {
        
        const result = await executeQuery(ssql);
        return result;

    } catch (error) {
        throw 'consulta Setor: '+error
    }

}