$(function() {

	function getLocal(keys) {
		return new Promise(function(resolve, reject) {
			chrome.storage.local.get(keys, resolve);
		});
	}

	function setLocal(keys) {
		return new Promise(function(resolve, reject) {
			chrome.storage.local.set(keys, resolve);
		});
	}

	function getActiveTab() {
		return (new Promise(function(resolve, reject) {
			chrome.tabs.query({currentWindow: true, active: true}, resolve);
		})).then(tabs => tabs[0]);
	}

	function executeScript(details) {
		return new Promise(function(resolve, reject) {
			chrome.tabs.executeScript(details, resolve);
		});
	}

	function createNewTab(url) {
		return new Promise(function(resolve, reject) {
			chrome.tabs.create({ url: url }, resolve);
		});
	}

	let $list = $('.bookmark-list');

	/* Construct initial list */
	createList();

	/* Function for creating list */
	function createList() {
		let promises = [
			getLocal('list').then(result => result.list),
			getActiveTab()
		];

		Promise.all(promises).then(function(results) {
			let [list, tab] = results;
			console.log(list);
			if (list) {
				Object.keys(list).forEach(function(id) {
					let item = JSON.parse(list[id]);
					/* If the filter is on, need to check if the item url matches the tab url */
					if (item.url === tab.url || !$('.filter-btn').hasClass('active')) addListItem(id, item);
				});
			}
		}).catch(console.error.bind(console));
	}

	/* Handle toggling filtering (show all or show those for active tab) */
	$('.filter-btn').click(function() {
		$(this).toggleClass('active');
		$('.bookmark-item').remove();
		createList();
	});

	/* Handle adding items to list */
	$('.add-btn').click(function() {
		let promises = [
			executeScript({ code: 'window.pageYOffset' }).then(result => result[0]),
			getLocal('list').then(result => result && result.list || {}),
			getActiveTab()
		];

		Promise.all(promises).then(function(results) {
			let [position, list, tab] = results;
			let id = Date.now();
			let newItem = {
				title: tab.title,
				url: tab.url,
				position: position
			};
			list[id] = JSON.stringify(newItem);

			return setLocal({ list: list }).then(function() {
				addListItem(id, newItem);
			});
		}).catch(console.error.bind(console));
	});

	/* Function for adding items to display */
	function addListItem(id, item) {
		let $new = $(
			`<li id="${id}" class="bookmark-item">` +
				`<a href="${item.url}" class="details" ondragstart="return false">` +
					`<div class="title">${item.title}</div>` +
					`<div class="url">${item.url}</div>` +
				'</a>' +
				'<div class="remove-btn">' +
					'<object data="icons/x.svg"></object>' +
				'</div>' +
			'</li>'
		).appendTo($list);

		/* Handle applying scroll positions again */
		$new.click(function(event) {
			event.preventDefault();
			getActiveTab().then(function(tab) {
				if (item.url === tab.url) return executeScript({
					code: `window.scroll({top: ${item.position}, behavior: 'smooth'})`
				});
				/* If item url is not the url of the active tab, should open items in new tab */
				return createNewTab(item.url);
			}).catch(console.error.bind(console));
		});

		/* Prevent link from being dragged */
		$new.on('dragstart', () => false);

		$new.find('.remove-btn').click(function(event) {
			event.stopPropagation();
			getLocal('list').then(result => result.list).then(function(list) {
				delete list[id];
				return setLocal({ list: list });
			}).then(function() {
				$new.remove();
			}).catch(console.error.bind(console));
		});
	}

});

/* Handle tab change (close popup) */
chrome.tabs.onActivated.addListener(() => window.close());
