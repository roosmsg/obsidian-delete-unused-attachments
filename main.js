const { Plugin, Notice, Modal, PluginSettingTab, Setting } = require('obsidian');

// Settings class and defaults
class DeleteUnusedAttachmentsSettings {
  moveBannersToRoot = false;
}

// Main plugin
module.exports = class DeleteUnusedAttachmentsPlugin extends Plugin {
  async onload() {
    // Load settings
    this.settings = Object.assign(new DeleteUnusedAttachmentsSettings(), await this.loadData());

    // Register settings tab
    this.addSettingTab(new DeleteUnusedAttachmentsSettingTab(this.app, this));

    this.addCommand({
      id: 'delete-unused-attachments',
      name: 'Delete unused attachments (per folder)',
      callback: () => this.deleteUnusedAttachments(),
    });
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async deleteUnusedAttachments() {
    const vault = this.app.vault;
    const files = vault.getFiles();

    const attachmentExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'svg', 'mp3', 'mp4', 'wav'];

    // Find all attachments in any attachments/ folder (root or subfolders)
    const attachments = files.filter(file =>
      (file.path.startsWith("attachments/") || file.path.match(/\/attachments\//i)) &&
      attachmentExts.includes(file.extension)
    );

    // Map of folder path to sibling notes (not in subfolders)
    const notesByDir = {};
    files.forEach(file => {
      if (file.extension === 'md') {
        const dir = (file.parent.path === "/" ? "/" : file.parent.path || "");
        if (!notesByDir[dir]) notesByDir[dir] = [];
        notesByDir[dir].push(file);
      }
    });

    // Collect unused attachments
    const unused = [];
    for (let att of attachments) {
      // Handle banner* logic based on user setting
      if (this.settings.moveBannersToRoot && att.name.toLowerCase().startsWith("banner")) {
        // If not already in root attachments, move it
        if (!att.path.startsWith("attachments/")) {
          const rootPath = `attachments/${att.name}`;
          // Check if file already exists at target to avoid overwrite
          if (!(await vault.adapter.exists(rootPath))) {
            await vault.rename(att, rootPath);
            new Notice(`Moved ${att.name} to root attachments/ folder.`);
          } else {
            new Notice(`Skipped moving ${att.name} (file exists in root attachments/).`);
          }
        }
        continue; // Always skip further checks for banner* files
      }

      // Legacy skip for banner-image if needed
      if (att.name.toLowerCase().startsWith("banner-image")) {
        continue;
      }

      // Find the parent directory of this attachments folder
      let parentDir;
      if (att.path.startsWith("attachments/")) {
        parentDir = "/";
      } else {
        const match = att.path.match(/^(.*)\/attachments\//i);
        parentDir = (match && typeof match[1] !== "undefined") ? match[1] : "";
      }

      // Find notes to check (explicit for root)
      let notesToCheck;
      if (att.path.startsWith("attachments/")) {
        notesToCheck = notesByDir["/"] || [];
      } else if (parentDir in notesByDir) {
        notesToCheck = notesByDir[parentDir];
      } else {
        unused.push(att);
        continue;
      }

      // Simple, case-insensitive filename match in sibling notes
      let isUsed = false;
      for (let note of notesToCheck) {
        const content = (await vault.read(note)).toLowerCase();
        if (content.includes(att.name.toLowerCase())) {
          isUsed = true;
          break;
        }
      }
      if (!isUsed) unused.push(att);
    }

    // Log unused attachments to the console
    if (unused.length) {
      console.log('[DeleteUnusedAttachments] Unused files:', unused.map(f => f.path));
    }

    if (unused.length === 0) {
      new Notice('No unused attachments found!');
      return;
    }

    // Confirmation dialog (does NOT show the names/paths)
    const confirm = await this.confirmModal(
      `Delete ${unused.length} unused attachment${unused.length > 1 ? 's' : ''} from attachments/?`
    );
    if (!confirm) return;

    for (let att of unused) {
      await vault.trash(att, true);
    }
    new Notice(`Deleted ${unused.length} unused attachment${unused.length > 1 ? 's' : ''} from attachments/.`);
  }

  async confirmModal(text) {
    return new Promise((resolve) => {
      const modal = new Modal(this.app);
      modal.titleEl.setText('Delete Unused Attachments');
      modal.contentEl.createEl('p', { text });
      modal.contentEl.createEl('p', { text: 'Are you sure? This cannot be undone!' });
      const btns = modal.contentEl.createDiv({ cls: 'modal-button-container' });
      const yes = btns.createEl('button', { text: 'Yes, delete' });
      const no = btns.createEl('button', { text: 'Cancel' });
      yes.onclick = () => { modal.close(); resolve(true); };
      no.onclick = () => { modal.close(); resolve(false); };
      modal.open();
    });
  }
};

// Settings tab
class DeleteUnusedAttachmentsSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Delete Unused Attachments Settings" });

    new Setting(containerEl)
      .setName('Move banner images to root attachments')
      .setDesc('If enabled, files starting with "banner" will go to the root attachments instead of per-folder attachments.')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.moveBannersToRoot)
          .onChange(async (value) => {
            this.plugin.settings.moveBannersToRoot = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
