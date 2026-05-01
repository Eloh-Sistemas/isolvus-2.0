import axios from "axios";

export const API_BASE_URL = "http://192.168.0.9:3011";

const api = axios.create({
  baseURL: API_BASE_URL,
  auth: {
    username: "Bellasistema",
    password: "bella123",
  },
});

export default api;
