import { unlink } from 'fs/promises';
import {spawn} from 'child_process';
import axios from "axios";
import error from "../error.js";
import config from '../config.js';
import {toTime} from '../util.js';
import PushApi from '../api/PushApi.js';

export default class SegmentService {

    make = async (ctx) => {
        const bv        = ctx.request.query.bv;
        const startTime = ctx.request.query.startTime;
        const endTime   = ctx.request.query.endTime;
        const audio     = ctx.request.query.audio || 'false';
        console.log(`req:${bv}, ${startTime}, ${endTime}, ${audio}`);
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
        } catch (ex) {
            console.log(ex);
        }

        let cid = '';
        try {
            const res = await axios.get(`https://api.bilibili.com/x/web-interface/view?bvid=${bv}`);
            cid = res.data.data.cid;
        } catch (ex) {
            console.log(ex.response.data);
            throw error.segment.CidNotFound;
        }

        let qn = 120;
        if (audio === 'true') {
            // 如果只是为了下载音频，没必要下载高清视频切片
            qn = 64;
        }
        const playurl = `https://api.bilibili.com/x/player/playurl?bvid=${bv}&cid=${cid}&qn=${qn}&fourk=1`;
        console.log(playurl);
        let url = "";
        while (true) {
            try {
                const res = await axios.get(playurl, {
                    headers: {
                        "Cache-Control": "no-cache",
                        "Accept-Encoding": "gzip, deflate, br",
                        "User-Agent": config.segment.userAgent,
                        "Cookie": `SESSDATA=${config.segment.sessdata};`
                    },
                });
                url = res.data.data.durl[0].url;
            } catch (ex) {
                console.log(ex.response.data);
                throw error.segment.StreamNotFound;
            }
            // 如果读取到的流是mcdn开头的，该流下载速度极慢，需要重新读取
            if (url.indexOf('mcdn') === -1) {
                break;
            }
        }
        console.log(url);
        
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
                    '-i', url,
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

        if (audio !== 'true') {
            await PushApi.push('片段制作完成', videoFile);
            return {filename: videoFile};
        }

        // 等待视频切片处理完毕
        // await new Promise((res, rej) => {
        //     setTimeout(res, 1000);
        // });

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
        await PushApi.push('片段制作完成', filename);
        return {filename: audioFile};
    }
}