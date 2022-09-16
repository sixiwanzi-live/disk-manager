import fetch from 'node-fetch';
import error from '../error.js';
import config from '../config.js';

export default class ZimuApi {
    static async findClipById(clipId) {
        try {
            const res = await (await fetch(`${config.zimu.url}/clips/${clipId}`)).json();
            console.log(res);
            return res.data;
        } catch (ex) {
            console.log(ex);
            throw error.zimu.ClipNotFound;
        }
    }
}