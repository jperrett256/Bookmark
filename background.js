function updateBadge() {
	let promises = [
		browser.storage.local.get('list').then(result => result.list),
		browser.tabs.query({currentWindow: true, active: true}).then(tabs => tabs[0])
	];

	Promise.all(promises).then(function(results) {
		let [list, tab] = results;
		if (list) {
			let count = Object.keys(list).filter(id => {
				let item = JSON.parse(list[id]);
				return item.url == tab.url;
			}).length;

			browser.browserAction.setBadgeText({text: count ? count.toString() : '', tabId: tab.id});
		}
	});

	browser.tabs.onActivated.addListener(updateBadge);
	browser.tabs.onUpdated.addListener(updateBadge);
}

browser.browserAction.setBadgeBackgroundColor({'color': '#323031'});
browser.browserAction.setBadgeTextColor({'color': 'white'});
updateBadge();
