function updateBadge(tab) {
	chrome.storage.local.get('list').then(result => result.list).then(function(list) {
		if (list) {
			let count = Object.keys(list).filter(id => {
				let item = JSON.parse(list[id]);
				return item.url == tab.url;
			}).length;

			chrome.action.setBadgeText({text: count ? count.toString() : '', tabId: tab.id});
		}
	});
}

chrome.action.setBadgeBackgroundColor({'color': '#323031'});
chrome.action.setBadgeTextColor({'color': 'white'});

chrome.tabs.onActivated.addListener(updateBadge);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => updateBadge(tab));
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => updateBadge(message.tab))
