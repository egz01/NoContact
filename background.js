chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    "id": "messageContextMenu",
    "title": "Message on Whatsapp",
    "contexts": ["selection"]
  });
  chrome.storage.sync.set({
    useApp: false,
    firstMessage: ""
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (tab) {
    if (info.menuItemId === "messageContextMenu") {
      runWhatsapp(tab, info.selectionText);
    }
  }
});

chrome.omnibox.onInputEntered.addListener(async (text, disp) => {
  var [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (tab){
    runWhatsapp(tab, text);
  }
});

async function runWhatsapp(tab, text) {
  var number = parseNumber(text);
  if (number) {
    var data = await chrome.storage.sync.get(["useApp", "firstMessage"]);
    var useApp = data.useApp;
    var firstMessage = data.firstMessage;

    if (!useApp) {
      url = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(firstMessage)}&app_absent=0`;
      await switchOrCreateWhatsAppTab(url, tab.index);
    }
    else {
      url = `https://wa.me/${number}?text=${encodeURIComponent(firstMessage)}&app_absent=0`
      await chrome.tabs.create({
        active: true,
        url: url,
        index: tab.index + 1
      }, 
      function () {
        chrome.tabs.onUpdated.addListener(function (tabId, info) {
          if (info.status == 'complete') {
            chrome.tabs.remove(tabId);
            chrome.tabs.onUpdated.removeListener(arguments.callee);
          }
        })
      });
    }
  } else {
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        alert("Couldn't find a valid whatsapp-number in selected text.");
      }
    });
  }
}

function parseNumber(text) {
  number = text.match(/\+?\d+[-\s]?\d+[-\s]?\d+[-\s]?\d+/); // this should identify most numbers, however it could also pick up garbage...
  if (number) number = String(number).replace(/[\+-\s]/g, '');
  return number;
}

async function switchOrCreateWhatsAppTab(url, activeTabIndex) {
    chrome.tabs.query({url: ["*://web.whatsapp.com//*"]}).then(async (tabs) => {
      var index = 0;
      if (!tabs.length) {
        var waTab = await chrome.tabs.create({
          active: true,
          url: url,
          index: activeTabIndex + 1
        });
        index = waTab.index;
      }
      else { // a whatsapp tab already exists
        index = tabs[0].index;
      }

      return chrome.tabs.highlight({'tabs': index});
    }).then(tab => {
      if (!tab) return;
      chrome.tabs.update(tab.tabId, {"url": url});
    });
}
