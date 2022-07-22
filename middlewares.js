import error from "./error.js";
import PushApi from "./api/PushApi.js";

export async function errorHandler(ctx, next) {
    try {
        await next();
    } catch (e) {
        console.log(e);
        if (!(e instanceof Error) && e.hasOwnProperty('code') && e.hasOwnProperty('message')) {
            ctx.body = e;
        } else {
            ctx.body = error.server;
        }
        await PushApi.push('发现异常', `${ctx.body.code}:${ctx.body.message}`);
        ctx.status = parseInt(ctx.body.code / 1000000);
    }
}