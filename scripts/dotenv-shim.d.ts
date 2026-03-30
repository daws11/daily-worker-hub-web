/**
 * Local type stub for dotenv — resolves the tsc "module not found" error.
 * At runtime, tsx resolves dotenv from pnpm's virtual store (.pnpm/).
 * This stub satisfies TypeScript without affecting the actual runtime resolution.
 */
declare module "dotenv" {
  interface DotenvConfigOptions {
    path?: string;
    encoding?: string;
    debug?: boolean;
    override?: boolean;
  }
  interface Parsed {
    [key: string]: string;
  }
  interface DotenvOutput {
    parsed?: Parsed;
    data?: Parsed;
    error?: Error;
  }
  function config(options?: DotenvConfigOptions): DotenvOutput;
  function parse(src: string | Buffer): Parsed;
  export = { config, parse };
}
