declare global {
    namespace NodeJS {
        interface ProcessEnv {
            STRIPE_PUBLISHABLE_KEY: string;
            STRIPE_SECRET_KEY: string;
            CACHE_MODE: boolean;
        }
    }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}