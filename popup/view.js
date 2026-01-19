const view = (function () {

	/* Function for updating the displayed list */
	function updateList() {
		let promises = [
			bookmark.getBookmarks(),
			bookmark.getActiveTab()
		];

		// TODO clean up

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
				if ((item.url === tab.url || showAll) && search.match(item)) {

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


	search.on('enable', () => {
		$('.main-btn.left').addClass('active');

		// place cursor in input
		setTimeout(() => $('.main-btn.left input').focus(), 200); // animation delay (mirrored in css)

		$('.main-btn.right').removeClass('back').addClass('cancel');
	});

	search.on('disable', () => {
		$('.main-btn.left').removeClass('active');

		// clear input
		$('.main-btn.left input').val('');
		searchString = '';

		$('.main-btn.right').removeClass('cancel').addClass('back');

		// update list
		updateList();
	});



	return {
		updateList
	};

})();

class BookmarkList {
	// TODO
}

class BookmarkListItem {
	// TODO
}
