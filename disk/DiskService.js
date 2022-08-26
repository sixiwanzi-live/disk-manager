import { stat } from 'fs/promises';
import { spawn } from 'child_process';
import error from "../error.js";
import config from '../config.js';
import BiliApi from '../api/BiliApi.js';
import PushApi from '../api/PushApi.js';
import ZimuApi from '../api/ZimuApi.js';

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
        if (bv) {
            return this.downloadByBv(bv);
        }

        const url = ctx.request.body.url;
        if (url) {
            return this.downloadByUrl(url);
        }

        const clipId = ctx.request.body.clipId;
        if (clipId) {
            return this.downloadByClipId(clipId);
        }
    };

    downloadByClipId = async (clipId) => {
        // 获取clip基础信息
        const filepath = `${config.disk.path}/video/${clipId}.mp4`;
        try {
            await stat(filepath);
            return {};
        } catch (ex) {}

        const clip = await ZimuApi.findClipById(clipId);
        console.log(clip);

        let src = '';
        if (clip.type === 1) {
            // 下载视频
            const bv = clip.playUrl.substring(clip.playUrl.length - 12);
            const cid = await BiliApi.fetchCid(bv);
            src = await BiliApi.fetchStreamUrl(bv, cid, 120); 
        } else {
            src = `https://${clip.playUrl}`;
        }
        console.log(`源视频地址:${src}`);

        try {
            await new Promise((res, rej) => {
                let cmd = [
                    '-user_agent', config.segment.userAgent, 
                    '-headers', `Referer: ${config.segment.referer}`,
                    '-i', src,
                    '-c', 'copy',
                    filepath,
                    '-v', 'debug'
                ];
                let p = spawn('ffmpeg', cmd);
                p.stdout.on('data', (data) => {
                    console.log('stdout: ' + data.toString());
                });
                p.stderr.on('data', (data) => {
                    console.log('stderr: ' + data.toString());
                });
                p.on('close', (code) => {
                    console.log(`下载程序退出:${clip.id}-${clip.title}, code:${code}`);
                    res();
                });
                p.on('error', (error) => {
                    console.log(error);
                    rej(error);
                });
            });
        } catch (ex) {
            console.log(ex);
            throw {
                code: error.disk.DownloadFailed.code,
                message: ex
            }
        }
    }

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
                let cmd = [
                    '-user_agent', config.segment.userAgent, 
                    '-headers', `Referer: ${config.segment.referer}`,
                    '-i', src,
                    '-c', 'copy',
                    filepath,
                    '-v', 'debug'
                ];
                let p = spawn('ffmpeg', cmd);
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

    downloadByUrl = async (url) => {
        const fields = url.split('/');
        const filename = fields[fields.length - 1].split('.')[0];
        const filepath = `${config.disk.path}/tmp/${filename}.mp4`;
        try {
            await stat(filepath);
            return {};
        } catch (ex) {}

        // 下载视频
        const src = url;
        console.log(`源视频地址:${src}`);
        try {
            await new Promise((res, rej) => {
                let cmd = [
                    '-i', src,
                    '-c', 'copy',
                    filepath,
                    '-v', 'debug'
                ];
                let p = spawn('ffmpeg', cmd);
                p.stdout.on('data', (data) => {
                    console.log('stdout: ' + data.toString());
                });
                p.stderr.on('data', (data) => {
                    console.log('stderr: ' + data.toString());
                });
                p.on('close', (code) => {
                    console.log(`下载程序退出:${filename}, code:${code}`);
                    res();
                });
                p.on('error', (error) => {
                    console.log(error);
                    rej(error);
                });
            });
            try {
                await stat(filepath);
                await PushApi.push('视频下载完成', filename);
            } catch (ex2) {
                console.log(ex2);
                await PushApi.push('找不到下载视频', filename);
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