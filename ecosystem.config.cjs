module.exports = {
  apps: [
    {
      name: 'crypto-trader-dev',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      interpreter: 'none',
      autorestart: false,
      watch: false
    }
  ]
};