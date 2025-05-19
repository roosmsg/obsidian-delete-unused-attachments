# Delete Unused Attachments

**Keep your Obsidian vault clutter-free by automatically deleting attachments that are no longer referenced in your notes.**

## What does it do?

This plugin scans all your `attachments/` folders—both in the vault root and in any subfolder—and finds files (like images and media) that aren’t mentioned in any notes in the same folder. With one command, you can review and remove all these unused attachments.

- **Works for all `attachments/` folders** – root and subfolders.
- **Skips banner images** – any file starting with `banner-image` will never be deleted.
- **Only checks sibling notes** – attachments are considered "used" if their filename appears in any note in the same folder as the `attachments/` folder.
- **Preview before delete** – unused files are listed in the developer console for your review before you confirm deletion.

## How to use

1. Enable the plugin in Obsidian.
2. Run the “Delete unused attachments (per folder)” command from the command palette.
3. Check the console (`Ctrl+Shift+I` → Console tab) to see which files will be deleted.
4. Confirm in the dialog to move those files to Obsidian’s trash.

## Why use this plugin?

Obsidian can easily collect unused screenshots and media over time. This plugin helps you keep things organized by safely removing any attachments you don’t actually use, while never touching banner images you want to keep.
