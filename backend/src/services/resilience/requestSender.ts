import http from 'http';
import https from 'https';
import { URL } from 'url';

/**
 * Encapsulated HTTP response data.
 */
export interface HttpResponse<T = unknown> {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  data: T;
}

/**
 * Configuration options for HTTP requests.
 */
export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | object;
  timeoutMs?: number;
}

/**
 * Internal raw HTTP/HTTPS sender utilizing standard Node modules for nock compatibility.
 *
 * @param urlStr - Target request URL string
 * @param options - Request options
 * @returns Resolves with HttpResponse
 */
export const sendRawRequest = <T = unknown>(
  urlStr: string,
  options: HttpRequestOptions = {},
): Promise<HttpResponse<T>> => {
  return new Promise<HttpResponse<T>>((resolve, reject): void => {
    const parsedUrl = new URL(urlStr);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.request(
      parsedUrl,
      {
        method: options.method ?? 'GET',
        headers: options.headers,
        timeout: options.timeoutMs ?? 10000,
      },
      (res): void => {
        let rawData = '';
        res.on('data', (chunk: Buffer | string): void => {
          rawData += chunk.toString();
        });
        res.on('end', (): void => {
          const contentType = res.headers['content-type'] ?? '';
          let data: unknown = rawData;
          if (contentType.includes('application/json') && rawData.trim() !== '') {
            try {
              data = JSON.parse(rawData);
            } catch {
              // fallback to raw text if not JSON
            }
          }
          resolve({
            status: res.statusCode ?? 200,
            headers: res.headers,
            data: data as T,
          });
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', (): void => {
      req.destroy(new Error(`Request to ${urlStr} timed out`));
    });

    if (options.body) {
      const payload =
        typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(payload);
    }
    req.end();
  });
};
