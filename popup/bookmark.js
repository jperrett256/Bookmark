$(function() {

	let $list = $('.bookmark-list');

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
					// TODO need a better way of checking that urls are equal (e.g. may not need complete string match)
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
			});
		}).catch(console.error.bind(console));
	});

	/* Function for adding items to display */
	function addListItem(id, item) {
		let $new = $(
			`<li id=${id} class="bookmark-item">` +
				'<div class="details">' +
					`<div class="title">${item.title}</div>` +
					`<div class="url">${item.url}</div>` +
				'</div>' +
				'<div class="remove-btn">' +
					'<object data="icons/x.svg"></object>' +
				'</div>' +
			'</li>'
		).appendTo($list);

		/* Handle applying scroll positions again */
		$new.click(function() {
			browser.tabs.query({currentWindow: true, active: true}).then(tabs => tabs[0]).then(function(tab) {
				if (item.url === tab.url) return browser.tabs.executeScript({
					code: `window.scroll({top: ${item.position}, behavior: 'smooth'})`
				});
				/* If item url is not the url of the active tab, should open items in new tab */
				return browser.tabs.create({ url: item.url }).then(() => window.close()); // closes window because of 'connection' issue (resetting is a workaround)
			}).catch(console.error.bind(console));
		});

		$new.find('.remove-btn').click(function(event) {
			event.stopPropagation();
			browser.storage.local.get('list').then(result => result.list).then(function(list) {
				delete list[id];
				return browser.storage.local.set({ list: list });
			}).then(function() {
				$new.remove();
			}).catch(console.error.bind(console));
		});
	}

});