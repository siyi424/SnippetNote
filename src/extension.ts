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

      // 选择文件后立即弹出输入窗口
      showInputPanel();
    }
  });

  context.subscriptions.push(selectFileDisposable);

  let addNoteDisposable = vscode.commands.registerCommand('snippetnote.addNote', async function () {
    if (!selectedMarkdownFile) {
      vscode.commands.executeCommand('snippetnote.selectFile');
      return;
    }

    showInputPanel();
  });

  context.subscriptions.push(addNoteDisposable);
}

function showInputPanel() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const selection = editor.selection;
  const text = editor.document.getText(selection);

  // 创建和显示 Webview
  const panel = vscode.window.createWebviewPanel(
    'snippetNoteInput',
    'Snippet Note Input',
    vscode.ViewColumn.Two,
    {
      enableScripts: true
    }
  );

  panel.webview.html = getWebviewContent();

  // 处理 Webview 消息
  panel.webview.onDidReceiveMessage(async message => {
    if (message.command === 'submit') {
      const { title, copilotContent } = message;

      if (!title || !copilotContent) {
        vscode.window.showErrorMessage('Title and Copilot content are required.');
        return;
      }

      // 读取或创建 Markdown 文件
      let fileContent = '';
      if (selectedMarkdownFile) {
        if (fs.existsSync(selectedMarkdownFile)) {
          fileContent = fs.readFileSync(selectedMarkdownFile, 'utf8');
        } else {
          fs.writeFileSync(selectedMarkdownFile, '');
        }

        // 计算当前文件中的一级标题数量
        const headingCount = (fileContent.match(/^#\s/gm) || []).length + 1;
        const numberedTitle = `# ${headingCount}. ${title}`;

        const noteContent = `${numberedTitle}\n\n## Code\n\n\`\`\`javascript\n${text}\n\`\`\`\n\n## Explanation\n\n${copilotContent}\n\n`;

        fs.writeFileSync(selectedMarkdownFile, fileContent + noteContent);
      } else {
        vscode.window.showErrorMessage('No Markdown file selected.');
      }

      vscode.window.showInformationMessage('Snippet note added!');
      panel.dispose();
    }
  });
}

function getWebviewContent() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Snippet Note Input</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 10px;
        }
        input, textarea {
          width: 100%;
          margin-bottom: 10px;
        }
        textarea {
          height: 200px;
        }
      </style>
    </head>
    <body>
      <h1>Snippet Note Input</h1>
      <form id="inputForm">
        <label for="title">Title:</label>
        <input type="text" id="title" name="title" required>
        <label for="copilotContent">Copilot Content:</label>
        <textarea id="copilotContent" name="copilotContent" required></textarea>
        <button type="submit">Submit</button>
      </form>
      <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('inputForm').addEventListener('submit', (e) => {
          e.preventDefault();
          const title = document.getElementById('title').value;
          const copilotContent = document.getElementById('copilotContent').value;
          vscode.postMessage({
            command: 'submit',
            title,
            copilotContent
          });
        });
      </script>
    </body>
    </html>
  `;
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}