const search = (function() {
	let searchActive = false;
	let searchString = '';
	const dispatcher = new Dispatcher();

	function enable() {
		if (searchActive) console.error("search already enabled");

		searchActive = true;
		searchString = '';

		dispatcher.dispatch('enable');
	}

	function disable() {
		if (!searchActive) console.error("search already disabled");

		searchActive = false;

		dispatcher.dispatch('disable');
	}

	function match(item) {
		// TODO should probably decouple searching from bookmark item structure
		return searchActive && (item.title.includes(searchString) || item.url.includes(searchString));
	}

	return {
		enable,
		disable,
		match,
		dispatcher
	};
})();
