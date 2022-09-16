import fetch from 'node-fetch';
import error from '../error.js';
import config from '../config.js';

export default class ZimuApi {
    static async findClipById(clipId) {
        try {
            const res = await fetch(`${config.zimu.url}/clips/${clipId}`);
            const data = await res.json();
            console.log(data);
            return data;
        } catch (ex) {
            console.log(ex);
            throw error.zimu.ClipNotFound;
        }
    }
}