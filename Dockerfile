FROM ubuntu_new
RUN git clone -b Development https://github.com/DuoSoftware/DVP-DynamicConfigurationGenerator.git /usr/local/src/dynamicconfigurationgenerator
RUN cd /usr/local/src/dynamicconfigurationgenerator; npm install
