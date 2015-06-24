FROM ubuntu
RUN apt-get update
RUN apt-get install -y git nodejs npm
RUN git clone https://github.com/DuoSoftware/DVP-DynamicConfigurationGenerator.git /usr/local/src/dynamicconfigurationgenerator
RUN cd /usr/local/src/dynamicconfigurationgenerator; npm install
CMD ["nodejs", "/usr/local/src/dynamicconfigurationgenerator/app.js"]

EXPOSE 8816