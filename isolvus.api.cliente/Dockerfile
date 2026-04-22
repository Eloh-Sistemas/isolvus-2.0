FROM node:20-slim

# Dependências do sistema para o Oracle Instant Client
RUN apt-get update && apt-get install -y --no-install-recommends \
    libaio1 unzip \
    && rm -rf /var/lib/apt/lists/*

# Instala o Oracle Instant Client a partir do zip local
# Baixe em: https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html
# e coloque o arquivo como instantclient.zip nesta pasta
COPY instantclient.zip /tmp/ic.zip
RUN unzip /tmp/ic.zip -d /opt/oracle \
    && rm /tmp/ic.zip \
    && echo /opt/oracle/instantclient_21_21 > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY . .

ENV ORACLE_CLIENT_DIR=/opt/oracle/instantclient_21_21

EXPOSE 3020

CMD ["node", "src/index.js"]
