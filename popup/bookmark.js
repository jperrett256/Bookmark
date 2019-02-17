$(function() {
	browser.tabs.executeScript({
		code: 'window.pageYOffset'
	}).then(result => result[0]).then(function(result) {
		$('.bookmark-main').text(result);
	}).catch(console.error.bind(console));
});