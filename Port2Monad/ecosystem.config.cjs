module.exports = {
  apps: [
    {
      name: 'monad-backend',
      script: './dist/server.js',
      cwd: '/home/eakyurek/Monad',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 8012,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8012,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
    },
    {
      name: 'monad-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/home/eakyurek/Monad/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8092,
        NEXT_PUBLIC_API_URL: 'http://localhost:8012',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8092,
        NEXT_PUBLIC_API_URL: 'http://localhost:8012',
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '300M',
      watch: false,
      ignore_watch: ['node_modules', '.next', 'logs'],
    },
  ],

  deploy: {
    production: {
      user: 'monad',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/monad.git',
      path: '/var/www/monad',
      'post-deploy': 'npm install && npm run build && pm2 startOrRestart ecosystem.config.js --env production',
    },
  },
};
