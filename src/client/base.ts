export class BaseClient {
    private readonly _baseUrl: string;

    constructor(baseUrl: string) {
        this._baseUrl = baseUrl;
    }

    protected getBaseUrl(): string {
        return this._baseUrl;
    }

    protected async makeRequest<T>(endpoint: string, options: Partial<GM.Request> = {}): Promise<T> {
        const headers = {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            ...options.headers
        };

        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: options.method || 'GET',
                url: `${this._baseUrl}${endpoint}`,
                headers,
                data: options.data,
                onload: (response: GM.Response<any>) => {
                    if (response.status >= 200 && response.status < 400) {
                        try {
                            const data = response.responseText ? JSON.parse(response.responseText) : null;
                            resolve(data as T);
                        } catch (error) {
                            reject(new Error(`Failed to parse response: ${(error as Error).message}`));
                        }
                    } else {
                        reject(new Error(`${response.status} ${response.statusText}: ${response.responseText}`));
                    }
                },
                onerror: (error: GM.Response<any>) => reject(new Error(`Network error: ${error.statusText}`))
            });
        });
    }
}