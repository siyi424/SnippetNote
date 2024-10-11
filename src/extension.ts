import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let selectedMarkdownFile: string | undefined;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
  // 创建状态栏项
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'snippetnote.selectFile';
  context.subscriptions.push(statusBarItem);

  // 注册选择文件的命令
  let selectFileDisposable = vscode.commands.registerCommand('snippetnote.selectFile', async function () {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      const rootPath = workspaceFolders[0].uri.fsPath;
      const markdownFiles = fs.readdirSync(rootPath).filter(file => file.endsWith('.md'));

      if (markdownFiles.length === 0) {
        vscode.window.showErrorMessage('No Markdown files found in the root directory.');
        return;
      }

      const selectedFile = await vscode.window.showQuickPick(markdownFiles, {
        placeHolder: 'Select a Markdown file to add notes to'
      });

      if (!selectedFile) {
        return;
      }

      selectedMarkdownFile = path.join(rootPath, selectedFile);
      statusBarItem.text = `$(file-text) ${selectedFile}`;
      statusBarItem.show();
      vscode.window.showInformationMessage(`Selected file: ${selectedFile}`);
    }
  });

  context.subscriptions.push(selectFileDisposable);

  let addNoteDisposable = vscode.commands.registerCommand('snippetnote.addNote', async function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);

    // 如果没有选中的 Markdown 文件，提示用户选择
    if (!selectedMarkdownFile) {
      vscode.commands.executeCommand('snippetnote.selectFile');
      return;
    }

    // 获取用户输入的标题
    const title = await vscode.window.showInputBox({ prompt: 'Enter the title for this snippet' });
    if (!title) {
      return;
    }

    // 读取或创建 Markdown 文件
    let fileContent = '';
    if (fs.existsSync(selectedMarkdownFile)) {
      fileContent = fs.readFileSync(selectedMarkdownFile, 'utf8');
    } else {
      fs.writeFileSync(selectedMarkdownFile, '# Snippet Notes\n\n');
    }

    const snippetCount = (fileContent.match(/^#/gm) || []).length + 1;
    const noteContent = `# ${snippetCount}. ${title}\n\n## Code\n\n\`\`\`javascript\n${text}\n\`\`\`\n\n## Explanation\n\n[Paste your Copilot explanation here]\n\n`;

    fs.writeFileSync(selectedMarkdownFile, fileContent + noteContent);

    vscode.window.showInformationMessage('Snippet note added!');
  });

  context.subscriptions.push(addNoteDisposable);
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
