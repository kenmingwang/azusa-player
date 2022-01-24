
/**
 * Author: Ken Wang
 * Create: 2020/12/05
 * Description: Background script that handles extension-related liseners
 */

import URLParse from 'url-parse';

// chrome.runtime.onInstalled.addListener(function () {
//     chrome.runtime.openOptionsPage(() => console.log('options page opened'))
// });

chrome.browserAction.onClicked.addListener(function (tab) {
    console.log('onClicked')
    chrome.tabs.create({
        'url': chrome.runtime.getURL("popup.html")
    });
    // chrome.notifications.create('test', {
    //     type: 'basic',
    //     iconUrl: './icon-128.png',
    //     title: 'Test Message',
    //     message: 'You are awesome!',
    //     priority: 2
    // });
});



chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
    const { requestHeaders, initiator } = details;
    const url = new URLParse(details.url, '', true);
    const { query: data } = url;
    console.log('OnBeforeSendHeaders:')
    const Headers = [...requestHeaders];
    console.log(url)
    console.log(Headers)
    if (/^chrome-extension:\/\//.test(initiator)) {
        const refererHeader = Headers.find((e) => e.name.toLowerCase() === 'referer');
        if (refererHeader) {
            if (url.host.includes('qq.com'))
                refererHeader.value = 'https://y.qq.com/';
            else
                refererHeader.value = 'https://www.bilibili.com/';
        } else {
            if (url.host.includes('qq.com'))
                Headers.push({
                    name: 'referer',
                    value: 'https://y.qq.com/',
                });
            else
                Headers.push({
                    name: 'referer',
                    value: 'https://www.bilibili.com/',
                });
        }
        if (data && data.requestFrom === 'bilibili-music' && data.requestType === 'audioFromVideo') {
            Headers.push({
                name: 'Range',
                value: 'bytes=0-',
            });
        }
        return { requestHeaders: Headers };
    } else {
        return { requestHeaders };
    }
}, {
    urls: [
        '*://*.bilivideo.com/*',
        '*://i.y.qq.com/*',
        '*://c.y.qq.com/*',
    ],
}, ['blocking', 'requestHeaders', 'extraHeaders']);


// chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
//     const { requestHeaders, initiator } = details;
//     const url = new URLParse(details.url, '', true);
//     const { query: data } = url;
//     console.log('OnBeforeSendHeaders:')
//     const Headers = [...requestHeaders];
//     console.log(url)
//     console.log(Headers)
//     if (/^chrome-extension:\/\//.test(initiator)) {
//         const refererHeader = Headers.find((e) => e.name.toLowerCase() === 'referer');
//         if (refererHeader) {
//             refererHeader.value = 'https://y.qq.com/';
//         } else {
//             Headers.push({
//                 name: 'referer',
//                 value: 'https://y.qq.com/',
//             });
//         }
//         return { requestHeaders: Headers };
//     } else {
//         return { requestHeaders };
//     }
// }, {
//     urls: [
//         '*://c.y.qq.com/*',
//     ],
// }, ['blocking', 'requestHeaders', 'extraHeaders']);
