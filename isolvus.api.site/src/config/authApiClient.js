const authApiClient = {
    auth: {
      username: process.env.AUTH_API_USERNAME,
      password: process.env.AUTH_API_PASSWORD,
    },
    timeout: 30000 // 30 segundos — evita que a integração fique presa se a api.cliente não responder
  };

export {authApiClient}