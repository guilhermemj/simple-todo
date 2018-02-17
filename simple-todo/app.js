// =======================
//  Data-Relative Classes
// =======================

const { LocalStorageDataBase, Task } = (() => {

	//  LocalStorage interaction class
	// --------------------------------

	class LocalStorageDataBase {
		constructor(namespace) {
			this.namespace = namespace;
		}

		loadData() {
			return JSON.parse(localStorage.getItem(this.namespace));
		}

		saveData(data) {
			localStorage.setItem(this.namespace, JSON.stringify(data));
		}
	}


	//  Task Data Class
	// -----------------

	let TaskIdCounter = 0;
	const getNextTaskId = () => TaskIdCounter++;

	class Task {
		constructor(text, isDone) {
			this.text     = text;
			this.id       = getNextTaskId();
			this.position = 1;
			this.isDone   = !!isDone;
		}

		static parse({ text, isDone }) {
			return new Task(text, isDone);
		}
	}

	// "export"
	return {
		LocalStorageDataBase,
		Task,
	};
})();


// =====================
//  Task List Interface
// =====================

const taskListInterface = (() => {
	const dataBase   = new LocalStorageDataBase('simpleDB');
	const storedData = dataBase.loadData();
	const taskList   = storedData ? storedData.map(Task.parse) : [];

	const isValidId = (taskId) => (
		typeof taskId === 'string' ||
		typeof taskId === 'number'
	);

	// GET Method
	const getData = (taskId) => {
		if (typeof taskId == 'undefined') return taskList;

		if (!isValidId(taskId)) throw new TypeError('Invalid task ID');

		const foundTask = taskList.find((task) => task.id == taskId);

		if (!foundTask) throw new ReferenceError('Task not found');

		return foundTask;
	};

	// POST Method
	const addItem = (data) => {
		const task = (data instanceof Task) ? data : Task.parse(data);

		taskList.push(task);
		dataBase.saveData(taskList);
	};

	// PUT Method
	const updateItem = (taskId, data) => {
		if (!isValidId(taskId)) throw new TypeError('Invalid task ID');

		const taskIndex = taskList.findIndex((task) => task.id == taskId);

		if (taskIndex == -1) throw new ReferenceError('Task not found');

		const targetTask = taskList[taskIndex];

		Object.keys(targetTask).forEach((value, key) => {
			// Add validation for "protected" attributes like ID
			console.log(key, value);

			if (
				typeof data[key] === 'undefined' ||
				data[key] === targetTask[key]
			) return;

			targetTask[key] = data[key];
		});

		dataBase.saveData(taskList);
	};

	// DELETE Method
	const deleteItem = (taskId) => {
		if (!isValidId(taskId)) throw new TypeError('Invalid task ID');

		const taskIndex = taskList.findIndex((task) => task.id == taskId);

		if (taskIndex == -1) throw new ReferenceError('Task not found');

		taskList.splice(taskIndex, 1);
	};

	return {
		get: getData,
		add: addItem,
		update: updateItem,
		delete: deleteItem,
	}
})();


// ======================
//  DOM-Relative Classes
// ======================

const { SimpleForm } = (() => {

	//  Simple Form
	// -------------

	class SimpleForm {
		constructor(selector) {
			if (
				typeof selector !== 'string' ||
				selector === ''
			) throw new TypeError(`'${selector}' is not a valid selector.`);

			this._selector = selector;
			this.DOM = {};
			this.classes = {
				validityChecked: 'was-validated'
			};
		}

		init() {
			this.updateElementReferences();

			this.addEventListeners();
		}

		updateElementReferences() {
			this.DOM.form = document.querySelector(this._selector);

			if (!this.DOM.form) throw new ReferenceError('Form element not found');

			this.DOM.input = this.DOM.form.querySelector('[name=task-text]');

			if (!this.DOM.input) throw new ReferenceError('Input element not found');
		}

		addEventListeners() {
			this.DOM.form.addEventListener('submit', (event) => {
				event.preventDefault();
				event.stopPropagation();

				this.validate();
			});
		}

		validate() {
			this.DOM.form.classList.add(this.classes.validityChecked);

			if (!this.DOM.form.checkValidity()) return;

			this.submit(this.DOM.input.value);
		}

		submit(data) {
			this.DOM.form.dispatchEvent(
				new CustomEvent('validSubmit', {
					detail: { formData: data }
				})
			);

			this.reset();
		}

		reset() {
			this.DOM.form.classList.remove(this.classes.validityChecked);
			this.DOM.form.reset();
		}
	}

	// "export"
	return {
		SimpleForm,
	};
})();


