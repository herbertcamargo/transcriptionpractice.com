// Configuration settings based on environment
require('dotenv').config();

const config = {
  // Common settings
  port: process.env.PORT || 8080,
  
  // Environment-specific settings
  development: {
    cache: {
      enabled: false,
      expiry: 60 * 60 * 1000 // 1 hour in milliseconds
    },
    rateLimits: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // 100 requests per windowMs
    }
  },
  
  production: {
    cache: {
      enabled: true,
      expiry: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    },
    rateLimits: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50 // Stricter rate limiting in production
    }
  },
  
  test: {
    cache: {
      enabled: false
    },
    rateLimits: {
      windowMs: 15 * 60 * 1000,
      max: 1000 // More relaxed for testing
    }
  }
};

// Determine current environment
const env = process.env.NODE_ENV || 'development';

// Export settings for current environment
module.exports = {
  ...config,
  env,
  settings: config[env]
}; 