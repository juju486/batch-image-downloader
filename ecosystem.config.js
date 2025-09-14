module.exports = {
  apps: [{
    name: 'image-downloader',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    // 日志配置
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 进程管理
    min_uptime: '10s',
    max_restarts: 10,
    
    // 集群模式（可选）
    // instances: 'max',
    // exec_mode: 'cluster'
  }]
};
