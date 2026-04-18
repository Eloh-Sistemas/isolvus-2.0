import { executeQuery } from "../config/database.js"


export async function dicionariodedados() {

    try {
        
        const result = await executeQuery('SELECT * FROM BSVIEW_DICIONARIODEDADOS');
        return result;

    } catch (error) {
        throw error
    }
    
}

export async function iaConsultarDados(sql) {

    try {

        console.log(sql);
        const result = await executeQuery(sql);
        //console.log(result);
        return result;

    } catch (error) {
        throw error
    }
    
}