import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, getFrontMatterInfo, stringifyYaml } from 'obsidian';
import { getFrontmatterProperty, updateFrontmatterProperty, getThoughtForDate } from './src/frontmatter-utils';
import { getDailyNoteFile } from './src/daily-note-utils';

export interface DailyNoteSettings {
	prompts: string[];
	dailyNoteFolder: string;
	dailyNoteFormat: string;
}

interface frontmatter {
	todaysThought?: string;
}

interface frontmatterInfo {
	frontmatter?: string;
	content?: string;
}

// interface result {
// 	today: string | null,
// 	yesterday: string | null,
// 	threeDaysAgo: string | null,
// 	lastWeek: string | null
// };

const DEFAULT_SETTINGS: DailyNoteSettings = {
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
	settings: DailyNoteSettings;

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

	//REMOVEME
	// async getDailyNote(date: moment.Moment): Promise<TFile | null> {
	// 	const { vault } = this.app;
	// 	const { dailyNoteFolder, dailyNoteFormat } = this.settings;
		
	// 	// Use moment.js format (already included in Obsidian)
	// 	const fileName = date.format(dailyNoteFormat) + '.md';
	// 	const folderPath = dailyNoteFolder !== '/' ? dailyNoteFolder : '';
	// 	const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
		
	// 	let file = vault.getAbstractFileByPath(filePath);
		
	// 	console.log(`file: ${file}`)
	// 	if (file instanceof TFile) {
	// 		return file;
	// 	}
		
	// 	return null;
	// }

	/**
	 * create or update today's daily note frontmatter key: todaysThought
	 * @param date - Moment date object to use (typically today)
	 * @param thought - string to be added to todaysThought
	 */
	async createOrUpdateDailyNote(date: moment.Moment, thought: string): Promise<void> {
		const { vault } = this.app;
		const today = window.moment();
		const todayFile = await getDailyNoteFile(this.app, this.settings, today);
		if (todayFile instanceof TFile) {
			const success = await updateFrontmatterProperty(
				this.app,
				todayFile,
				'todaysThought',
				thought
			);
	
			if (success) { new Notice(`Updated todaysThought of "${todayFile.name}" to 💭`); } 
		} else {
			new Notice('Failed to update todaysThought');			
		}
	}

	async getPreviousThoughts(): Promise<{
		today: string | null;
		yesterday: string | null;
		threeDaysAgo: string | null;
		lastWeek: string | null;
	}> {
		const today = window.moment();
		const yesterday = window.moment().subtract(1, 'day');
		const threeDaysAgo = window.moment().subtract(3, 'days');
		const lastWeek = window.moment().subtract(7, 'days');
		console.log("getPrevious")
		console.log(this.settings)
		const result = {
			today: await getThoughtForDate(this.app, this.settings, today),
			yesterday: await getThoughtForDate(this.app, this.settings, yesterday),
			threeDaysAgo: await getThoughtForDate(this.app, this.settings, threeDaysAgo),
			lastWeek: await getThoughtForDate(this.app, this.settings, lastWeek)
		};
	
		return result;
	}
}

class ThoughtModal extends Modal {
	settings: DailyNoteSettings;
	plugin: TodaysThoughtPlugin;
	thoughtInput: HTMLTextAreaElement;

	constructor(app: App, plugin: TodaysThoughtPlugin) {
		super(app);
		this.plugin = plugin;
	}

	async onOpen() {
		const {contentEl} = this;
		
		// Create prompt container with different background
		const promptContainer = contentEl.createDiv({cls: 'prompt-container'});
		
		// Display random prompt
		promptContainer.createEl('h2', {text: this.plugin.getRandomPrompt()});
		
		const previousThoughts = await this.plugin.getPreviousThoughts();

		// Create textarea for input
		this.thoughtInput = contentEl.createEl('textarea', {
			cls: 'thought-input',
			// attr: {
			// 	placeholder: previousThoughts.today ?? 'Enter your thought here...'
			// }
		});
		this.thoughtInput.value = previousThoughts.today ?? 'Enter your thought here...'
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
			console.log(`thought 💭: ${thought}`)
			if (thought) {
				await this.plugin.createOrUpdateDailyNote(window.moment(), thought);
				this.close();
				// new Notice('Thought saved!');
				
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
			
			this.createThoughtElement(container, 'Today', previousThoughts.today || 'No thought recorded');
			this.createThoughtElement(container, 'Yesterday', previousThoughts.yesterday || 'No thought recorded');
			this.createThoughtElement(container, '3 Days Ago', previousThoughts.threeDaysAgo || 'No thought recorded');
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