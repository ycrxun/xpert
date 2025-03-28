## README for docker Deployment

Welcome to the `docker` directory for deploying XpertAI using Docker Compose. This README outlines the updates, deployment instructions, and migration details for existing users.

### Startup

#### Volume Permissions

Execute the following command in the *docker* directory to set the permissions for the binding folder:

- Create the directory if it doesn't exist
`mkdir -p ./volumes/api/public`

- Set ownership to UID 1000:GID 1000 (default for node user)
`sudo chown -R 1000:1000 ./volumes/api/public`

- Set permissions to allow read/write/execute for owner and group
`sudo chmod -R 775 ./volumes/api/public`

#### Start up

Start up the Docker containers

`docker compose up -d`

f you need to enable multidimensional modeling capabilities for data analysis, please start the Docker containers using the `bi` profile

`docker compose --profile bi up -d`

### For Chinese users

遇到网络问题的中国用户可以使用以下命令部署：

`docker compose -f docker-compose.cn.yml up -d`

同时要启用数据分析平台的可以使用以下命令：

`docker compose -f docker-compose.cn.yml --profile bi up -d`
