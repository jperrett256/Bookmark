$(function() {
	// TODO remove debug

	/* Construct initial list */
	browser.storage.local.get('list').then(result => result.list).then(function(list) {
		// console.log(JSON.stringify(list));
		if (list) {
			Object.keys(list).forEach(function(id) {
				// console.log(JSON.parse(list[id]));
				$('.bookmark-list').append(generateListItem(id, JSON.parse(list[id])));
			});
		}
	}).catch(console.error.bind(console));

	/* Handle adding items to list */
	$('.add-btn').click(function() {
		browser.tabs.executeScript({
			code: 'window.pageYOffset'
		}).then(result => result[0]).then(function(scrollY) {
			// console.log(`scrollY: ${scrollY}`);
			let promises = [
				browser.storage.local.get('list').then(result => result && result.list || {}),
				browser.tabs.query({currentWindow: true, active: true}).then(tab => tab[0].url)
			];
			return Promise.all(promises).then(function(results) {
				let [list, url] = results;
				let id = Date.now();
				// console.log(`id: ${id}, url: ${url}`);
				let newItem = {
					url: url,
					position: scrollY
				};
				list[id] = JSON.stringify(newItem);
				// console.log(`list: ${JSON.stringify(list)}`);
				return browser.storage.local.set({ list: list }).then(function() {
					$('.bookmark-list').append(generateListItem(id, newItem));
				});
			});
		}).catch(console.error.bind(console));
	});

	/* Function for adding items to display */
	function generateListItem(id, item) {
		return (
			`<li id=${id} class="bookmark-item">` +
				`<div class="site">${item.url}</div>` +
			'</li>'
		);
	}
});