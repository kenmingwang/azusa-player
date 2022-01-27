/**
 * your code here
 */
chrome.action.onClicked.addListener(function (tab) {
    //console.log('onClicked')
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


export { }; // stops ts error that the file isn't a module
