FROM allwefantasy/byzer-storage:latest

WORKDIR /app

ENV PATH=/opt/conda/bin:$PATH
SHELL ["conda", "run", "-n", "py310", "/bin/bash", "-c"]

# 创建工作目录和日志目录
RUN mkdir -p /app/work /app/logs

# 设置工作目录和日志目录
VOLUME ["/app/work", "/app/logs"]

# 暴露需要的端口
EXPOSE 8006 8007 8265

# 启动服务的脚本
COPY start.sh /app/
RUN chmod +x /app/start.sh

# 使用conda环境运行启动脚本
ENTRYPOINT ["conda", "run", "-n", "py310", "/app/start.sh"]
