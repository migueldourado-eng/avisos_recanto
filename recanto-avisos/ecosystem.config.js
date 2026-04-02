module.exports = {
  apps: [
    {
      name: 'recanto-avisos',
      script: 'src/index.js',
      cwd: '/opt/recanto-avisos/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/recanto/error.log',
      out_file:   '/var/log/recanto/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
