$(function() {

	let $list = $('.bookmark-list');

	// TODO remove debug

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
		browser.tabs.executeScript({
			code: 'window.pageYOffset'
		}).then(result => result[0]).then(function(scrollY) {
			let promises = [
				browser.storage.local.get('list').then(result => result && result.list || {}),
				browser.tabs.query({currentWindow: true, active: true}).then(tab => tab[0].url)
			];

			return Promise.all(promises).then(function(results) {
				let [list, url] = results;
				let id = Date.now();
				let newItem = {
					url: url,
					position: scrollY
				};
				list[id] = JSON.stringify(newItem);

				return browser.storage.local.set({ list: list }).then(function() {
					addListItem(id, newItem);
				});
			});
		}).catch(console.error.bind(console));
	});

	/* Function for adding items to display */
	function addListItem(id, item) {
		let $new = $(
			`<li id=${id} class="bookmark-item">` +
				`<div class="site">${item.url}</div>` +
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
	}

});