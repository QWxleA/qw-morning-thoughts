# Morning thoughts 💭 
This (small) plugin is based on the following idea:
> When I open my note-taking app first thing in the morning ask what I’m currently thinking about. Once I’ve marked this complete, show me what I said yesterday, three days ago, and last week. – [Programmable Notes](https://maggieappleton.com/programmatic-notes) Maggie Appleton

## Installation

### From Obsidian Community Plugins (not sure yet, this is just copy-pasta)

1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Pomodoro Timer"
4. Click Install and Enable

### Manual Installation

1. Download the latest release
2. Extract the zip file into your Obsidian vault's `.obsidian/plugins/` directory
3. Enable the plugin in Obsidian settings

## Daily Notes Integration

This plugin automatically adds and updates or adds *"todaysThought"* in your daily note's frontmatter. The format will be:

```yaml
---
todaysThought: Some 💭 
---
```

Everyting is pretty much hardcoded, the *daily notes core plugin* can be used to set the format and location of the note, otherwise use the plugin's settings

## Development

1. Clone this repo to your development folder
2. Run `npm i` to install dependencies
3. Run `npm run dev` to start compilation in watch mode
4. Copy over `main.js`, `manifest.json` to your vault's `.obsidian/plugins/obsidian-pomodoro-timer/` directory

## License

MIT