import Koa from 'koa';
import Router from '@koa/router';
import cors from '@koa/cors';
import koaBody from 'koa-body';
import config from './config.js';
import DiskService from './disk/DiskService.js';

(async () => {
    const app = new Koa({ proxy: true });
    const router = new Router();

    app.context.diskService = new DiskService();
    await app.context.diskService.init();

    /**
     * disk
     */
    router.post('/disks', async ctx => {
        ctx.body = await ctx.diskService.save(ctx);
    });
    router.get('/disks/:bv', async ctx => {
        ctx.body = await ctx.diskService.visit(ctx);
    });

    app.use(koaBody({ 
        jsonLimit: config.web.bodyLimit
    }));
    
    app.use(cors());
    app.use(router.routes());

    app.listen(config.web.port);
})();
