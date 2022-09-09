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
            const cmd = `curl 'https://api.bilibili.com/x/player/playurl?bvid=${bv}e&cid=${cid}&qn=${qn}&fourk=1' \
            -H 'authority: api.bilibili.com' \
            -H 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9' \
            -H 'accept-language: zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6' \
            -H 'cache-control: no-cache' \
            -H 'cookie: innersign=0; buvid3=01DCD944-7CFC-4F25-9AFB-D3D528926621148796infoc; rpdid=|(J~RY|llkJ~0J'uYJ|mJuJ|l; LIVE_BUVID=AUTO2616310127501661; fingerprint_s=21d977a5a3d9ab65d7624700f208360c; video_page_version=v_old_home; CURRENT_BLACKGAP=0; blackside_state=0; go_old_video=1; buvid4=175011CD-CAC1-BF35-75A0-E43E71B6862B67680-022012700-nStoKVDpV6SJTAhfmRuZXjyWjxMwPZB+WY8PYvhM2J+cHRSXfqjZmg==; buvid_fp_plain=undefined; nostalgia_conf=-1; hit-dyn-v2=1; fingerprint3=335788865120211dac8f1d2c994129f6; i-wanna-go-back=-1; CURRENT_QUALITY=0; PVID=1; bp_video_offset_1925844=698707092323696600; b_ut=7; b_lsid=82CAC8F4_1831D4E9B05; _uuid=84D10F4D4-B187-7394-98CD-EEC8845AD18B34322infoc; fingerprint=1d8fcfca60bd9a7b14f8d49decd87302; SESSDATA=dfb1e844,1678196071,47be5*91; bili_jct=8ef8e091e13813795537ea907f305b2a; DedeUserID=1925844; DedeUserID__ckMd5=b8b1c112b987fea9; sid=5av8qd4c; innersign=1; CURRENT_FNVAL=4048; buvid_fp=1d8fcfca60bd9a7b14f8d49decd87302' \
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