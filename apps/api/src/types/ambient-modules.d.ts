declare module 'bcryptjs' {
  export function compare(value: string, encrypted: string): Promise<boolean>;
  export function hash(value: string, saltOrRounds: string | number): Promise<string>;
}

declare module 'passport-jwt' {
  export type JwtFromRequestFunction = (...args: unknown[]) => string | null;

  export interface StrategyOptions {
    jwtFromRequest: JwtFromRequestFunction;
    ignoreExpiration?: boolean;
    secretOrKey: string;
  }

  export const ExtractJwt: {
    fromAuthHeaderAsBearerToken(): JwtFromRequestFunction;
  };

  export class Strategy {
    constructor(options: StrategyOptions);
  }
}
