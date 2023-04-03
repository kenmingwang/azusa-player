import { extractSongName } from './Data';

const extractParenthesis = (filename) => {
    let extracted = /(.+)[（\(].+/.exec(filename); 
    if (extracted) {
        return extracted[1];
    } else {
        return filename;
    }
}

const extractWith = (filename, reExpressions = []) => {
    for (let i=0, n=reExpressions.length; i<n; i++) {
        let extracted = reExpressions[i].exec(filename);
        if (extracted !== null) {
            return extracted[1];
        }
    }
    return filename;
}

export const reExtractSongName = (filename, uploader = '') => {
    let extracted = null;
    switch (String(uploader)) {
        case "胡桃小王":
        case "王胡桃w":
            // https://space.bilibili.com/5053504/channel/series
            // always {number}_{songname} by {artist}  
            // 27_星の在り処 Full Ver. (Less Vocal) [BONUS TRACK] by Falcom Sound Team jdk
            // occasionally theres a parenthesis; always take whats before left parenthesis
            // im sure theres a one statement way to do this re....
            // else i do [歌切][诺莺Nox] Renegade 20221119
                filename = extractWith(
                    extractParenthesis(extractParenthesis(filename)), 
                    [
                        /\d*_(.+) \(?.*by .+/, 
                        /\d*_(.+)/,
                        /\[.+\]\[.+\] (.+) \d+/,
                    ]);
                break;
        case "冥侦探柯鎮悪":
        case "冥侦探柯镇恶":
            // https://space.bilibili.com/94558176/channel/series
            // seesm to be always 【{vtuber}】《{song} （his comments）》
            // eg 【ninnikuu泥泥裤】《alice（现场LIVE纯享版~古川本辅，日）》
            filename = extractParenthesis(extractWith(
                filename, 
                [
                    /【.+】《(.+)》/,
                    /【.+】(.+)/
                ]));
            console.debug(filename); 
            break;
        case "哆啦A0":
        case "钢铁慈父晚大林":
        case "-哆啦A林-":
            // https://space.bilibili.com/33576761/channel/series
            // always 【HeraKris】【stream title】{songname}
            //【赫拉Kris】【随便唱唱】三国恋
            // in some videos, its number-song-name
            filename = extractParenthesis(
                extractWith(filename, 
                    [
                        /【赫拉Kris】【.+】(.+)/, 
                        /【赫拉Kris.*】(.+)/, 
                        /\d+-(.+)-.+/
                    ]));
            break;
        case "叹氣喵":
            // https://space.bilibili.com/170066/channel/series
            break;
            // 不安喵wrng变得太多
        case "起名字什么的真困难啊":
            // https://space.bilibili.com/355371630
            // always number.{songname}
            //11.一番の宝物
            filename = extractParenthesis(filename);
            extracted = /\d+\.(.+)/.exec(filename);
            break;
        case "蝉时雨☆":
            // https://space.bilibili.com/3421497/channel/series
            // always 【vtuber】{songname}
            //【clessS×汐尔Sier】玫瑰少年
            filename = extractWith(
                extractParenthesis(extractParenthesis(filename)), 
                [
                    /【.+】(.+)/, 
                ]);
            break;
        case "HonmaMeiko":
            // https://space.bilibili.com/590096
            // always number {songname}
            // 11 一番の宝物
            filename = extractParenthesis(filename);
            extracted = /\d+ (.+)/.exec(filename);
            break;
        case "海鲜DD":
            // https://space.bilibili.com/1912892773/channel/series
            // sometimes date_in_numbers{songname}; others in brackets
            // 11一番の宝物
            // 1202王菲-如愿 
            filename = extractParenthesis(extractWith(
                filename, 
                [
                    /.+《(.+)》.+/, 
                    /\d+.+-(.+)/, 
                    /\d+(.+)/, 
                ]));
            break;
        case "夜の_":
            // https://space.bilibili.com/7405415/channel/series
            // sometimes {date_in_numbers} {songname}; someimtes {index}.{somename}
            // else song name is always in brackets.
            // 9.普通朋友
            // 【03.17】只对你有感觉（半首）
            filename = extractWith(
                extractParenthesis(filename), 
                [
                    /【.+】(.+)/, 
                    /\d+\.\d+ (.+)/, 
                    /\d+\.(.+) - .+/,
                    /\d+\.(.+)/,
                ]);
            break;
        case "随心":
            // https://space.bilibili.com/63326/channel/seriesdetail?sid=2701519
            // in specialized brackets.
            // 『露米Lumi_Official』『月牙湾』
            filename = extractParenthesis(filename);
            extracted = /.*『(.+)』.*/.exec(filename);
            break;
        case "litmus石蕊":
            // https://space.bilibili.com/159910988/channel/collectiondetail?sid=766244
            // 凉凉【露米Lumi】
            filename = extractWith(
                extractParenthesis(filename), 
                [
                    /(.+)【.+】/, 
                ]);
            break;
        case "焱缪-猫猫兔":
            // https://space.bilibili.com/287837/channel/series
            // in specialized brackets.
            // 【折原露露 · 翻唱】乌兰巴托的夜（10.18-歌切）
            filename = extractWith(
                extractParenthesis(filename), 
                [
                    /【.+】(.+)/, 
                ]);
            break;
        case "HACHI蜂蜜酿造厂":
            /*
            https://space.bilibili.com/9979698/channel/series
            naming template switches from time to time. below is my parsing rules in python
                if '】' in fn:
                    mutagen_loaded['title'] = fn[fn.find('】') + 1:fn.rfind(' ')]
                elif '.' in os.path.splitext(fn)[0]:
                    mutagen_loaded['title'] = fn[fn.find('.') + 1:fn.rfind(' ')]
                elif '第' in fn and '首' in fn:
                    mutagen_loaded['title'] = fn[fn.find('首') + 1:fn.rfind(' ')]
                else:
                    mutagen_loaded['title'] = fn[fn.find(' ') + 1:fn.rfind(' ')]
            annnnnd this person doesnt have a video list...
            */
           if (filename.includes('】')) {
            extracted = /【.+】(.+)/.exec(filename);
           } else if (filename.includes('.')) {
            extracted = /\d+\.(.+)/.exec(filename);
           } else if (filename.includes('第') && filename.includes('首')) {
            extracted = /.*第.+首(.+)/.exec(filename);
           }
            break;
        case "天马的冰淇淋小推车":
            // https://www.bilibili.com/video/BV12d4y117TU/
            // seems like {MM.DD}{songname}
            filename = extractParenthesis(filename);
            extracted = /\d+\.\d+(.+)/.exec(filename);
            break;
        case "黑修":
            // https://space.bilibili.com/8136522/channel/seriesdetail?sid=2161219
            // either in brackets or not (???)
            filename = extractParenthesis(filename);
            if (filename.startsWith('【Pomelo安妮】')) {
                filename = filename.substring('【Pomelo安妮】'.length);
            }
            break;
        case "食梦莲lotus":
            //【安妮Pomelo】1118恋爱循环
            // 阿楚姑娘0726
            filename = extractWith(
                extractParenthesis(filename), 
                [
                    /【.+】\d+(.+)/, 
                    /(\D+)\d+/, 
                ]);
            break;
        case "真心之梦":
            // https://space.bilibili.com/344906417/channel/seriesdetail?sid=2463652
            // 【咲间妮娜】射手座午后九时don't be late
            filename = extractWith(
                extractParenthesis(filename), 
                [
                    /【.+】(.+)/, 
                ]);
            break;
        case "姓单名推的DD桑":
        case "铵溶液制造工厂":
        case "神圣的楼兰我":
        case "狐心妖面-Huxin":
        case "5424单推人":
            // https://space.bilibili.com/7191181/channel/collectiondetail?sid=821187
            filename = extractWith(
                extractParenthesis(filename), 
                [
                    /【.+】(.+)/, 
                ]);
            break;
        case "黑泽诺亚的五元店":
            // https://space.bilibili.com/1190296645/video
            // 【黑泽诺亚】【歌切】Hold On
            // 【黑泽诺亚】【歌切】《Starfall》
            // 【黑泽诺亚NOIR】i love you - 碧梨
            filename = extractWith(
                extractParenthesis(filename), 
                [
                    /【黑泽诺亚NOIR】(.+) - (.+)/,
                    /【黑泽诺亚】【歌切】(.+)/,
                    /【黑泽诺亚】【.+】(.+)/,
                ]);
            break;
        case "我是你的电吉他":
            // https://space.bilibili.com/284940670/video
            filename = extractWith(
                extractParenthesis(filename), 
                [
                    /【.+】(.+)-.+/,
                ]);
            break;	
        case "瑞娅今天早睡了吗":
            // https://space.bilibili.com/1035062789/channel/seriesdetail?sid=576862
            filename = extractWith(
                extractParenthesis(filename), 
                [
                    /(.+) - .+/,
                    /(.+) w\/ .+/,
                    /【.+】\d+\.\d+ (.+)/,
                    /【.+】(.+)/,
                ]);
            break;
        case "棉花mennka":
            // https://space.bilibili.com/2509376/channel/series
            filename = extractWith(
                extractParenthesis(filename), 
                [
                    /.+ - (.+) \d+\.\d+/,
                    /.+ - (.+)/,
                ]);
            break;
        case "":
            filename = extractWith(
                extractParenthesis(filename), 
                [

                ]);
            break;
    }
    if (extracted !== null) return extracted[1];
    // console.debug('resorting to default songname extract', filename, uploader);
    // if fails, first try to extract in brackets; else return as is.
    return extractSongName(filename);
}


export const getName = (song, parsed = false) => {
    if (parsed) {
        return song.parsedName? song.parsedName : song.name
    } else {
        return song.name
    }
}

export const parseSongName = (song) => {
    song.parsedName = reExtractSongName(song.name, song.singer)
}