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

    static async findAuthorById(authorId) {
        const url = `${config.zimu.url}/authors/${authorId}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.error(await res.text());
            return null;
        } else {
            return await res.json();
        }
    }
}