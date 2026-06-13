import type { Bindings } from '../@types';

// Expose Bindings type to `env` imported from `cloudflare:test`
declare module 'cloudflare:test' {
  interface ProvidedEnv extends Bindings {}
}
