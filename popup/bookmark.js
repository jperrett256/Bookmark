$(function() {

	let $list = $('.bookmark-list');
	let background = browser.runtime.getBackgroundPage();

	let showAll = false; // show bookmarks for all urls
	let searchActive = false;
	let searchString = '';

	/* Construct initial list */
	updateList();

	/* Function for updating the displayed list */
	function updateList() {
		let promises = [
			browser.storage.local.get('list').then(result => result.list || {}),
			browser.tabs.query({currentWindow: true, active: true}).then(tabs => tabs[0])
		];

		// Update displayed list to match new list
		Promise.all(promises).then(function(results) {
			let [list, tab] = results;

			// Keep previous elements where possible
			const $previous = $list.children();
			let old_idx = 0;

			// New list of elements
			const ids = Object.keys(list);
			let new_idx = 0;

			while (new_idx < ids.length) {
				let id = ids[new_idx];
				let item = JSON.parse(list[id]);

				/* Unless showing all, need to check if the item url matches the tab url.
				 * Also need to check if the item matches the search string. */
				if ((item.url === tab.url || showAll) && matchSearch(item)) {

					// Check if there are old elements to compare against
					if (old_idx < $previous.length) {
						// Get current old element to compare against
						let $other = $previous.eq(old_idx);
						let other_id = $other.attr('id');

						// Check if this should be inserted before the current old element
						if (id < other_id) {
							addListItem(id, item, $new => $new.insertBefore($other));
							new_idx++;
						} else {
							if (id != other_id) {
								// Remove the old element if it is not found in the new list
								$other.remove();
							} else {
								// Element already exists, no need to add
								new_idx++;
							}
							old_idx++;
						}
					} else {
						// If there are no more old elements, place at end of list
						addListItem(id, item, $new => $new.appendTo($list));
						new_idx++;
					}
				} else {
					new_idx++;
				}
			}

			// Remove any remaining old items
			$previous.slice(old_idx).remove();

		}).catch(console.error.bind(console));
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

		updateList();
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

			// clear input
			$('.main-btn.left input').val('');
			searchString = '';

			$('.main-btn.right').removeClass('cancel').addClass('back');

			// update list
			updateList();
		}
	}

	function matchSearch(item) {
		return item.title.includes(searchString) || item.url.includes(searchString);
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
		searchString = $(this).val();
		updateList();
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
				addListItem(id, newItem, $new => $new.appendTo($list));
				background.then(page => page.updateBadge());
			});
		}).catch(console.error.bind(console));
	}

	/* Function for adding items to display */
	function addListItem(id, item, insert) {
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
		);

		// Allow calling function to decide how the new element is inserted
		insert($new);

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
	browser.tabs.onActivated.addListener(updateList);
	browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		if (changeInfo.status == 'complete') {
			updateList();
		}
	});
});
