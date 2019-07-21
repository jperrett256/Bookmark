$(function() {

	let $list = $('.bookmark-list');
	let background = browser.runtime.getBackgroundPage();

	/* Construct initial list */
	createList();

	/* Function for creating list */
	function createList() {
		let promises = [
			browser.storage.local.get('list').then(result => result.list),
			browser.tabs.query({currentWindow: true, active: true}).then(tabs => tabs[0])
		];

		Promise.all(promises).then(function(results) {
			let [list, tab] = results;
			if (list) {
				Object.keys(list).forEach(function(id) {
					let item = JSON.parse(list[id]);
					/* If the filter is on, need to check if the item url matches the tab url */
					if (item.url === tab.url || !$('.filter-btn').hasClass('active')) addListItem(id, item);
				});
			}
		}).catch(console.error.bind(console));
	}

	function recreateList() {
		// TODO should instead update list with necessary changes
		$('.bookmark-item').remove();
		createList();
	}

	/* Handle toggling filtering (show all or show those for active tab) */
	$('.filter-btn').click(function() {
		$(this).toggleClass('active');
		recreateList();
	});

	/* Handle adding items to list */
	$('.add-btn').click(function() {
		let promises = [
			browser.tabs.executeScript({ code: 'window.pageYOffset' }).then(result => result[0]),
			browser.storage.local.get('list').then(result => result && result.list || {}),
			browser.tabs.query({currentWindow: true, active: true}).then(tabs => tabs[0])
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

			return browser.storage.local.set({ list: list }).then(function() {
				addListItem(id, newItem);
				background.then(page => page.updateBadge());
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
			browser.tabs.query({currentWindow: true, active: true}).then(tabs => tabs[0]).then(function(tab) {
				let executeScroll = () => browser.tabs.executeScript({
					code: `window.scroll({top: ${item.position}, behavior: 'smooth'})`
				});

				if (item.url === tab.url) return executeScroll();

				/* If item url is not the url of the active tab, should open items in new tab */
				return browser.tabs.create({ url: item.url }).then(executeScroll);
			}).catch(console.error.bind(console));
		});

		/* Prevent link from being dragged */
		$new.on('dragstart', () => false);

		$new.find('.remove-btn').click(function(event) {
			event.stopPropagation();
			browser.storage.local.get('list').then(result => result.list).then(function(list) {
				delete list[id];
				return browser.storage.local.set({ list: list });
			}).then(function() {
				$new.remove();
				background.then(page => page.updateBadge());
			}).catch(console.error.bind(console));
		});
	}

	/* Handle tab change and url change */
	browser.tabs.onActivated.addListener(recreateList);
	browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		if (changeInfo.status == 'complete') {
			recreateList();
		}
	});
});
