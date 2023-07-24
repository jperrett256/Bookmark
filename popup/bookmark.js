$(function() {

	let $list = $('.bookmark-list');

	let showAll = false; // show bookmarks for all urls
	let searchActive = false;
	let searchString = '';

	/* Construct initial list */
	updateList();

	/* Function for updating the displayed list */
	function updateList() {
		let promises = [
			chrome.storage.local.get('list').then(result => result.list || {}),
			chrome.tabs.query({currentWindow: true, active: true}).then(tabs => tabs[0])
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

	/* Toggle between showing all bookmarks and the bookmarks for the active tab */
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

	/* Toggle the search bar */
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

	/* Handle button for toggling between show all or show those for active tab */
	$('.main-btn.left').click(function() {
		if ($(this).hasClass('show-all')) {
			toggleShowAll();
		} else if (!$(this).hasClass('active')) { // search button visible but not actively searching
			toggleSearchActive();
		}
	});

	/* Handle change to inputted search string */
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

	// Collects and stores information about the active tab in a new bookmark
	function addBookmark() {
		let getCurrentPosition = (list, tab) => chrome.scripting.executeScript({ func: () => window.scrollY, target: {tabId: tab.id} }).then(injectionResp => [list, tab, injectionResp[0].result])
		let promises = [
			chrome.storage.local.get('list').then(result => result.list || {}),
			chrome.tabs.query({currentWindow: true, active: true}).then(tabs => tabs[0])
		];

		Promise.all(promises)
			.then((results) => getCurrentPosition(results[0], results[1]))
			.then(function(results) {
				let [list, tab, position] = results;
				let id = Date.now();
				let newItem = {
					title: tab.title,
					url: tab.url,
					position: position
				};
				list[id] = JSON.stringify(newItem);

				return chrome.storage.local.set({ list: list }).then(function() {
					addListItem(id, newItem, $new => $new.appendTo($list));
					chrome.runtime.sendMessage({tab: tab})
				});
		}).catch(console.error.bind(console));
	}

	/* Function for adding items to display */
	function addListItem(id, item, insert) {
		let $new = $(
			`<li id="${id}" class="bookmark-item">` +
				'<div class="main">' +
					`<a href="${item.url}" class="details" ondragstart="return false">` +
						`<div class="title">${item.title}</div>` +
						`<div class="url">${item.url}</div>` +
					'</a>' +
					'<div class="edit-btn">' +
						'<object data="icons/edit-2.svg"></object>' +
					'</div>' +
				'</div>' +
				'<div class="hidden">' +
					'<div class="options">' +
						'<div class="icon remove-btn">' +
							'<object data="icons/trash.svg"></object>' +
						'</div>' +
						'<div class="folder-btn">' +
							'<div class="icon">' +
								'<object data="icons/folder.svg"></object>' +
							'</div>' +
							'<div class="selection">' +
								`<div class="text">${item.folder || 'None'}</div>` +
								'<div class="icon">' +
									'<object data="icons/chevron-down.svg"></object>' +
								'</div>' +
							'</div>' +
						'</div>' +
						'<div class="icon cancel-btn">' +
							'<object data="icons/x.svg"></object>' +
						'</div>' +
						'<div class="icon accept-btn">' +
							'<object data="icons/check.svg"></object>' +
						'</div>' +
					'</div>' +
					'<div class="folder-list"></div>' +
				'</div>' +
			'</li>'
		);

		// Allow calling function to decide how the new element is inserted
		insert($new);

		/* Handle applying scroll positions again */
		$new.click(function(event) {
			event.preventDefault();
			if (!$new.hasClass('editing')) {
				chrome.tabs.query({currentWindow: true, active: true}).then(tabs => tabs[0]).then(function(tab) {
					let executeScroll = (id, position) => chrome.scripting.executeScript({
						args: [position],
						func: (newPos) => window.scroll({top: newPos, behavior: 'smooth'}),
						target: {tabId: id}
					});

					if (item.url === tab.url) return executeScroll(tab.id, item.position);

					/* If item url is not the url of the active tab, should open items in new tab */
					return chrome.tabs.create({ url: item.url }).then((tab) => executeScroll(tab.id, item.position));
				}).catch(console.error.bind(console));
			}
		});

		/* Prevent link from being dragged */
		$new.on('dragstart', () => false);

		$new.find('.edit-btn').click(function(event) {
			event.stopPropagation();
			chrome.storage.local.get('folders').then(result => result.folders || []).then(function(folders) {

				$new.find('.folder-list').html(
					`<div${ !item.folder ? ' class="selected"' : ''}>` +
						'<div class="text">None</div>' +
					'</div>' +
					folders.map(folder => (
						`<div${ item.folder === folder ? ' class="selected"' : ''}>` +
							`<div class="text">${folder}</div>` +
						'</div>'
					)).join('') +
					'<div class="folder-add">' +
						'<input>' +
						'<div class="icon add-btn">' +
							'<object data="icons/plus.svg"></object>' +
						'</div>' +
					'</div>'
				);

				function folderSelection() {
					let $folders = $new.find('.folder-list > :not(:last-child)');
					let index = $folders.index(this) - 1;
					item.folder = index > -1 ? folders[index] : null;
					$new.find('.folder-btn .text').text(item.folder || 'None');
					$folders.removeClass('selected');
					$(this).addClass('selected');
				}

				$new.find('.folder-list > :not(:last-child)').click(folderSelection);

				$new.find('.add-btn').click(function() {
					let $input = $new.find('.folder-add input')
					let value = $input.val();
					if (value && !folders.includes(value)) {
						folders.push(value);
						// TODO should the folders item in storage be a dictionary of arrays associating folders with items?
						chrome.storage.local.set({ folders: folders }).then(function() {
							// Insert folder option
							let $folder = $(
								'<div>' +
									`<div class="text">${value}</div>` +
								'</div>'
							).insertBefore($new.find('.folder-add'));

							// Add click event handler
							$folder.click(folderSelection);

							// Clear new folder option input
							$input.val('');
						}).catch(console.error.bind(console));
					}
				});

				// TODO move adding folders to a different part of the UI?
				// TODO add deleting folders here? automatically remove folders with no items?

			}).catch(console.error.bind(console));

			$new.addClass('editing');
			$new.find('.details').removeAttr('href'); // gets in the way of cursor placement
			$new.find('.title').html(`<input value="${item.title}">`);
			let $input = $new.find('.title input').focus();
			$input.get(0).setSelectionRange(item.title.length, item.title.length);
		});

		$new.find('.remove-btn').click(function(event) {
			chrome.storage.local.get('list').then(result => result.list).then(function(list) {
				delete list[id];
				return chrome.storage.local.set({ list: list });
			}).then(function() {
				$new.remove();
				chrome.tabs.query({currentWindow: true, active: true}).then((tabs) => {
					chrome.runtime.sendMessage({tab: tabs[0]});
				})
			}).catch(console.error.bind(console));
		});

		$new.find('.folder-btn').click(function(event) {
			$new.toggleClass('folder-select');

			// focus the cursor where appropriate
			let $input;
			if ($new.hasClass('folder-select')) {
				$input = $new.find('.folder-add input');
			} else {
				$input = $new.find('.title input');
			}

			$input.focus();
			$input.get(0).setSelectionRange($input.val().length, $input.val().length);
		});

		function stopEditing(event) {
			event.stopPropagation();
			$new.find('.folder-list').empty();
			$new.find('.details').attr('href', item.url);
			$new.find('.title').text(item.title);
			$new.removeClass('editing folder-select');

			// Reset folder label to whatever is saved in storage
			chrome.storage.local.get('list').then(result => result.list).then(function(list) {
				let folder = JSON.parse(list[id]).folder;

				$new.find('.folder-btn .text').text(folder || 'None');
				item.folder = folder;
			}).catch(console.error.bind(console));
		}

		$new.find('.cancel-btn').click(function(event) {
			stopEditing(event);
		});

		$new.find('.accept-btn').click(function(event) {
			let value = $new.find('.title input').val();

			// Save new title and folder in storage (new folder stored in item.folder)
			chrome.storage.local.get('list').then(result => result.list).then(function(list) {
				item.title = value;
				list[id] = JSON.stringify(item);
				return chrome.storage.local.set({ list: list });
			}).then(function() {
				// Stop editing
				stopEditing(event);
			}).catch(console.error.bind(console));
		});
	}

	/* Handle tab change and url change */
	chrome.tabs.onActivated.addListener(updateList);
	chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		if (changeInfo.status == 'complete') {
			updateList();
		}
	});
});
