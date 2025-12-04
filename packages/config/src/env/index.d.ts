import { z } from "zod";
declare const envSchema: any;
export type EnvConfig = z.infer<typeof envSchema>;
export declare function getConfig(): EnvConfig;
export declare function validateEnv(): void;
export {};
//# sourceMappingURL=index.d.ts.map