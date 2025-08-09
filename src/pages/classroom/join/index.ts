import { authCheck } from "@root/account";

addEventListener('DOMContentLoaded', async () => {
    await authCheck()
});