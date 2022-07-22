import axios from 'axios';
import error from '../error.js';
import config from '../config.js';

export default class PushApi {
    static async push(title, content) {
        const url = `https://api2.pushdeer.com/message/push?pushkey=${config.push.key}&text=${title}&desp=${content}`;
        const res = await axios.get(encodeURI(url));
        console.log(res.data);
        if (res.data.code !== 0) {
            throw {
                code: error.push.Failed.code,
                message: res.data.message
            }
        }
    }
}