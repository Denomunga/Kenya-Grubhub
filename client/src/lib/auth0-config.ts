export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || 'your-tenant.auth0.com',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || 'your-client-id',
  audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://your-tenant.auth0.com/api/v2/',
  redirectUri: window.location.origin,
  scope: 'openid profile email',
  // Enable Universal Login with signup
  advancedOptions: {
    defaultDatabaseConnection: 'Username-Password-Authentication'
  }
};
