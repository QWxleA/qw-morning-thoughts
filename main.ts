import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, getFrontMatterInfo, stringifyYaml } from 'obsidian';

interface TodaysThoughtSettings {
	prompts: string[];
	dailyNoteFolder: string;
	dailyNoteFormat: string;
}

const DEFAULT_SETTINGS: TodaysThoughtSettings = {
	prompts: [
		"What's on your mind right now?",
		"What are you thinking about today?",
		"Share a thought that's important to you right now.",
		"What are you curious about today?",
		"What's something you're currently processing?"
	],
	dailyNoteFolder: '/Journal',
	dailyNoteFormat: 'YYYY-MM-DD'
}

export default class TodaysThoughtPlugin extends Plugin {
	settings: TodaysThoughtSettings;

	async onload() {
		await this.loadSettings();

		// Add the command for today's thought
		this.addCommand({
			id: 'todays-thought',
			name: 'Capture today\'s thought',
			callback: () => {
				new ThoughtModal(this.app, this).open();
			}
		});

		// Add settings tab
		this.addSettingTab(new TodaysThoughtSettingTab(this.app, this));
	}

	onunload() {
		// Nothing specific to unload
	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getRandomPrompt(): string {
		return this.settings.prompts[Math.floor(Math.random() * this.settings.prompts.length)];
	}

	async getDailyNote(date: moment.Moment): Promise<TFile | null> {
		const { vault } = this.app;
		const { dailyNoteFolder, dailyNoteFormat } = this.settings;
		
		// Use moment.js format (already included in Obsidian)
		const fileName = date.format(dailyNoteFormat) + '.md';
		const folderPath = dailyNoteFolder !== '/' ? dailyNoteFolder : '';
		const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
		
		let file = vault.getAbstractFileByPath(filePath);
		
		console.log(`file: ${file}`)
		if (file instanceof TFile) {
			return file;
		}
		
		return null;
	}

	async createOrUpdateDailyNote(date: moment.Moment, thought: string): Promise<void> {
		const { vault } = this.app;
		const { dailyNoteFolder, dailyNoteFormat } = this.settings;
		
		// Create folder if it doesn't exist
		if (dailyNoteFolder !== '/' && !vault.getAbstractFileByPath(dailyNoteFolder)) {
			await vault.createFolder(dailyNoteFolder);
		}
		
		const fileName = date.format(dailyNoteFormat) + '.md';
		const folderPath = dailyNoteFolder !== '/' ? dailyNoteFolder : '';
		const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
		
		let file = vault.getAbstractFileByPath(filePath);
		
		if (!(file instanceof TFile)) {
			// Create new note if it doesn't exist
			file = await vault.create(filePath, '---\n---\n\n');
		}
		
		// Now update the frontmatter
		if (file instanceof TFile) {
			const content = await vault.read(file);
			const frontmatterInfo = getFrontMatterInfo(content);
			let frontmatter = frontmatterInfo.frontmatter ? {...frontmatterInfo.frontmatter} : {};
			
			// Add today's thought to frontmatter
			frontmatter.todaysThought = thought;
			
			// Create new content with updated frontmatter
			const newContent = `---\n${stringifyYaml(frontmatter)}---\n${frontmatterInfo.content || '\n'}`;
			
			// Write back to file
			await vault.modify(file, newContent);
		}
	}

	async getPreviousThoughts(): Promise<{today: string, yesterday: string, threeDaysAgo: string, lastWeek: string}> {
		const today = window.moment();
		const yesterday = window.moment().subtract(1, 'day');
		const threeDaysAgo = window.moment().subtract(3, 'days');
		const lastWeek = window.moment().subtract(7, 'days');
		
		const result = {
			today: '',
			yesterday: '',
			threeDaysAgo: '',
			lastWeek: ''
		};
		
		// Check today's note
		const todayFile = await this.getDailyNote(today);
		if (todayFile) {
			const content = await this.app.vault.read(todayFile);
			const frontmatterInfo = getFrontMatterInfo(content);
			if (frontmatterInfo.frontmatter && frontmatterInfo.frontmatter.todaysThought) {
				result.today = frontmatterInfo.frontmatter.todaysThought;
			}
		}
		
		// Check yesterday's note
		const yesterdayFile = await this.getDailyNote(yesterday);
		if (yesterdayFile) {
			const content = await this.app.vault.read(yesterdayFile);
			const frontmatterInfo = getFrontMatterInfo(content);
			if (frontmatterInfo.frontmatter && frontmatterInfo.frontmatter.todaysThought) {
				result.yesterday = frontmatterInfo.frontmatter.todaysThought;
			}
		}
		
		// Check 3 days ago note
		const threeDaysAgoFile = await this.getDailyNote(threeDaysAgo);
		if (threeDaysAgoFile) {
			const content = await this.app.vault.read(threeDaysAgoFile);
			const frontmatterInfo = getFrontMatterInfo(content);
			if (frontmatterInfo.frontmatter && frontmatterInfo.frontmatter.todaysThought) {
				result.threeDaysAgo = frontmatterInfo.frontmatter.todaysThought;
			}
		}
		
		// Check last week's note
		const lastWeekFile = await this.getDailyNote(lastWeek);
		if (lastWeekFile) {
			const content = await this.app.vault.read(lastWeekFile);
			const frontmatterInfo = getFrontMatterInfo(content);
			if (frontmatterInfo.frontmatter && frontmatterInfo.frontmatter.todaysThought) {
				result.lastWeek = frontmatterInfo.frontmatter.todaysThought;
			}
		}
		
		return result;
	}
}

class ThoughtModal extends Modal {
	plugin: TodaysThoughtPlugin;
	thoughtInput: HTMLTextAreaElement;

