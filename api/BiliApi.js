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
            const playurl = `https://api.bilibili.com/x/player/playurl?bvid=${bv}e&cid=${cid}&qn=${qn}&fourk=1`;
            console.log(playurl);
            const cmd = `curl '${playurl}' \
                -H 'authority: api.bilibili.com' \
                -H 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9' \
                -H 'accept-language: zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6' \
                -H 'cache-control: no-cache' \
                -H 'cookie: ${config.segment.cookie}' \
                -H 'pragma: no-cache' \
                -H 'sec-ch-ua: "Microsoft Edge";v="105", " Not;A Brand";v="99", "Chromium";v="105"' \
                -H 'sec-ch-ua-mobile: ?0' \
                -H 'sec-ch-ua-platform: "Windows"' \
                -H 'sec-fetch-dest: document' \
                -H 'sec-fetch-mode: navigate' \
                -H 'sec-fetch-site: none' \
                -H 'sec-fetch-user: ?1' \
                -H 'upgrade-insecure-requests: 1' \
                -H 'user-agent: ${config.segment.userAgent}' \
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
            return res.data.data.durl[0].url;
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