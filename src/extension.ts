import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

async function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('snippetNote.addNote', async function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);

    // 调用 Copilot 插件进行解释
    const explanation = await getCopilotExplanation(text);

    // 获取用户输入的标题
    const title = await vscode.window.showInputBox({ prompt: 'Enter the title for this snippet' });
    if (!title) {
      return;
    }

    // 生成或更新 Markdown 文件
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      const rootPath = workspaceFolders[0].uri.fsPath;
      const filePath = path.join(rootPath, 'SnippetNotes.md');
      let fileContent = '';

      if (fs.existsSync(filePath)) {
        fileContent = fs.readFileSync(filePath, 'utf8');
      }

      const snippetCount = (fileContent.match(/^#/gm) || []).length + 1;
      const formattedCode = formatCodeForMarkdown(text);
      const noteContent = `# ${snippetCount}. ${title}\n\n## Code\n\n\`\`\`javascript\n${formattedCode}\n\`\`\`\n\n## Explanation\n\n${explanation}\n\n`;

      fs.writeFileSync(filePath, fileContent + noteContent);

      vscode.window.showInformationMessage('Snippet note added!');
    }
  });

  context.subscriptions.push(disposable);
}

async function getCopilotExplanation(code: string): Promise<string> {
  // 这里需要调用 Copilot 插件的 API 获取解释
  // 由于 Copilot 插件的 API 目前不可用，这里用一个模拟的解释代替
  return "This is a simulated explanation from Copilot.";
}

function formatCodeForMarkdown(code: string): string {
  // 将代码片段格式化为适合 Markdown 的格式，确保不会超出 A4 纸的宽度
  const maxLineLength = 80; // 假设 A4 纸的宽度为 80 个字符
  const lines = code.split('\n');
  const formattedLines = lines.map(line => {
    if (line.length > maxLineLength) {
      const regex = new RegExp(`(.{1,${maxLineLength}})`, 'g');
      const matches = line.match(regex);
      return matches ? matches.join('\n') : line;
    }
    return line;
  });
  return formattedLines.join('\n');
}

export function deactivate() {}

module.exports = {
  activate,
  deactivate
};
