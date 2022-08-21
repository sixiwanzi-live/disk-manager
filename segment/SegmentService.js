import { stat, unlink } from 'fs/promises';
import {spawn} from 'child_process';
import error from "../error.js";
import config from '../config.js';
import {toTime} from '../util.js';
import BiliApi from '../api/BiliApi.js';
import PushApi from '../api/PushApi.js';
import ZimuApi from '../api/ZimuApi.js';

export default class SegmentService {

    make = async (ctx) => {
        const clipId    = ctx.params.clipId;
        const startTime = ctx.request.query.startTime;
        const endTime   = ctx.request.query.endTime;
        const audio     = ctx.request.query.audio || 'false';
        console.log(`req:${clipId}, ${startTime}, ${endTime}, ${audio}`);
        // 获取clip基础信息
        const clip = await ZimuApi.findClipById(clipId);
        console.log(clip);
        
        if (endTime - startTime <= 1000) {
            throw error.segment.IntervalTooShort;
        }
        if (endTime - startTime > config.segment.maxInterval * 60 * 1000) {
            throw error.segment.IntervalTooLong;
        }

        let filename = `[clip-${clip.id}]-${toTime(startTime).replaceAll(':', '-')}--${toTime(endTime).replaceAll(':', '-')}`;
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

        let src = '';
        if (clip.type === 1) {
            // 获取B站视频源
            // playUrl的格式为player.bilibili.com/player.html?bvid=BV1Mg411C7FP,所以取后12个字符为bv
            const bv = clip.playUrl.substring(clip.playUrl.length - 12);
            console.log(bv);
            const cid = await BiliApi.fetchCid(bv);
            src = await BiliApi.fetchStreamUrl(bv, cid, audio === 'true' ? 80: 120);
        } else {
            src = `https://${clip.playUrl}`;
        }
        console.log(`源视频地址:${src}`);

        let cmd = [
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