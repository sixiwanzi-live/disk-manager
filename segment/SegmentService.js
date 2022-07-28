import { stat, utimes } from 'fs/promises';
import exec from 'child_process';
import { promisify } from 'util';
import moment from 'moment';
import error from "../error.js";
import config from '../config.js';
import {toTime} from '../util.js';
import PushApi from '../api/PushApi.js';

export default class SegmentService {

    make = async (ctx) => {
        const bv        = ctx.request.query.bv;
        const startTime = ctx.request.query.startTime;
        const endTime   = ctx.request.query.endTime;
        const audio     = ctx.request.query.audio || false;
        console.log(`req:${bv}, ${startTime}, ${endTime}, ${audio}`);
        // 检查bv是否合法
        if (!bv || bv.length !== 12) {
            throw error.disk.BvIllegal;
        }
        if (endTime - startTime > config.segment.maxInterval * 60 * 1000) {
            throw error.segment.IntervalTooLong;
        }
        const resource = `${config.disk.path}/video/${bv}.mp4`;
        // 检查素材视频是否存在， 若不存在则下载该视频
        try {
            await stat(resource);
        } catch (ex) {
            console.log(`素材视频${bv}未找到，即将下载该视频`);
            await ctx.diskService.download(bv);
        }

        try {
            const info = await stat(resource); // 再次检查resource是否存在，如果不存在这次就要报错

            const mtime = new moment().toDate();
            await utimes(resource, info.atime, mtime); // 更新素材的时间，避免被换出
        } catch (ex) {
            console.log(ex);
            throw error.segment.ResourceNotFound;
        }

        let filename = `${bv}-${toTime(startTime).replaceAll(':', '-')}--${toTime(endTime).replaceAll(':', '-')}`;
        filename = audio ? filename + '.aac' : filename + '.mp4'; 
        // const filename = `${bv}-${toTime(startTime).replaceAll(':', '-')}--${toTime(endTime).replaceAll(':', '-')}.mp4`;
        const output = `${config.disk.path}/segment/${filename}`;
        try {
            await stat(output); // 检查output是否存在，避免重复生成
        } catch (ex) {
            // const cmd = `ffmpeg -i "${resource}" -ss ${toTime(startTime)} -to ${toTime(endTime)} -c copy "${output}"`;
            const cmd = audio ? 
                            `ffmpeg -vn -ss ${toTime(startTime)} -to ${toTime(endTime)} -accurate_seek -i "${resource}" -c copy -avoid_negative_ts 1 "${output}"` :
                            `ffmpeg -ss ${toTime(startTime)} -to ${toTime(endTime)} -accurate_seek -i "${resource}" -c copy -avoid_negative_ts 1 "${output}"`;
            // const cmd = `ffmpeg -ss ${toTime(startTime)} -to ${toTime(endTime)} -accurate_seek -i "${resource}" -c copy -avoid_negative_ts 1 "${output}"`;
            console.log(cmd);
            try {
                await new Promise((res, rej) => {
                    let p = exec.exec(cmd);
                    p.on('data', (data) => {
                        console.log(data);
                    });
                    p.on('exit', (code) => {
                        console.log(`切片程序退出:${filename}, code:${code}`);
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
                    code: error.segment.Failed.code,
                    message: ex
                };
            }
            await PushApi.push('片段制作完成', filename);
        }
        return {filename};
    }
}