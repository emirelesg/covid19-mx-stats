module.exports = {
  apps: [
    {
      name: 'worker',
      script: './src/index.js',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'status',
      script: './src/status.js',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 80
      }
    }
  ]
};
