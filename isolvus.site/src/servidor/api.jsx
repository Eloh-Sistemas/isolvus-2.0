import axios from "axios";

//const URL = "https://elohsistemas.com.br:3010";
//const URL = "https://10.50.7.88:3010";
//const URL = "http://localhost:3011";
//const URL = "https://sgs.serrana.agr.br:58624";
const URL = "http://192.168.0.6:3011";
//const URL = "http://10.85.106.11:3011";

const api = axios.create({
    
    baseURL : URL,
    auth: {
        username: "Bellasistema",
        password: "bella123"
    }

});

export default api;