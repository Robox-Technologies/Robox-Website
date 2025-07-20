declare global {
    namespace NodeJS {
        interface ProcessEnv {
            STRIPE_PUBLISHABLE_KEY: string;
            STRIPE_SECRET_KEY: string;
            STRIPE_WEBHOOK_SECRET: string;
            FORCE_CACHE: boolean;
            SUPABASE_URL: string;
            SUPABASE_PUBLISHABLE_KEY: string;
            SUPABASE_SERVICE_ROLE_KEY: string;
        }
    }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}