	constructor(app: App, plugin: TodaysThoughtPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const {contentEl} = this;
		
		// Create prompt container with different background
		const promptContainer = contentEl.createDiv({cls: 'prompt-container'});
		
		// Display random prompt
		promptContainer.createEl('h2', {text: this.plugin.getRandomPrompt()});
		
		// Create textarea for input
		this.thoughtInput = contentEl.createEl('textarea', {
			cls: 'thought-input',
			attr: {
				placeholder: 'Enter your thought here...'
			}
		});
		this.thoughtInput.focus();
		
		// Add button container
		const buttonContainer = contentEl.createDiv({cls: 'thought-button-container'});
		
		// Add "No thoughts or time" button
		const noThoughtsButton = buttonContainer.createEl('button', {
			text: 'No thoughts or time',
			cls: 'thought-button'
		});
		noThoughtsButton.addEventListener('click', async () => {
			await this.plugin.createOrUpdateDailyNote(window.moment(), 'no thoughts or time');
			this.close();
			
			// Tomorrow's note will be created when the plugin is run tomorrow
			new Notice('Saved: "No thoughts or time"');
			
			// Show previous thoughts
			new PreviousThoughtsModal(this.app, this.plugin).open();
		});
		
		// Add "Save" button
		const saveButton = buttonContainer.createEl('button', {
			text: 'Save Thought',
			cls: 'thought-button'
		});
		saveButton.addEventListener('click', async () => {
			const thought = this.thoughtInput.value.trim();
			if (thought) {
				await this.plugin.createOrUpdateDailyNote(window.moment(), thought);
				this.close();
				new Notice('Thought saved!');
				
				// Show previous thoughts
				new PreviousThoughtsModal(this.app, this.plugin).open();
			} else {
				new Notice('Please enter a thought or choose "No thoughts or time"');
			}
		});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class PreviousThoughtsModal extends Modal {
	plugin: TodaysThoughtPlugin;

	constructor(app: App, plugin: TodaysThoughtPlugin) {
		super(app);
		this.plugin = plugin;
	}

	async onOpen() {
		const {contentEl} = this;
		contentEl.empty();
		
		contentEl.createEl('h2', {text: 'Previous Thoughts'});
		
		// Show loading indicator
		const loadingEl = contentEl.createEl('div', {text: 'Loading previous thoughts...'});
		
		try {
			const previousThoughts = await this.plugin.getPreviousThoughts();
			contentEl.removeChild(loadingEl);
			
			// Create a container
			const container = contentEl.createDiv();
			container.style.display = 'flex';
			container.style.flexDirection = 'column';
			container.style.gap = '15px';
			
			// Today's thought (if already exists)
			if (previousThoughts.today) {
				this.createThoughtElement(container, 'Today', previousThoughts.today);
			}
			
			// Yesterday's thought
			this.createThoughtElement(container, 'Yesterday', previousThoughts.yesterday || 'No thought recorded');
			
			// 3 days ago thought
			this.createThoughtElement(container, '3 Days Ago', previousThoughts.threeDaysAgo || 'No thought recorded');
			
			// Last week's thought
			this.createThoughtElement(container, 'Last Week', previousThoughts.lastWeek || 'No thought recorded');
			
			// Create close button
			const closeButton = contentEl.createEl('button', {
				text: 'Close',
				cls: 'thought-button'
			});
			closeButton.style.marginTop = '20px';
			closeButton.addEventListener('click', () => this.close());
		} catch (error) {
			contentEl.removeChild(loadingEl);
			contentEl.createEl('div', {text: 'Error loading previous thoughts: ' + error.message, cls: 'error'});
			
			// Create close button
			const closeButton = contentEl.createEl('button', {
				text: 'Close',
				cls: 'thought-button'
			});
			closeButton.style.marginTop = '20px';
			closeButton.addEventListener('click', () => this.close());
		}
	}

	createThoughtElement(container: HTMLElement, title: string, content: string) {
		const element = container.createDiv({cls: 'previous-thought'});
		
		element.createEl('h3', {text: title});
		element.createEl('p', {text: content});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class TodaysThoughtSettingTab extends PluginSettingTab {
	plugin: TodaysThoughtPlugin;

	constructor(app: App, plugin: TodaysThoughtPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl('h2', {text: 'Today\'s Thought Settings'});

		// Daily Note folder setting
		new Setting(containerEl)
			.setName('Daily notes folder')
			.setDesc('Folder where your daily notes are stored')
			.addText(text => text
				.setPlaceholder('/')
				.setValue(this.plugin.settings.dailyNoteFolder)
				.onChange(async (value) => {
					this.plugin.settings.dailyNoteFolder = value;
					await this.plugin.saveSettings();
				}));
		
		// Daily Note format setting
		new Setting(containerEl)
			.setName('Daily note format')
			.setDesc('Format for daily note filenames (uses moment.js format)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.dailyNoteFormat)
				.onChange(async (value) => {
					this.plugin.settings.dailyNoteFormat = value;
					await this.plugin.saveSettings();
				}));
		
		// Prompt settings - Create styled container
		const promptsContainer = containerEl.createDiv({cls: 'prompts-container'});
		promptsContainer.createEl('h3', {text: 'Prompts'});
		promptsContainer.createEl('p', {text: 'Configure the prompts that will randomly appear when recording your daily thought.'});

		// Create settings for each prompt
		this.plugin.settings.prompts.forEach((prompt, index) => {
			new Setting(promptsContainer)
				.setName(`Prompt ${index + 1}`)
				.addText(text => text
					.setValue(prompt)
					.onChange(async (value) => {
						this.plugin.settings.prompts[index] = value;
						await this.plugin.saveSettings();
					}))
				.addButton(button => button
					.setButtonText('Delete')
					.onClick(async () => {
						this.plugin.settings.prompts.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}));
		});

		// Button to add new prompt
		new Setting(promptsContainer)
			.addButton(button => button
				.setButtonText('Add New Prompt')
				.onClick(async () => {
					this.plugin.settings.prompts.push('What are you thinking about today?');
					await this.plugin.saveSettings();
					this.display();
				}));
	}
}