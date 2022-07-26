import fetch from 'node-fetch';
import error from '../error.js';
import config from '../config.js';

export default class PushApi {
    static async push(title, content) {
        const url = `https://api2.pushdeer.com/message/push?pushkey=${config.push.key}&text=${title}&desp=${content}`;
        const res = await fetch(encodeURI(url));
        const data = await res.json();
        if (data.code !== 0) {
            throw {
                code: error.push.Failed.code,
                message: data.message
            }
        }
    }
}