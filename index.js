import {opendir, stat} from 'fs/promises';
import config from './config.js';

(async () => {
    let totalSize = 0;
    const dir = await opendir(config.disk.path);
    for await (const dirent of dir) {
        if (dirent.isFile()) {
            const filepath = `${config.disk.path}/${dirent.name}`;
            const info = await stat(filepath);
            totalSize += info.size;
        }
    }
    console.log(totalSize);
})();