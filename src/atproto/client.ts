import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

const PROD_CLIENT_ID = 'https://mosh.miren.club/client-metadata.json';
const PROD_REDIRECT = 'https://mosh.miren.club/';

// AT Proto supports loopback clients for dev (no public metadata URL needed)
const DEV_REDIRECT = `http://127.0.0.1:${window.location.port}/`;
const DEV_CLIENT_ID = `http://localhost?redirect_uri=${encodeURIComponent(DEV_REDIRECT)}&scope=${encodeURIComponent('atproto transition:generic')}`;

export const oauthClient = new BrowserOAuthClient({
  clientId: import.meta.env.DEV ? DEV_CLIENT_ID : PROD_CLIENT_ID,
  redirectUri: import.meta.env.DEV ? DEV_REDIRECT : PROD_REDIRECT,
});
