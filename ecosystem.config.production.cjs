// Configuración PM2 para PRODUCCIÓN
// Copiar como ecosystem.config.cjs en el servidor de producción
module.exports = {
  apps: [
    {
      name: 'tastebox-backend',
      cwd: './backend',
      script: 'dist/index.js',  // Usar build compilado
      interpreter: 'node',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      instances: 1,
      exec_mode: 'fork'
    },
    {
      name: 'tastebox-frontend',
      cwd: './',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --host --port 8080',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    }
  ]
};
