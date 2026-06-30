declare module 'simple-oauth2' {
  export interface AuthorizationCodeConfig {
    client: {
      id: string;
      secret?: string;
      secretParamName?: string;
      idParamName?: string;
    };
    auth: {
      authorizeHost?: string;
      authorizePath?: string;
      tokenHost?: string;
      tokenPath?: string;
      revokePath?: string;
    };
    http?: {
      json?: boolean;
    };
    options?: {
      bodyFormat?: 'form' | 'json';
      authorizationMethod?: 'header' | 'body';
      scopeSeparator?: string;
      credentialsEncodingMode?: 'strict' | 'loose';
    };
  }

  export interface AuthorizationTokenConfig {
    code: string;
    redirect_uri: string;
    code_verifier?: string;
    scope?: string;
    [key: string]: unknown;
  }

  export interface AccessToken {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    [key: string]: unknown;
  }

  export class Token {
    token: AccessToken;
    constructor(data: AccessToken);
    expired(expirationWindowSeconds?: number): boolean;
    refresh(params?: Record<string, unknown>, httpOptions?: Record<string, unknown>): Promise<Token>;
    revoke(type: string, httpOptions?: Record<string, unknown>): Promise<void>;
    revokeAll(httpOptions?: Record<string, unknown>): Promise<void>;
    toJSON(): AccessToken;
  }

  export class AuthorizationCode {
    constructor(config: AuthorizationCodeConfig);
    authorizeURL(options?: Record<string, unknown>): string;
    getToken(params: AuthorizationTokenConfig, httpOptions?: Record<string, unknown>): Promise<Token>;
    createToken(data: AccessToken): Token;
  }
}
