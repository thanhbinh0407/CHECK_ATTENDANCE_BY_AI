// PM2 Ecosystem Configuration for Production

module.exports = {
  apps: [
    {
      // Backend API
      name: 'payroll-backend',
      script: './src/index.js',
      cwd: './face-attendance-backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      
      // Logging
      output: '/var/log/pm2/out.log',
      error: '/var/log/pm2/error.log',
      
      // Restart policy
      max_memory_restart: '1G',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'coverage'],
      
      // Development
      args: '--node-args=--max-old-space-size=4096',
    },
    {
      // Frontend with Nginx
      name: 'payroll-frontend',
      script: 'npm',
      args: 'start',
      cwd: './payroll-frontend',
      env: {
        NODE_ENV: 'production',
      },
      
      // Logging
      output: '/var/log/pm2/frontend-out.log',
      error: '/var/log/pm2/frontend-error.log',
      
      // Restart policy
      max_memory_restart: '512M',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'dist'],
    }
  ],

  // Deploy configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/payroll-system.git',
      path: '/var/www/payroll',
      'post-deploy': 'npm install && npm run migrate && pm2 startOrRestart ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production..."'
    },
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/payroll-system.git',
      path: '/var/www/payroll-staging',
      'post-deploy': 'npm install && npm run migrate:test && pm2 startOrRestart ecosystem.config.js --env staging',
      'pre-deploy-local': 'echo "Deploying to staging..."'
    }
  }
};
