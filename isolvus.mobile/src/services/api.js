import axios from "axios";

export const API_BASE_URL_PADRAO = "http://192.168.0.9:3011";

const api = axios.create({
  baseURL: API_BASE_URL_PADRAO,
  auth: {
    username: "Bellasistema",
    password: "bella123",
  },
});

export function setBaseUrl(url) {
  api.defaults.baseURL = url;
}

export default api;
