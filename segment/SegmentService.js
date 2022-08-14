import { stat, unlink } from 'fs/promises';
import {spawn} from 'child_process';
import error from "../error.js";
import config from '../config.js';
import {toTime} from '../util.js';
import BiliApi from '../api/BiliApi.js';
import PushApi from '../api/PushApi.js';

export default class SegmentService {

    make = async (ctx) => {
        const bv        = ctx.request.query.bv;
        const startTime = ctx.request.query.startTime;
        const endTime   = ctx.request.query.endTime;
        const audio     = ctx.request.query.audio || 'false';
        const qn        = parseInt(ctx.request.query.qn || '120');
        console.log(`req:${bv}, ${startTime}, ${endTime}, ${audio}, ${qn}`);
        // 检查bv是否合法
        if (!bv || bv.length !== 12) {
            throw error.disk.BvIllegal;
        }
        if (endTime - startTime > config.segment.maxInterval * 60 * 1000) {
            throw error.segment.IntervalTooLong;
        }

        const filename = `${bv}-${toTime(startTime).replaceAll(':', '-')}--${toTime(endTime).replaceAll(':', '-')}`;
        const videoFile = `${filename}.mp4`;
        const videoOutput = `${config.disk.path}/segment/${videoFile}`;
        const audioFile = `${filename}.aac`;
        const audioOutput = `${config.disk.path}/segment/${audioFile}`;
        // 删除可能存在的切片
        try {
            await unlink(videoOutput);
            await unlink(audioOutput);
        } catch (ex) {}

        const cid = await BiliApi.fetchCid(bv);
        const streamUrl = await BiliApi.fetchStreamUrl(bv, cid, audio === 'true' ? 80: qn);
        console.log(streamUrl);
        
        try {
            await new Promise((res, rej) => {
                let p = spawn('ffmpeg', 
                [
                    '-ss', toTime(startTime), 
                    '-to', toTime(endTime), 
                    '-accurate_seek', 
                    '-seekable', 1, 
                    '-user_agent', config.segment.userAgent, 
                    '-headers', `Referer: ${config.segment.referer}`,
                    '-i', streamUrl,
                    '-c', 'copy',
                    '-avoid_negative_ts', 1,
                    videoOutput,
                    '-v', 'debug'
                ]);
                p.stdout.on('data', (data) => {
                    console.log('stdout: ' + data.toString());
                });
                p.stderr.on('data', (data) => {
                    console.log('stderr: ' + data.toString());
                });
                p.on('close', (code) => {
                    console.log(`ffmpeg退出:${bv}, code:${code}`);
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
            await stat(videoOutput);
        } catch (ex) {
            console.log(ex);
            throw error.segment.Failed;
        }

        if (audio !== 'true') {
            await PushApi.push('片段制作完成', videoFile);
            return {filename: videoFile};
        }

        try {
            await new Promise((res, rej) => {
                let p = spawn('ffmpeg', 
                [
                    '-vn',
                    '-i', videoOutput,
                    '-c', 'copy',
                    audioOutput,
                    '-v', 'debug'
                ]);
                p.stdout.on('data', (data) => {
                    console.log('stdout: ' + data.toString());
                });
                p.stderr.on('data', (data) => {
                    console.log('stderr: ' + data.toString());
                });
                p.on('close', (code) => {
                    console.log(`提取音频程序退出:${bv}, code:${code}`);
                    res();
                });
                p.on('error', (error) => {
                    console.log(error);
                    rej(error);
                });
            });
        } catch (ex) {
            console.log(ex);
            throw error.segment.ExtractAudioFailed;
        }
        try {
            await stat(audioOutput);
        } catch (ex) {
            console.log(ex);
            throw error.segment.ExtractAudioFailed;
        }
        await PushApi.push('片段制作完成', filename);
        return {filename: audioFile};
    }
}