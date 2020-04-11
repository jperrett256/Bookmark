import React from 'react';
import ReactDOM from 'react-dom';
import Main from './components/Main';
import bookmark from './bookmark';

bookmark.addBookmark().then(([id, item]) => {
	console.log({id, item});
	return bookmark.getBookmarks().then(console.log.bind(console));
});

ReactDOM.render(
	<Main />,
	document.getElementById('root')
);
