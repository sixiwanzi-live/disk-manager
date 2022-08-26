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
        this.srcMap = new Map();
    }

    make = async (ctx) => {
        const clipId    = parseInt(ctx.params.clipId);
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

        // 获取视频源地址并生成ffmpeg参数，B站视频需要先查缓存，如果缓存没有，需要请求B站获取
        // 非B站视频直接使用playUrl
        let src = '';
        let cmd = [];
        if (clip.type === 1) {
            if (this.srcMap.has(clipId)) {
                src = this.srcMap.get(clipId);
                console.log(`clip(${clipId})命中缓存`);
            } else {
                console.log(`clip(${clipId})未命中缓存`);
            }
            cmd = [
                '-ss', toTime(startTime), 
                '-to', toTime(endTime), 
                '-accurate_seek', 
                '-seekable', 1, 
                '-user_agent', config.segment.userAgent, 
                '-headers', `Referer: ${config.segment.referer}`,
                '-i', src,
                '-c', 'copy',
                '-avoid_negative_ts', 1,
                output
            ];
            // 仅下载音频需要添加额外的命令行参数
            if (audio === 'true') {
                cmd = ['-vn', ...cmd];
            }
        } else {
            src = `https://${clip.playUrl}`;
            cmd = [
                '-ss', toTime(startTime), 
                '-to', toTime(endTime), 
                '-accurate_seek', 
                '-seekable', 1, 
                '-i', src,
                '-c', 'copy',
                '-avoid_negative_ts', 1,
                output
            ];
        }
        // 仅下载音频需要添加额外的命令行参数
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
            await stat(output);
        } catch (ex) {
            console.log(ex);
            if (clip.type === 1) {
                console.log(`clip(${clipId})缓存可能失效，需重新获取`);
                // 在下载切片失败的情况下，如果是从B站下载失败的，说明视频源有问题，需要重新申请视频源
                if (this.srcMap.has(clipId)) {
                    this.srcMap.delete(clipId);
                }
                // 重新获取bv和cid
                const bv = clip.playUrl.substring(clip.playUrl.length - 12);
                const cid = await BiliApi.fetchCid(bv);
                try {
                    // 重新获取视频流
                    const qn = 120;
                    src = await BiliApi.fetchStreamUrl(bv, cid, qn);
                    // 将获取到的新src保存起来
                    this.srcMap.set(clipId, src);
                } catch (ex) {
                    console.log(ex.response.data);
                    throw error.segment.StreamNotFound;
                }
                // 重新生成ffmepg命令行参数
                cmd = [
                    '-ss', toTime(startTime), 
                    '-to', toTime(endTime), 
                    '-accurate_seek', 
                    '-seekable', 1, 
                    '-user_agent', config.segment.userAgent, 
                    '-headers', `Referer: ${config.segment.referer}`,
                    '-i', src,
                    '-c', 'copy',
                    '-avoid_negative_ts', 1,
                    output
                ];
                // 仅下载音频需要添加额外的命令行参数
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
            } else {
                // 在下载切片失败的情况下，如果是从录播站下载失败的，则直接报错。
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