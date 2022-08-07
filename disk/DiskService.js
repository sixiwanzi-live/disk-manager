import {opendir, stat, unlink} from 'fs/promises';
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

    download = async (bv) => {
        // 检查bv是否合法
        if (!bv || bv.length !== 12) {
            throw error.disk.BvIllegal;
        }

        const filepath = `${config.disk.path}/video/${bv}.mp4`;
        try {
            await stat(filepath);
        } catch (ex) {
            // 下载视频
            try {
                await new Promise((res, rej) => {
                    let p = spawn('BBDown', [bv, '-tv', '-mt', 'false', '--skip-subtitle', '--skip-cover', '-F', filepath]);
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
                
                // 调整硬盘空间
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
            } catch (ex) {
                console.log(ex);
                throw {
                    code: error.disk.DownloadFailed.code,
                    message: ex
                }
            }
        }
        return {};
    };

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