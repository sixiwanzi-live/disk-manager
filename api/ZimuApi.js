import axios from 'axios';
import error from '../error.js';
import config from '../config.js';

export default class ZimuApi {
    static async findClipById(clipId) {
        try {
            const res = await axios.get(`${config.zimu.url}/clips/${clipId}`);
            return res.data;
        } catch (ex) {
            console.log(ex);
            throw error.zimu.ClipNotFound;
        }
    }
}