import axios from 'axios';
import { exec } from 'child_process';
import error from '../error.js';
import config from '../config.js';

export default class BiliApi {
    static async fetchCid(bv) {
        try {
            const res = await axios.get(`http://api.bilibili.com/x/web-interface/view?bvid=${bv}`);
            return res.data.data.cid;
        } catch (ex) {
            console.log(ex.response.data);
            throw error.segment.CidNotFound;
        }
    }

    static async fetchStreamUrl(bv, cid, qn) {
        const res = await new Promise((res, rej) => {
            const cmd = `curl 'https://api.bilibili.com/x/player/playurl?bvid=${bv}&cid=${cid}&qn=${qn}&fourk=1' \
                -H 'authority: api.bilibili.com' \
                -H 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9' \
                -H 'accept-language: zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6' \
                -H 'cache-control: no-cache' \
                -H 'cookie: innersign=0; buvid3=1920EF7B-3FB3-BEA9-FD90-67037CEA438C01952infoc; b_nut=1662693601; i-wanna-go-back=-1; b_lsid=1B13FF8E_1832042E345; _uuid=CD5FAFDA-E1032-6D59-BCEE-31061DC8E101D298025infoc; buvid4=572A6042-A327-97B8-126A-03818229BEAD03207-022090911-aN5fltImCgRefx+S2eNvlYhgto0P5W6gjYegZNabKIK2/4HOIqiOZw%3D%3D; fingerprint=f78113a1c74c8208efdaae54a7a8e2de; buvid_fp_plain=undefined; SESSDATA=b818c56d%2C1678245615%2Cbc4fb%2A91; bili_jct=e858ea051c26be03c91f455b07162456; DedeUserID=95111328; DedeUserID__ckMd5=3ce9e8c3da9ded5d; CURRENT_FNVAL=16; sid=73v8fnh9; b_ut=5; buvid_fp=f78113a1c74c8208efdaae54a7a8e2de' \
                -H 'pragma: no-cache' \
                -H 'sec-ch-ua: "Microsoft Edge";v="105", " Not;A Brand";v="99", "Chromium";v="105"' \
                -H 'sec-ch-ua-mobile: ?0' \
                -H 'sec-ch-ua-platform: "Windows"' \
                -H 'sec-fetch-dest: document' \
                -H 'sec-fetch-mode: navigate' \
                -H 'sec-fetch-site: none' \
                -H 'sec-fetch-user: ?1' \
                -H 'upgrade-insecure-requests: 1' \
                -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.27' \
                --compressed`;
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.log(error);
                    rej(error);
                }
                console.log(stderr);
                console.log(stdout);
                res(JSON.parse(stdout));
            });
        });
        try {
            return res.data.durl[0].url;
        } catch (ex) {
            console.log(ex);
            throw error.segment.StreamNotFound;
        }
        // const playurl = `http://api.bilibili.com/x/player/playurl?bvid=${bv}&cid=${cid}&qn=${qn}&fourk=1`;
        // console.log(playurl);
        // let url = "";
        // while (true) {
        //     try {
        //         const res = await axios.get(playurl, {
        //             headers: {
        //                 "Cache-Control": "no-cache",
        //                 "Accept-Encoding": "gzip, deflate, br",
        //                 "Referer" : "https://player.bilibili.com/",
        //                 "User-Agent": config.segment.userAgent,
        //                 // "Cookie": `SESSDATA=${config.segment.sessdata};`
        //                 "Cookie" : config.segment.cookie
        //             },
        //         });
        //         console.log(res.data);
        //         url = res.data.data.durl[0].url;
        //     } catch (ex) {
        //         console.log(ex.response.data);
        //         throw error.segment.StreamNotFound;
        //     }
        //     // 如果读取到的流是mcdn开头的，该流下载速度极慢，需要重新读取
        //     if (url.indexOf('mcdn') === -1) {
        //         break;
        //     }
        // }
    }
}