import { AuthorizationCode } from 'simple-oauth2';
import { discoverOAuth2 } from './mcp-client.js';
import { getAuthConfig, setAuthConfig } from './auth-storage.js';

export function createOAuth2Client(
  clientId: string,
  clientSecret: string | undefined,
  authorizationEndpoint: string,
  tokenEndpoint: string,
): AuthorizationCode {
  const authUrl = new URL(authorizationEndpoint);
  const tokenUrl = new URL(tokenEndpoint);

  return new AuthorizationCode({
    client: { id: clientId, secret: clientSecret },
    auth: {
      authorizeHost: authUrl.origin,
      authorizePath: authUrl.pathname,
      tokenHost: tokenUrl.origin,
      tokenPath: tokenUrl.pathname,
    },
    options: {
      bodyFormat: 'form',
      authorizationMethod: 'body',
    },
  });
}

export async function refreshTokenIfExpired(name: string, clientUrl: string): Promise<void> {
  const authData = getAuthConfig(name);
  if (!authData?.refreshToken || !authData.expiresAt) return;

  // Check if token is expired (with 5 min buffer)
  if (Date.now() < authData.expiresAt - 300_000) return;

  const authConfig = await discoverOAuth2(clientUrl);
  if (!authConfig) return;

  const clientId = authData.auth?.clientId;
  if (!clientId) return;

  const oauth2 = createOAuth2Client(
    clientId,
    authData.auth?.clientSecret,
    authConfig.authorizationEndpoint,
    authConfig.tokenEndpoint,
  );

  try {
    const token = oauth2.createToken({
      access_token: authData.accessToken || '',
      refresh_token: authData.refreshToken,
      expires_in: Math.floor((authData.expiresAt - Date.now()) / 1000),
    });

    if (token.expired()) {
      const refreshed = await token.refresh();
      const refreshedData = refreshed.token;
      setAuthConfig(name, {
        accessToken: refreshedData.access_token as string,
        refreshToken: refreshedData.refresh_token as string | undefined,
        expiresAt: refreshedData.expires_in
          ? Date.now() + (refreshedData.expires_in as number) * 1000
          : undefined,
      });
    }
  } catch {
    // Refresh failed — will try again next time
  }
}
