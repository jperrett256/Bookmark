import React, { useState } from 'react';
import { Plus as PlusIcon, List as ListIcon } from 'react-feather';
import Button from './Button';
import List from './List';

const Main = () => {

	const [showAll, setShowAll] = useState(false);

	return (
		<div className="main">
			<List showAll />
			<Button icon={ListIcon} />
			<Button icon={PlusIcon} />
			<style jsx>{`
				/* TODO */
				* {
					color: red;
				}
			`}</style>
		</div>
	);
};

export default Main;