// =============
//  Application
// =============

const simpleTodo = (() => {

	//  Helper Functions
	// ------------------

	const onDocumentReady = (fn) => {
		const hasDOMLoaded = (document.attachEvent ?
			document.readyState === "complete" :
			document.readyState !== "loading"
		);

		if (hasDOMLoaded) {
			fn();
		} else {
			document.addEventListener('DOMContentLoaded', fn);
		}
	};

	// IE9+ Element.matches polyfill
	if (!Element.prototype.matches) {
		Element.prototype.matches = Element.prototype.msMatchesSelector;
	}

	const delegateEvent = (element, eventName, selector, handler) => {
		element.addEventListener(eventName, (event) => {
			if (event.target && event.target.matches(selector)) {
				handler(event);
			}
		});
	};

	const simpleTemplateRender = (template, context) => {
		const isValidValue = (value) => (
			typeof value !== 'undefined' &&
			value !== null
		);

		return template.replace(
			/{{([^]*?)}}/g,
			(originalString, key) => (isValidValue(context[key]) ? context[key] : originalString)
		);
	};


	//  Task List
	// -----------

	class TaskList {
		constructor(selector) {
			if (
				typeof selector !== 'string' ||
				selector === ''
			) throw new TypeError(`'${selector}' is not a valid selector.`);

			this._selector = selector;
			this.DOM = {};
			this.classes = {
				taskComplete: 'task-complete'
			};
		}

		init() {
			this.updateElementReferences();

			this.addEventListeners();
		}

		updateElementReferences() {
			this.DOM.list = document.querySelector(this._selector);

			if (!this.DOM.list) throw new ReferenceError('List element not found');
		}

		addEventListeners() {
			delegateEvent(this.DOM.list, 'click', '.task', (event) => {
				event.target.classList.toggle(this.classes.taskComplete);
			});

			delegateEvent(this.DOM.list, 'click', '[data-action=remove]', (event) => {
				if (!event.target) return;

				event.preventDefault();
				event.stopPropagation();

				const taskId = event.target.parentNode.getAttribute('data-id');
				this.remove(taskId);
			});
		}

		add(task) {
			const taskTemplate = document.getElementById('task-template');

			if (!taskTemplate) throw new ReferenceError('Task template was not found');

			this.DOM.list.innerHTML += simpleTemplateRender(taskTemplate.innerHTML, task);

			this.DOM.list.dispatchEvent(
				new CustomEvent('taskAdded', { detail: task })
			);
		}

		remove(taskId) {
			const targetTask = this.DOM.list.querySelector(`[data-id="${taskId}"]`);

			if (!targetTask) throw new ReferenceError(`No elements with taskId = ${taskId}.`);

			this.DOM.list.removeChild(targetTask);

			this.DOM.list.dispatchEvent(
				new CustomEvent('taskRemoved', { detail: taskId })
			);
		}
	}


	//  Application Class
	// --------------------

	class SimpleTodo {
		constructor () {
			// Create DOM interacting instances
			this.taskForm = new SimpleForm('[data-is=task-form]');
			this.taskList = new TaskList('[data-is=task-list]');
		}

		init() {
			this.taskForm.init();
			this.taskList.init();

			const storedData = taskListInterface.get();

			// Add stored tasks
			if (!!storedData) {
				storedData.forEach((task) => { this.taskList.add(task); });
			}

			this.addEventListeners();
		}

		addEventListeners() {
			this.taskForm.DOM.form.addEventListener('validSubmit', (event) => {
				const formData = event.detail.formData;
				const newTask  = new Task(formData, false);

				// API -> POST
				taskListInterface.add(newTask);

				// Update DOM
				this.taskList.add(newTask);
			});

			this.taskList.DOM.list.addEventListener('taskRemoved', (event) => {
				const taskId = event.detail;

				// API -> DELETE
				taskListInterface.delete(taskId);
			});
		}
	}

	// Create singleton instance
	const singleton = new SimpleTodo();

	// Init application when DOM has loaded
	onDocumentReady(() => {
		singleton.init();
	});

	// Make it available globally
	return singleton;
})();
