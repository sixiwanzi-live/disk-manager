import {opendir, stat, utimes, unlink} from 'fs/promises';
import exec from 'child_process';
import moment from 'moment';
import error from "../error.js";
import config from '../config.js';
import PushApi from '../api/PushApi.js';

export default class DiskService {

    init = async () => {
        await this.__rebuild();
    }

    visit = async (ctx) => {
        const bv = ctx.params.bv;
        // 检查bv是否合法
        if (!bv || bv.length !== 12) {
            throw error.disk.BvIllegal;
        }
        const filepath = `${config.disk.path}/video/${bv}.mp4`;
        try {
            const info = await stat(filepath);
            const mtime = new moment().toDate();
            await utimes(filepath, info.atime, mtime);
        } catch (ex) {
            console.error(ex);
        }
        return {};
    }

    save = async (ctx) => {
        const bv = ctx.request.body.bv;
        // 检查bv是否合法
        if (!bv || bv.length !== 12) {
            throw error.disk.BvIllegal;
        }
        await this.__download(bv);
        await this.__adjust(bv);
        return {};
    };

    __download = async (bv) => {
        const filepath = `${config.disk.path}/video/${bv}.mp4`;
        const cmd = `BBDown ${bv} -tv -F ${filepath}`;
        console.log(cmd);
        await new Promise((res, rej) => {
            exec.exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    rej(error);
                } else {
                    console.log(stdout);
                    console.log(stderr);
                }                
                res();
            });
        });
        await PushApi.push('视频下载完成', bv);
    }

    __adjust = async () => {
        let lru = await this.__rebuild();
        let total = lru.map(file => file.size).reduce((prev, curr) => prev + curr);
        console.log(`调整前空间大小为${(total / 1024 / 1024 / 1024).toFixed(2)}G`);
        while (total >= config.disk.limit) {
            const file = lru[0];
            total -= file.size;
            lru.shift(); // 删除lru第一项
            await unlink(`${config.disk.path}/video/${file.name}`);
            console.log(`delete ${file.name}`);
            await PushApi.push('磁盘空间调整', 
                                `删除${file.name}(${(file.size / 1024 / 1024 / 1024).toFixed(2)}G), 删除后总空间为${(total / 1024 / 1024 / 1024).toFixed(2)}G`);
        }
        console.log(`调整后空间大小为${(total / 1024 / 1024 / 1024).toFixed(2)}G`);
    }

    __rebuild = async () => {
        let lru = [];
        const dir = await opendir(`${config.disk.path}/video`);
        for await (const dirent of dir) {
            if (dirent.isFile()) {
                const filepath = `${config.disk.path}/video/${dirent.name}`;
                const info = await stat(filepath);
                lru.push({
                    name: dirent.name,
                    size: info.size,
                    datetime: info.mtime
                });
            }
        }
        lru.sort((a, b) => a.datetime - b.datetime);
        return lru;
    }
}