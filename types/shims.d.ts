// Keeps the app compiling against a sandboxed @supabase/auth-js install
// that may ship without its .d.ts files. On a clean `npm install` these
// declarations are harmless — the real upstream types win.
declare module "@supabase/auth-js" {
  export class AuthClient {
    signInWithOtp(args: { email: string; options?: any }): Promise<{ data: any; error: any }>;
    signOut(): Promise<{ error: any }>;
    getUser(): Promise<{ data: { user: { id: string; email?: string } | null }; error: any }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [k: string]: any;
  }
  export class GoTrueClient extends AuthClient {}
  export type Session = any;
  export type User = { id: string; email?: string };
  export type AuthClientOptions = any;
  export type GoTrueClientOptions = any;
}
