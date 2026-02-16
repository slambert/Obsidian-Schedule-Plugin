import { requestUrl } from 'obsidian';
import { SchedulePluginSettings } from './types';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

// Refresh token if it expires within this many milliseconds
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export class GoogleAuth {
    constructor(
        private getSettings: () => SchedulePluginSettings,
        private saveSettings: (settings: Partial<SchedulePluginSettings>) => Promise<void>
    ) {}

    startAuth(): string {
        const settings = this.getSettings();
        const params = new URLSearchParams({
            client_id: settings.clientId,
            redirect_uri: this.getSettings().redirectUri,
            response_type: 'code',
            scope: SCOPE,
            access_type: 'offline',
            prompt: 'consent',
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    async handleCallback(params: Record<string, string>): Promise<void> {
        const code = params['code'];
        if (!code) {
            throw new Error('No authorization code received from Google.');
        }

        const settings = this.getSettings();
        const response = await requestUrl({
            url: TOKEN_ENDPOINT,
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: settings.clientId,
                client_secret: settings.clientSecret,
                redirect_uri: this.getSettings().redirectUri,
                grant_type: 'authorization_code',
            }).toString(),
        });

        const data = response.json;
        if (data.error) {
            throw new Error(`Token exchange failed: ${data.error_description ?? data.error}`);
        }

        await this.saveSettings({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            tokenExpiresAt: Date.now() + data.expires_in * 1000,
        });
    }

    async getAccessToken(): Promise<string> {
        const settings = this.getSettings();

        const needsRefresh =
            !settings.accessToken ||
            settings.tokenExpiresAt - Date.now() < REFRESH_BUFFER_MS;

        if (needsRefresh) {
            if (!settings.refreshToken) {
                throw new Error('Not authenticated. Please connect Google Calendar in settings.');
            }

            const response = await requestUrl({
                url: TOKEN_ENDPOINT,
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: settings.refreshToken,
                    client_id: settings.clientId,
                    client_secret: settings.clientSecret,
                }).toString(),
            });

            const data = response.json;
            if (data.error) {
                throw new Error(`Token refresh failed: ${data.error_description ?? data.error}`);
            }

            await this.saveSettings({
                accessToken: data.access_token,
                tokenExpiresAt: Date.now() + data.expires_in * 1000,
            });

            return data.access_token as string;
        }

        return settings.accessToken;
    }

    async disconnect(): Promise<void> {
        await this.saveSettings({
            accessToken: '',
            refreshToken: '',
            tokenExpiresAt: 0,
        });
    }

    isAuthenticated(): boolean {
        return this.getSettings().refreshToken.length > 0;
    }
}
