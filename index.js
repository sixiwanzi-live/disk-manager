import Koa from 'koa';
import Router from '@koa/router';
import cors from '@koa/cors';
import koaBody from 'koa-body';
import pino from 'pino';
import config from './config.js';
import { errorHandler } from './middlewares.js';
import DiskService from './disk/DiskService.js';
import SegmentService from './segment/SegmentService.js';

(async () => {
    const app = new Koa({ proxy: true });
    const router = new Router();

    app.context.diskService = new DiskService();
    app.context.segmentService = new SegmentService();

    /**
     * hello
     */
    router.get('/hello', ctx => {
        ctx.body = 'hello';
    });

    /**
     * disk
     */
    router.post('/disks', async ctx => {
        ctx.body = await ctx.diskService.save(ctx);
    });

    /**
     * segment
     */
    router.get('/clips/:clipId/segments', async ctx => {
        ctx.body = await ctx.segmentService.make(ctx);
    });

    app.use(koaBody({ 
        jsonLimit: config.web.bodyLimit
    }));
    
    app.use(pino());
    app.use(cors());
    app.use(errorHandler);
    app.use(router.routes());

    app.listen(config.web.port);
})();
