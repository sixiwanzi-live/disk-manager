import { stat, unlink } from 'fs/promises';
import {spawn} from 'child_process';
import { EventEmitter } from 'events';
import error from "../error.js";
import config from '../config.js';
import {toTime} from '../util.js';
import BiliApi from '../api/BiliApi.js';
import PushApi from '../api/PushApi.js';
import ZimuApi from '../api/ZimuApi.js';

export default class SegmentService {

    constructor() {
        this.emitter = new EventEmitter();
        this.emitter.on('cache', async (clipId, url) => {
            const output = `${config.disk.path}/video/${clipId}.mp4`;
            try {
                const res = await stat(output);
                console.log('------------------------------------------------------------------------', res);
            } catch (ex) {
                try {
                    await new Promise((res, rej) => {
                        let cmd = [
                            '-threads', 8,
                            '-user_agent', config.segment.userAgent, 
                            '-headers', `Referer: ${config.segment.referer}`,
                            '-i', url,
                            '-c', 'copy',
                            output,
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
                            console.log(`下载程序退出:${clipId}, code:${code}`);
                            res();
                        });
                        p.on('error', (error) => {
                            console.log(error);
                            rej(error);
                        });
                    });
                    try {
                        await stat(output);
                        await PushApi.push('视频下载完成', `${clipId}.mp4`);
                    } catch (ex2) {
                        console.log(ex2);
                        await PushApi.push('找不到下载视频', `${clipId}.mp4`);
                        throw ex2;
                    }
                } catch (ex) {
                    console.log(ex);
                    throw {
                        code: error.disk.DownloadFailed.code,
                        message: ex
                    }
                }
            }
        });
    }

    make = async (ctx) => {
        const clipId    = ctx.params.clipId;
        const startTime = ctx.request.query.startTime;
        const endTime   = ctx.request.query.endTime;
        const audio     = ctx.request.query.audio || 'false';
        console.log(`req:${clipId}, ${startTime}, ${endTime}, ${audio}`);
        
        if (endTime - startTime <= 1000) {
            throw error.segment.IntervalTooShort;
        }
        if (endTime - startTime > config.segment.maxInterval * 60 * 1000) {
            throw error.segment.IntervalTooLong;
        }

        let filename = `clip-${clipId}-${toTime(startTime).replaceAll(':', '-')}--${toTime(endTime).replaceAll(':', '-')}`;
        if (audio === 'true') {
            filename = `${filename}.aac`;
        } else {
            filename = `${filename}.mp4`;
        }
        const output = `${config.disk.path}/segment/${filename}`;
        // 删除可能存在的切片
        try {
            await unlink(output);
        } catch (ex) {}

        // 获取clip基础信息
        const clip = await ZimuApi.findClipById(clipId);
        console.log(clip);

        try {
            // 先尝试使用本地源生成切片
            const src = `${config.disk.path}/video/${clipId}.mp4`;
            const res = await stat(src);
            console.log(`源视频地址:${src}`);
            let cmd = [
                '-threads', 8,
                '-ss', toTime(startTime), 
                '-to', toTime(endTime), 
                '-accurate_seek', 
                '-i', src,
                '-c', 'copy',
                '-avoid_negative_ts', 1,
                output,
                '-v', 'debug'
            ];
            if (audio === 'true') {
                cmd = ['-vn', ...cmd];
            }
            await new Promise((res, rej) => {
                let p = spawn('ffmpeg', cmd);
                p.stdout.on('data', (data) => {
                    console.log('stdout: ' + data.toString());
                });
                p.stderr.on('data', (data) => {
                    console.log('stderr: ' + data.toString());
                });
                p.on('close', (code) => {
                    console.log(`ffmpeg退出:${clip.id}-${clip.title}, code:${code}`);
                    res();
                });
                p.on('error', (error) => {
                    console.log(error);
                    rej(error);
                });
            });
        } catch (ex) {
            // 如果本地源生成切片失败，则使用远程源
            let src = '';
            if (clip.type === 1) {
                // 获取B站视频源
                // playUrl的格式为player.bilibili.com/player.html?bvid=BV1Mg411C7FP,所以取后12个字符为bv
                const bv = clip.playUrl.substring(clip.playUrl.length - 12);
                const cid = await BiliApi.fetchCid(bv);
                src = await BiliApi.fetchStreamUrl(bv, cid, audio === 'true' ? 80: 120);
            } else {
                src = `https://${clip.playUrl}`;
            }
            console.log(`源视频地址:${src}`);
            this.emitter.emit('cache', clipId, src);
            let cmd = [
                '-threads', 8,
                '-ss', toTime(startTime), 
                '-to', toTime(endTime), 
                '-accurate_seek', 
                '-seekable', 1, 
                '-user_agent', config.segment.userAgent, 
                '-headers', `Referer: ${config.segment.referer}`,
                '-i', src,
                '-c', 'copy',
                '-avoid_negative_ts', 1,
                output,
                '-v', 'debug'
            ];
            if (audio === 'true') {
                cmd = ['-vn', ...cmd];
            }
            try {
                await new Promise((res, rej) => {
                    let p = spawn('ffmpeg', cmd);
                    p.stdout.on('data', (data) => {
                        console.log('stdout: ' + data.toString());
                    });
                    p.stderr.on('data', (data) => {
                        console.log('stderr: ' + data.toString());
                    });
                    p.on('close', (code) => {
                        console.log(`ffmpeg退出:${clip.id}-${clip.title}, code:${code}`);
                        res();
                    });
                    p.on('error', (error) => {
                        console.log(error);
                        rej(error);
                    });
                });
            } catch (ex) {
                console.log(ex);
                throw error.segment.Failed;
            }
        }

        try {
            await stat(output);
        } catch (ex) {
            console.log(ex);
            throw error.segment.Failed;
        }

        await PushApi.push('片段制作完成', `${clip.id},${clip.title}, ${filename}`);
        return {filename};
    }
}