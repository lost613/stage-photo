'use strict';

const path = require('path');
const fs = require('fs');
const cp = require('child_process');

const [ffmpeg, directory] = [process.argv[2], process.argv[3]];

const exts = [
    '.avi',
    '.mp4',
    '.mkv',
    '.wmv',
];

const date2minutes = (date) => {
    const durations = date.split(':');
    const minutes = Number(durations[0]) * 60 + Number(durations[1]);
    return minutes;
}

const minutes2date = (minutes) => {
    const date = [];
    const number = 10; // minutes <= 30 ? 5 : 10;
    const time = parseInt(minutes / number);
    for (let i = 1; i <= number; i++) {
        let minute = time * i;
        if (minute < 60) {
            date.push(`00:${minute.toString().padStart(2, '0')}:00`);
        } else {
            let hour = parseInt(minute / 60);
            let m = minute - hour * 60;
            date.push(`${hour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`);
        }
    }
    return date;
}

const duration = (dir, name) => {
    return new Promise((resolve, reject) => {
        cp.exec(`${ffmpeg} -i "${path.join(dir, name)}"`, (error, stdout, stderr) => {
            if (error) {
                const key = 'Duration:';
                let index;
                let str = error.message;
                index = str.indexOf(key);
                str = str.substring(index + key.length + 1, str.length);
                index = str.indexOf('\n');
                str = str.substring(0, index);
                const date = str.split(',')[0];
                resolve(date2minutes(date));
            } else {
                reject(0);
            }
        });
    });
}

const exec = (dir, name, time, index) => {
    return new Promise((resolve, reject) => {
        cp.exec(`${ffmpeg} -ss ${time} -i "${path.join(dir, name)}" -y -q:v 2 -f image2 -t 0.001 "${path.join(dir, `${path.basename(name, path.extname(name))}_${index}.jpg`)}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
};

const execAll = async (dir, name) => {
    const minutes = await duration(dir, name);
    const times = minutes2date(minutes);
    for (let i = 0; i < times.length; i++) {
        await exec(dir, name, times[i], (i + 1).toString().padStart(2, '0'));
    }
};

const thumbs = async dir => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        if (file.isDirectory()) {
            await thumbs(path.join(dir, file.name));
        } else {
            if (exts.includes(path.extname(file.name))) {
                await execAll(dir, file.name);
                console.log('[Done] %s', path.join(dir, file.name));
            }
        }
    }
};

const folders = async dir => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        if (file.isFile()) {
            const ext = path.extname(file.name);
            if (exts.includes(ext)) {
                const name = path.basename(file.name, ext);
                const newDir = path.join(dir, name);
                fs.mkdirSync(newDir);
                fs.renameSync(path.join(dir, file.name), path.join(newDir, file.name));
                console.log('[Done] %s', path.join(newDir, file.name));
            }
        }
    }
};

(async () => {
    const start = Date.now();
    try {
        // await folders(directory);
        await thumbs(directory);
    } catch (error) {
        console.log(error);
    }
    console.log('All cost: %ss', (Date.now() - start) / 1000);
})();
