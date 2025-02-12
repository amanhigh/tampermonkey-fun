export interface IBaseClient {
  getBaseUrl(): string;
}

export class BaseClient implements IBaseClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  protected async makeRequest<T>(endpoint: string, options: Partial<GM.Request> = {}): Promise<T> {
    const headers = {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.5',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers,
    };

    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: options.method || 'GET',
        url: `${this.baseUrl}${endpoint}`,
        headers,
        data: options.data,
        responseType: options.responseType,
        onload: (response: GM.Response<T>) => {
          if (response.status >= 200 && response.status < 400) {
            try {
              // Return response text directly if responseType is 'text'
              if (options.responseType === 'text') {
                resolve(response.responseText as T);
                return;
              }
              // Default JSON parsing for backward compatibility
              const data = response.responseText ? JSON.parse(response.responseText) : null;
              resolve(data);
            } catch (error) {
              reject(new Error(`Failed to parse response: ${(error as Error).message}`));
            }
          } else {
            reject(new Error(`${response.status} ${response.statusText}: ${response.responseText}`));
          }
        },
        onerror: (error: GM.Response<T>) => reject(new Error(`Network error: ${error.statusText}`)),
      });
    });
  }
}
