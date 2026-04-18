import axios from 'axios';

export async function ElohIA(req, res) {

    const ollamaUrl = 'http://localhost:11434/api/generate';  // Endpoint correto da API

    const data = {
        model: "llama3",   
        prompt: req.body.prompt, 
        stream: false  
    }        

    try {
        const response = await axios.post(ollamaUrl, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        res.json({resposta: response.data.response.toString()});

    } catch (error) {
        console.error('Erro na requisição:', error);
        res.status(500).send('Erro na comunicação com o Ollama');
    }
}
