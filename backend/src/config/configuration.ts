import * as dns from 'node:dns';

function configureDnsServers() {
  const servers = (process.env.DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (servers.length > 0) {
    dns.setServers(servers);
  }
}

export default () => {
  configureDnsServers();

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cracker_shop',
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:4200,http://localhost:4300')
      .split(',')
      .map((s) => s.trim()),
    rateLimit: {
      ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
      max: parseInt(process.env.RATE_LIMIT_MAX || '20', 10),
    },
  };
};
