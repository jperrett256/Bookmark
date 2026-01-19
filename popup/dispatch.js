class Dispatcher {
	constructor() {
		this.events = {};
	}

	dispatch(eventName, data) {
		const callbacks = this.events[eventName] || [];

		callbacks.forEach(callback => callback(data));
	}

	on(eventName, callback) {
		const callbacks = this.events[eventName] || [];

		this.events[eventName] = callbacks.concat(callback);
	}

	off(eventName, callback) {
		const callbacks = this.events[eventName] || [];
		const index = callbacks.indexOf(callback);

		if (index > -1) callbacks.splice(index, 1);

		if (!callbacks) delete this.events[eventName];
	}
}
