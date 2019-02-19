$(function() {

	let $list = $('.bookmark-list');

	/* Construct initial list */
	browser.storage.local.get('list').then(result => result.list).then(function(list) {
		if (list) {
			Object.keys(list).forEach(function(id) {
				addListItem(id, JSON.parse(list[id]));
			});
		}
	}).catch(console.error.bind(console));

	/* Handle adding items to list */
	$('.add-btn').click(function() {
		let promises = [
			browser.tabs.executeScript({ code: 'window.pageYOffset' }).then(result => result[0]),
			browser.storage.local.get('list').then(result => result && result.list || {}),
			browser.tabs.query({currentWindow: true, active: true}).then(tab => tab[0])
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
			browser.storage.local.get('list').then(result => result.list).then(function(list) {
				return browser.tabs.executeScript({
					code: `window.scroll({top: ${JSON.parse(list[id]).position}, behavior: 'smooth'})`
				});
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