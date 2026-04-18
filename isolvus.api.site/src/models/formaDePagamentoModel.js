import { executeQuery } from "../config/database.js";

export async function GetListarFormadePagamento(filtros) {
     try {
    
                const ssql = `                
                    SELECT * FROM BSTAB_FORMADEPAGAMENTO                 
                `;
        
                        
                const result = await executeQuery(ssql, []);  
                return result;
        
        
            } catch (error) {
                throw new Error(error);        
            }
}