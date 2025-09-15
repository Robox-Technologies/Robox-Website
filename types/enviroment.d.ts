declare global {
    namespace NodeJS {
        interface ProcessEnv {
            STRIPE_PUBLISHABLE_KEY: string;
            STRIPE_SECRET_KEY: string;
            STRIPE_WEBHOOK_SECRET: string;
            FORCE_CACHE: boolean;

            EMAIL_HOST: string;
            EMAIL_PORT: number;
            EMAIL_SECURE: boolean;
            EMAIL_USER: string;
            EMAIL_PASS: string;

            RESEND_KEY: string;
            AUSPOST_KEY: string;
            AUSPOST_ORIGIN_POSTCODE: string;
        }
    }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}