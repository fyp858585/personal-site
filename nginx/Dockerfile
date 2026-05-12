FROM nginx:1.25-alpine

# 删除默认配置
RUN rm -f /etc/nginx/conf.d/default.conf /etc/nginx/nginx.conf

# 使用自定义配置
COPY nginx.conf /etc/nginx/nginx.conf

# 静态文件通过 docker-compose volume 挂载，不打进镜像
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
