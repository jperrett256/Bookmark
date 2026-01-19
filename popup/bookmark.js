const bookmark = (function() {

	let background = browser.runtime.getBackgroundPage().catch(console.error.bind(console));

	const getBookmarks = () => browser.storage.local.get('list').then(result => result.list || {});
	const getActiveTab = () => browser.tabs.query({currentWindow: true, active: true}).then(tabs => tabs[0]);

	// Collects and stores information about the active tab in a new bookmark
	function addBookmark() {
		let promises = [
			browser.tabs.executeScript({ code: 'window.pageYOffset' }).then(result => result[0]),
			getBookmarks(),
			getActiveTab()
		];

		return Promise.all(promises).then(function(results) {
			let [position, list, tab] = results;
			let id = Date.now();
			let newItem = {
				title: tab.title,
				url: tab.url,
				position: position
			};
			list[id] = JSON.stringify(newItem);

			return browser.storage.local.set({ list: list }).then(function() {
				return background.then(page => page.updateBadge());
			}).then(() => [id, newItem]);
		}); //.catch(console.error.bind(console));
	}

	function applyBookmark(item) {
		getActiveTab().then(tab => {
			let executeScroll = () => browser.tabs.executeScript({
				code: `window.scroll({top: ${item.position}, behavior: 'smooth'})`
			});

			if (item.url === tab.url) return executeScroll();

			/* If item url is not the url of the active tab, should open items in new tab */
			return browser.tabs.create({ url: item.url }).then(executeScroll);
		}).catch(console.error.bind(console));
	}

	function removeBookmark(id) {
		return getBookmarks().then(list => {
			delete list[id];
			return browser.storage.local.set({ list: list });
		}).then(() => {
			return background.then(page => page.updateBadge());
		}); //.catch(console.error.bind(console));
	}

	function updateBookmark(id, item) {
		return getBookmarks().then(list => {
			if (!list[id]) throw new Error(`Invalid id: ${id}.`);

			list[id] = JSON.stringify(item);
			return browser.storage.local.set({ list: list });
		}); /* .then(function() {
			// Stop editing
			stopEditing(event);
		}).catch(console.error.bind(console)); */
	}

	const getFolderList = () => browser.storage.local.get('folders').then(result => result.folders || []);

	function addFolder(name) {
		getFolderList().then(folders => {
			if (name && !folders.includes(name)) {
				folders.push(name);
				// TODO should the folders item in storage be a dictionary of arrays associating folders with items?
				browser.storage.local.set({ folders: folders });
			}
		});
		// TODO return updated list of folders?
	}

	// TODO removeFolder?

	return {
		getBookmarks,
		addBookmark,
		applyBookmark,
		getFolderList,
		addFolder
	};

})();

// TODO what to do with this?
/* Handle tab change and url change */
// browser.tabs.onActivated.addListener(updateList);
// browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
// 	if (changeInfo.status == 'complete') {
// 		updateList();
// 	}
// });

class Bookmark {
	constructor(id, name, url) {
		this.id = id;

		this.name = name;
		this.url = url;
	}

	match(searchString) {
		return this.name.includes(searchString) || this.url.includes(searchString);
	}
}
