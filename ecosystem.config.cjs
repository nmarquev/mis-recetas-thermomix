module.exports = {
  apps: [
    {
      name: 'tastebox-backend',
      cwd: './backend',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'watch src/index.ts',
      interpreter: 'node',
      env: {
        NODE_ENV: 'development'
      },
      error_file: '../logs/backend-error.log',
      out_file: '../logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'tastebox-frontend',
      cwd: './',
      script: 'node_modules/vite/bin/vite.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'development'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
