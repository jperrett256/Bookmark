$(function() {

	let $list = $('.bookmark-list');
	let background = browser.runtime.getBackgroundPage();

	let showAll = false; // show bookmarks for all urls
	let searchActive = false;

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
					if (item.url === tab.url || showAll) addListItem(id, item);
				});
			}
		}).catch(console.error.bind(console));
	}

	function recreateList() {
		// TODO should instead update list with necessary changes
		$('.bookmark-item').remove();
		createList();
	}

	function toggleShowAll() {
		showAll = !showAll;

		if (showAll) {
			$('.main-btn.left').removeClass('show-all').addClass('search');
			$('.main-btn.right').removeClass('add').addClass('back');
		} else {
			$('.main-btn.left').removeClass('search').addClass('show-all');
			$('.main-btn.right').removeClass('back').addClass('add');
		}

		recreateList();
	}

	function toggleSearchActive() {
		searchActive = !searchActive;

		if (searchActive) {
			$('.main-btn.left').addClass('active');

			// place cursor in input
			setTimeout(() => $('.main-btn.left input').focus(), 200); // animation delay (mirrored in css)

			$('.main-btn.right').removeClass('back').addClass('cancel');
		} else {
			$('.main-btn.left').removeClass('active');
			$('.main-btn.right').removeClass('cancel').addClass('back');
		}
	}

	/* Handle toggling filtering (show all or show those for active tab) */
	$('.main-btn.left').click(function() {
		if ($(this).hasClass('show-all')) {
			toggleShowAll();
		} else if (!$(this).hasClass('active')) { // search button visible but not actively searching
			toggleSearchActive();
		}
	});

	$('.main-btn.left input').on('input', function() {
		// TODO handle search string
	});

	/* Handle adding items to list */
	$('.main-btn.right').click(function() {
		if ($(this).hasClass('add')) {
			addBookmark();
		} else if ($(this).hasClass('back')) {
			toggleShowAll();
		} else { // cancel
			toggleSearchActive();
		}
	});

	function addBookmark() {
		let promises = [
			browser.tabs.executeScript({ code: 'window.pageYOffset' }).then(result => result[0]),
			browser.storage.local.get('list').then(result => result.list || {}),
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
	}

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
