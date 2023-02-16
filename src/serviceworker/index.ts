
chrome.action.onClicked.addListener(function (tab) {
    //console.log('onClicked')
    chrome.tabs.create({
        'url': chrome.runtime.getURL("popup.html")
    });
});

const MY_FAV_LIST_KEY = 'MyFavList';

// Retrieve the list of favorite items from local storage.
chrome.storage.local.get(MY_FAV_LIST_KEY, (result) => {
  // If the list is not found in local storage, default to an empty array.
  const my_fav_lists_keys: string[] = result[MY_FAV_LIST_KEY] || [];

  // Retrieve the list of favorite items from local storage.
  chrome.storage.local.get(my_fav_lists_keys, (list_obj) => {
    // Extract the list of favorite items from the object returned by chrome.storage.local.get().
    const fav_lists = Object.values(list_obj);
    // fav_lists are sorted according to the order of keys in list associated with `MY_FAV_LIST_KEY`
    create_menu_items(
      my_fav_lists_keys.map((id) => fav_lists.find((v) => v.info.id == id).info),
    );
  });
});

chrome.runtime.onMessage.addListener(
  function(fav_lists_info) {
    create_menu_items(fav_lists_info);
  }
);

function create_menu_items(fav_lists_info: any[]) {
  const menu_id = 'AddToPlayList';

  chrome.contextMenus.removeAll();
  // Create the parent context menu item.
  chrome.contextMenus.create({
    id: menu_id,
    title: '添加到歌单',
    contexts: ['link'],
    targetUrlPatterns: ['https://*.bilibili.com/video/BV*'],
  });

  // If there are favorite items in the list, create a child context menu item for each one.
  if (fav_lists_info.length > 0) {
    fav_lists_info.forEach((info) => {
      chrome.contextMenus.create({
        id: info.id,
        parentId: menu_id,
        title: info.title,
        contexts: ['link'],
      });
    });
    // Add a click event listener for the child context menu items.
    update_menu_item_listener(fav_lists_info);
  } else {
    // If there are no favorite items in the list, create a disabled child context menu item
    // with a message prompting the user to create a new list.
    chrome.contextMenus.create({
      parentId: menu_id,
      title: '请先创建一个歌单',
      enabled: false,
      contexts: ['link'],
    });
  }
}

let add_to_fav_list = (_: chrome.contextMenus.OnClickData) => {};

function update_menu_item_listener(fav_lists_info: any[]) {
  chrome.contextMenus.onClicked.removeListener(add_to_fav_list);
  add_to_fav_list = (info) => {
    // If the clicked menu item ID matches one of the favorite items,
    // log the item's ID and URL to the console.
    if (fav_lists_info.find((v) => v.id === info.menuItemId)) {
      const regexp = /BV[a-zA-Z\d]{10}(?=\?|\/)/;
      if (info.linkUrl && regexp.test(info.linkUrl)) {
        const BV_NUM = regexp.exec(info.linkUrl)?.[0];

        console.log(BV_NUM); // TODO: Add to play list
      }
    }
  };
  chrome.contextMenus.onClicked.addListener(add_to_fav_list);
}

export { }; // stops ts error that the file isn't a module
