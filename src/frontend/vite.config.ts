import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { ClientRequest, IncomingMessage } from 'node:http';

// Aspire automatically injects environment variables into our frontend to tell it 
// where the other services are running. Because we named our gateway "api-gateway" 
// in the AppHost, Aspire creates variables like 'services__api_gateway__http__0'.
function resolveApiProxyTarget(): string | undefined {
    return process.env.VITE_API_PROXY_TARGET ||
        // Use bracket notation to safely read the hyphenated names from Aspire
        process.env['services__api-gateway__https__0'] ||
        process.env['services__api-gateway__http__0'];
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
    const apiProxyTarget = resolveApiProxyTarget();

    if (command === 'serve' && !apiProxyTarget) {
        console.warn(
            '[TravelSite] No API proxy target was provided. Start the app through the Aspire AppHost ' +
            'or set VITE_API_PROXY_TARGET manually. /api requests will not be proxied.'
        );
    }

    return {
        plugins: [react()],
        resolve: {
            dedupe: ['react', 'react-dom'],
        },
        server: {
            // This tells Vite: "If you see a request for /api, don't try to handle it yourself. 
            // Send it through the proxy directly to the API Gateway."
            proxy: apiProxyTarget ? {
                '/api': {
                    target: apiProxyTarget,
                    changeOrigin: true,
                    secure: false, // Useful for local dev with self-signed certs
                    ws: true,
                    configure: (proxy) => {
                        proxy.on('proxyReq', (proxyReq: ClientRequest, req: IncomingMessage) => {
                            const browserHost = req.headers.host;
                            if (browserHost) {
                                proxyReq.setHeader('X-Forwarded-Host', browserHost);
                            }

                            const forwardedProto = req.headers['x-forwarded-proto'];
                            proxyReq.setHeader(
                                'X-Forwarded-Proto',
                                Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || 'http'
                            );
                        });
                    },
                }
            } : undefined
        }
    };
});