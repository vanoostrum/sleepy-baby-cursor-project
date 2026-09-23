declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(location: string);
    exec(sql: string): void;
    prepare(sql: string): {
      run(params?: Record<string, string | number | null>): void;
      all(
        params?: Record<string, string | number | null>,
      ): Record<string, string | number | null>[];
      get(
        params?: Record<string, string | number | null>,
      ): Record<string, string | number | null> | undefined;
    };
  }
}
