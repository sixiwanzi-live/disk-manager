import axios from 'axios';
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
        const playurl = `http://api.bilibili.com/x/player/playurl?bvid=${bv}&cid=${cid}&qn=${qn}&fourk=1`;
        console.log(playurl);
        let url = "";
        while (true) {
            try {
                const res = await axios.get(playurl, {
                    headers: {
                        "Cache-Control": "no-cache",
                        "Accept-Encoding": "gzip, deflate, br",
                        "User-Agent": config.segment.userAgent,
                        //"Cookie": `SESSDATA=${config.segment.sessdata};`
                        "Cookie" : config.segment.cookie
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
        return url;
    }
}