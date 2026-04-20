FROM node:20

# Instala dependências do Oracle Instant Client
RUN apt-get update && apt-get install -y libaio1 wget unzip && \
    wget https://download.oracle.com/otn_software/linux/instantclient/2112000/instantclient-basiclite-linux.x64-21.12.0.0.0dbru.zip \
         -O /tmp/ic.zip && \
    unzip /tmp/ic.zip -d /opt/oracle && \
    rm /tmp/ic.zip && \
    echo /opt/oracle/instantclient_21_12 > /etc/ld.so.conf.d/oracle-instantclient.conf && \
    ldconfig

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

EXPOSE 3020
CMD ["node", "src/index.js"]
