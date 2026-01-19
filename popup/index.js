$(function() {

	let $list = $('.bookmark-list');

	let showAll = false; // show bookmarks for all urls

	/* Construct initial list */
	view.updateList();


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

		view.updateList();
	}

	function matchSearch(item) {
		return item.title.includes(searchString) || item.url.includes(searchString);
	}

	/* Handle button for toggling between show all or show those for active tab */
	$('.main-btn.left').click(function() {
		if ($(this).hasClass('show-all')) {
			toggleShowAll();
		} else if (!$(this).hasClass('active')) { // search button visible but not actively searching
			search.enable();
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
			search.disable();
		}
	});

	// Collects and stores information about the active tab in a new bookmark
	function addBookmark() {
		bookmark.addBookmark().then(([id, item]) => {
			addListItem(id, item, $new => $new.appendTo($list));
		}).catch(console.error.bind(console));
	}

	function newListItem(id, item) {
		return $(
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
	}

	function initListItem($new) {
		/* Handle applying scroll positions again */
		$new.click(function(event) {
			event.preventDefault();
			if (!$new.hasClass('editing')) {
				bookmark.applyBookmark().catch(console.error.bind(console));
			}
		});

		/* Prevent link from being dragged */
		$new.on('dragstart', () => false);

		$new.find('.remove-btn').click(function(event) {
			bookmark.removeBookmark(id).then(() => {
				$new.remove();
			}).catch(console.error.bind(console));
		});
	}

	function newFolderList(item, folders) {
		return (
			`<div${ !item.folder ? ' class="selected"' : ''}>` +
				'<div class="text">None</div>' +
			'</div>' +

			folders.map(
				folder => newFolderListItem(item.folder === folder, folder)
			).join('') +

			'<div class="folder-add">' +
				'<input>' +
				'<div class="icon add-btn">' +
					'<object data="icons/plus.svg"></object>' +
				'</div>' +
			'</div>'
		);
	}

	function newFolderListItem(selected, name) {
		return (
			`<div${ selected ? ' class="selected"' : ''}>` +
				`<div class="text">${name}</div>` +
			'</div>'
		);
	}

	/* Function for adding items to display */
	function addListItem(id, item, insert) {
		let $new = newListItem(id, item);

		// Allow calling function to decide how the new element is inserted
		insert($new);

		initListItem($new);


		$new.find('.edit-btn').click(function(event) {
			event.stopPropagation();
			// TODO omg stop
			bookmark.getFolderList().then(function(folders) {

				$new.find('.folder-list').html(newFolderList(item, folders));

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
						browser.storage.local.set({ folders: folders }).then(function() {
							// Insert folder option
							let $folder = $(
								newFolderListItem(false, value)
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
			browser.storage.local.get('list').then(result => result.list).then(function(list) {
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
			browser.storage.local.get('list').then(result => result.list).then(function(list) {
				item.title = value;
				list[id] = JSON.stringify(item);
				return browser.storage.local.set({ list: list });
			}).then(function() {
				// Stop editing
				stopEditing(event);
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
