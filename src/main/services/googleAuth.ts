import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
  scope: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

class GoogleAuthService {
  private tokens: GoogleTokens | null = null;
  private userInfo: GoogleUserInfo | null = null;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tokenFilePath: string;
  private readonly encryptionKey: string;

  constructor() {
    // Use environment variables with fallback to hardcoded values
    this.clientId = process.env.GOOGLE_CLIENT_ID || '1001911230665-9qn1se3g00mn17p5vd0h2lt5kti2l1b9.apps.googleusercontent.com';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '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';
    
    console.log('🔐 Using Google OAuth Client ID:', this.clientId);
    
    // Store tokens in user data directory
    const userDataPath = app.getPath('userData');
    this.tokenFilePath = path.join(userDataPath, 'google-tokens.enc');
    
    // Create a machine-specific encryption key
    this.encryptionKey = this.getMachineKey();
    
    // Load existing tokens on startup
    this.loadTokens();
    
    console.log('🔐 GoogleAuthService initialized');
  }

  private getMachineKey(): string {
    // Create a machine-specific key based on user data path and app version
    const machineId = crypto.createHash('sha256')
      .update(app.getPath('userData'))
      .update(app.getVersion())
      .digest('hex');
    return machineId.substring(0, 32); // AES-256 needs 32 bytes
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async loadTokens(): Promise<void> {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        const encryptedData = fs.readFileSync(this.tokenFilePath, 'utf8');
        const decryptedData = this.decrypt(encryptedData);
        const data = JSON.parse(decryptedData);
        
        this.tokens = data.tokens;
        this.userInfo = data.userInfo;
        
        console.log('✅ Loaded stored Google tokens for:', this.userInfo?.email);
        
        // Check if tokens need refresh
        if (this.tokens && this.tokens.expires_at < Date.now()) {
          console.log('🔄 Tokens expired, refreshing...');
          await this.refreshTokens();
        }
      }
    } catch (error) {
      console.error('❌ Failed to load stored tokens:', error);
      this.tokens = null;
      this.userInfo = null;
    }
  }

  private async saveTokens(): Promise<void> {
    try {
      const data = {
        tokens: this.tokens,
        userInfo: this.userInfo,
        savedAt: new Date().toISOString()
      };
      
      const encryptedData = this.encrypt(JSON.stringify(data));
      fs.writeFileSync(this.tokenFilePath, encryptedData);
      
      console.log('💾 Saved Google tokens securely');
    } catch (error) {
      console.error('❌ Failed to save tokens:', error);
    }
  }

  public async exchangeCodeForTokens(authCode: string, redirectUri: string): Promise<GoogleTokens> {
    console.log('🔄 Exchanging authorization code for tokens...');
    console.log('🔍 DEBUG: Client ID:', this.clientId);
    console.log('🔍 DEBUG: Client Secret (first 10 chars):', this.clientSecret.substring(0, 10) + '...');
    console.log('🔍 DEBUG: Redirect URI:', redirectUri);
    console.log('🔍 DEBUG: Auth Code (first 20 chars):', authCode.substring(0, 20) + '...');
    console.log('🔍 DEBUG: Auth Code (full):', authCode);
    
    try {
      const tokenRequestBody = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });

      console.log('🔍 DEBUG: Token request body (full):', Object.fromEntries(tokenRequestBody.entries()));
      console.log('🔍 DEBUG: Request URL:', 'https://oauth2.googleapis.com/token');
      console.log('🔍 DEBUG: Request method:', 'POST');
      console.log('🔍 DEBUG: Request headers:', {
        'Content-Type': 'application/x-www-form-urlencoded'
      });

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenRequestBody,
      });

      console.log('🔍 DEBUG: Token response status:', tokenResponse.status);
      console.log('🔍 DEBUG: Token response statusText:', tokenResponse.statusText);
      console.log('🔍 DEBUG: Token response headers (full):', Object.fromEntries(tokenResponse.headers.entries()));

      // Get the response text first to log it
      const responseText = await tokenResponse.text();
      console.log('🔍 DEBUG: Token response body (raw):', responseText);

      if (!tokenResponse.ok) {
        console.error('❌ Token exchange failed');
        console.error('❌ Response status:', tokenResponse.status);
        console.error('❌ Response statusText:', tokenResponse.statusText);
        console.error('❌ Response body:', responseText);
        
        // Try to parse as JSON for structured error
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ Parsed error data:', JSON.stringify(errorData, null, 2));
        } catch (parseError) {
          console.error('❌ Could not parse error response as JSON');
        }
        
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${responseText}`);
      }

      // Parse the successful response
      let tokenData;
      try {
        tokenData = JSON.parse(responseText);
        console.log('✅ Token response parsed successfully');
        console.log('🔍 DEBUG: Token data (full):', JSON.stringify(tokenData, null, 2));
        console.log('🔍 DEBUG: Token data keys:', Object.keys(tokenData));
      } catch (parseError) {
        console.error('❌ Failed to parse successful token response as JSON:', parseError);
        console.error('❌ Response text:', responseText);
        throw new Error('Failed to parse token response');
      }
      
      // Calculate expiration time
      const expiresAt = Date.now() + (tokenData.expires_in * 1000);
      
      this.tokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        token_type: tokenData.token_type,
        scope: tokenData.scope
      };

      console.log('✅ Successfully obtained tokens');
      console.log('🔍 DEBUG: Access token (first 20 chars):', tokenData.access_token?.substring(0, 20) + '...');
      console.log('🔍 DEBUG: Refresh token (first 20 chars):', tokenData.refresh_token?.substring(0, 20) + '...');
      console.log('🔍 DEBUG: Token type:', tokenData.token_type);
      console.log('🔍 DEBUG: Scope:', tokenData.scope);
      console.log('🔍 DEBUG: Expires in:', tokenData.expires_in, 'seconds');
      
      // Get user info
      await this.fetchUserInfo();
      
      // Save tokens securely
      await this.saveTokens();
      
      return this.tokens;
    } catch (error) {
      console.error('❌ Failed to exchange code for tokens:', error);
      
      if (error instanceof Error) {
        console.error('❌ Error type:', error.constructor.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
      } else {
        console.error('❌ Unknown error type:', typeof error);
        console.error('❌ Error value:', error);
      }
      
      throw error;
    }
  }

  private async fetchUserInfo(): Promise<void> {
    if (!this.tokens) {
      throw new Error('No access token available');
    }

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.tokens.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`);
      }

      const userData = await response.json();
      this.userInfo = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture
      };

      console.log('✅ Fetched user info for:', this.userInfo.email);
    } catch (error) {
      console.error('❌ Failed to fetch user info:', error);
      throw error;
    }
  }

  private async refreshTokens(): Promise<void> {
    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    console.log('🔄 Refreshing access token...');

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();
      
      // Update tokens (keep existing refresh_token if not provided)
      this.tokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || this.tokens.refresh_token,
        expires_at: Date.now() + (tokenData.expires_in * 1000),
        token_type: tokenData.token_type,
        scope: tokenData.scope || this.tokens.scope
      };

      await this.saveTokens();
      console.log('✅ Successfully refreshed tokens');
    } catch (error) {
      console.error('❌ Failed to refresh tokens:', error);
      // If refresh fails, clear tokens to force re-authentication
      this.tokens = null;
      this.userInfo = null;
      await this.clearStoredTokens();
      throw error;
    }
  }

  public async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('User not authenticated');
    }

    // Check if token needs refresh (refresh 5 minutes before expiry)
    if (this.tokens.expires_at < Date.now() + (5 * 60 * 1000)) {
      await this.refreshTokens();
    }

    return this.tokens.access_token;
  }

  public isAuthenticated(): boolean {
    return this.tokens !== null && this.userInfo !== null;
  }

  public getUserInfo(): GoogleUserInfo | null {
    return this.userInfo;
  }

  public async signOut(): Promise<void> {
    console.log('🚪 Signing out from Google...');
    
    // Revoke tokens with Google
    if (this.tokens) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${this.tokens.access_token}`, {
          method: 'POST',
        });
        console.log('✅ Revoked tokens with Google');
      } catch (error) {
        console.error('⚠️ Failed to revoke tokens:', error);
      }
    }

    // Clear local data
    this.tokens = null;
    this.userInfo = null;
    await this.clearStoredTokens();
  }

  private async clearStoredTokens(): Promise<void> {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        fs.unlinkSync(this.tokenFilePath);
        console.log('🗑️ Cleared stored tokens');
      }
    } catch (error) {
      console.error('❌ Failed to clear stored tokens:', error);
    }
  }

  public getAuthUrl(redirectUri: string): string {
    console.log('🔗 Generating Google OAuth URL...');
    console.log('🔍 DEBUG: Client ID for auth URL:', this.clientId);
    console.log('🔍 DEBUG: Redirect URI for auth URL:', redirectUri);
    
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    console.log('🔍 DEBUG: Requested scopes:', scopes);

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `access_type=offline&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `response_type=code&` +
      `client_id=${encodeURIComponent(this.clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `prompt=consent`;

    console.log('🔍 DEBUG: Generated auth URL (full):', authUrl);
    console.log('🔍 DEBUG: Auth URL breakdown:');
    console.log('  - Base URL: https://accounts.google.com/o/oauth2/v2/auth');
    console.log('  - access_type: offline');
    console.log('  - scope (encoded):', encodeURIComponent(scopes.join(' ')));
    console.log('  - response_type: code');
    console.log('  - client_id (encoded):', encodeURIComponent(this.clientId));
    console.log('  - redirect_uri (encoded):', encodeURIComponent(redirectUri));
    console.log('  - prompt: consent');

    return authUrl;
  }
}

// Export singleton instance
const googleAuthService = new GoogleAuthService();
export default googleAuthService; 