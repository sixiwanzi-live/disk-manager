import { stat } from 'fs/promises';
import { spawn } from 'child_process';
import error from "../error.js";
import config from '../config.js';
import PushApi from '../api/PushApi.js';

export default class DiskService {

    /**
     * 
     * @param {*} ctx 
     * @returns 
     * @throw error.push.Failed     当调用PushApi因网络原因失败时抛出该异常
     * @throw error.disk.BvIllegal  bv为空，或者bv长度不足12
     * @throw error.server          BBDown下载视频失败 
     */
    save = async (ctx) => {
        const bv = ctx.request.body.bv;
        return this.download(bv);
    };

    downloadByBv = async (bv) => {
        // 检查bv是否合法
        if (!bv || bv.length !== 12) {
            throw error.disk.BvIllegal;
        }

        const filepath = `${config.disk.path}/tmp/${bv}.mp4`;
        try {
            await stat(filepath);
            return {};
        } catch (ex) {}

        // 下载视频
        const cid = await BiliApi.fetchCid(bv);
        const src = await BiliApi.fetchStreamUrl(bv, cid, 120);
        console.log(`源视频地址:${src}`);
        try {
            await new Promise((res, rej) => {
                let p = spawn('wget', [src, `--header="Referer:${config.segment.referer}"`, `--user-agent="${config.segment.userAgent}"`, '-O', filepath]);
                p.stdout.on('data', (data) => {
                    console.log('stdout: ' + data.toString());
                });
                p.stderr.on('data', (data) => {
                    console.log('stderr: ' + data.toString());
                });
                p.on('close', (code) => {
                    console.log(`下载程序退出:${bv}, code:${code}`);
                    res();
                });
                p.on('error', (error) => {
                    console.log(error);
                    rej(error);
                });
            });
            try {
                await stat(filepath);
                await PushApi.push('视频下载完成', bv);
            } catch (ex2) {
                console.log(ex2);
                await PushApi.push('找不到下载视频', bv);
                throw ex2;
            }
        } catch (ex) {
            console.log(ex);
            throw {
                code: error.disk.DownloadFailed.code,
                message: ex
            }
        }
        return {};
    };
}