"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { Cmd } from "swag-engine";
import * as fs from "fs";
import { showStatus } from "./ui";
import * as path from "path";
import { Definition } from "swag-engine/src/define";

function wait(ttl = 10 * 60) {
  return new Promise(resolve => {
    setTimeout(resolve, ttl * 1000);
  });
}

async function polling(updateTask) {
  while (true) {
    try {
      await updateTask();
    } catch (e) {}
    await wait();
  }
}

async function getConfigPath() {
  const results = await vscode.workspace.findFiles("**/swag-config.json");

  if (results && results.length) {
    return results[0].fsPath;
  }

  return "";
}

let cmd: Cmd = null;

let mainBar;
let modBar;
let boBar;
let updateBar;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "swag" is now active!');

  try {
    const configPath = await getConfigPath();
    if (configPath) {
      cmd = new Cmd(path.join(configPath, ".."), require(configPath));
    } else {
      return;
    }
    await cmd.ready();

    vscode.commands.registerCommand("extension.updateRemote", updateRemote);
    vscode.commands.registerCommand("extension.updateAll", updateAll);
    vscode.commands.registerCommand("extension.updateBos", updateBos);
    vscode.commands.registerCommand("extension.updateMods", updateMods);

    modBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    modBar.command = "extension.updateMods";
    boBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    boBar.command = "extension.updateBos";
    mainBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    mainBar.command = "extension.updateAll";

    updateBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    updateBar.command = "extension.updateRemote";

    // 请求到服务器已经发布，则重新计算最新文档和最新不同的项目。
    polling(updateRemote);
  } catch (e) {
    if (e instanceof SyntaxError) {
      vscode.window.showErrorMessage(
        "请检查 swag.lock 文件是否合法," + e.message
      );
    } else {
      vscode.window.showErrorMessage(e.message);
    }
  }
}

export async function updateRemote() {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window
    },
    async p => {
      p.report({
        message: "远程同步中..."
      });

      try {
        await cmd.ready();
        await cmd.syncNew();

        p.report({
          message: "同步成功！"
        });
        p.report({
          message: "差异比对中..."
        });
        cmd.diff();

        p.report({ message: "同步完成！" });
        showStatus(mainBar, modBar, boBar, updateBar, cmd.diffs);
      } catch (e) {
        vscode.window.showErrorMessage(e.message);
      }
    }
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}

export function updateMods() {
  const modDiffs = cmd.diffs.modDiffs;

  const items = modDiffs.map(item => {
    return {
      label: item.name,
      description: item.description,
      detail: `${item.details[0]}等 ${item.details.length} 条更新`
    } as vscode.QuickPickItem;
  });

  vscode.window.showQuickPick(items).then(
    thenItems => {
      if (!thenItems) {
        return;
      }
      console.log(modDiffs.find(mod => mod.name === thenItems.label));
      // const names = cmd.newDataStructure.mods.map(mod => mod.name);
      // 从新的数据源中找到该模块
      let mod = cmd.newDataStructure.mods.find(
        iMod => iMod.name === thenItems.label
      );

      vscode.window.withProgress(
        { location: vscode.ProgressLocation.Window, title: "hello" },
        p => {
          return new Promise(async (resolve, reject) => {
            try {
              p.report({ message: "开始更新..." });

              // 如模块不存在，表示删除
              if (!mod) {
                mod = cmd.dataStructure.mods.find(
                  iMod => iMod.name === thenItems.label
                );

                cmd.dataStructure.deleteMode(mod, info => {
                  p.report({ message: info });
                });
              } else {
                cmd.updateMod(mod, info => {
                  p.report({ message: info });
                });
              }

              await cmd.write();
              cmd.save();
              p.report({ message: "更新成功！" });
              vscode.window.showInformationMessage(mod.name + "更新成功!");
              cmd.diff();
              showStatus(mainBar, modBar, boBar, updateBar, cmd.diffs);
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        }
      );
    },
    e => {}
  );
}

export function updateBos() {
  const boDiffs = cmd.diffs.boDiffs;
  const items = boDiffs.map(item => {
    const hasInf = item.indirectModInfs && item.indirectModInfs.length;
    let detail = "";

    if (hasInf) {
      detail = `影响模块：${item.indirectModInfs
        .map(inf => inf.name)
        .join(",")}`;
    }

    return {
      label: item.name,
      description: item.description,
      detail
    } as vscode.QuickPickItem;
  });

  vscode.window.showQuickPick(items).then(
    item => {
      if (!item) {
        return;
      }

      let bo = boDiffs.find(bo => item.label === bo.name);

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window
        },
        p => {
          return new Promise(async (resolve, reject) => {
            try {
              p.report({ message: "开始更新..." });

              if (!bo) {
                bo = cmd.dataStructure.definitions.find(
                  iDef => iDef.name === item.label
                ) as any;

                cmd.dataStructure.deleteDefinition(bo, info => {
                  p.report({ message: info });
                });
              } else {
                const { properties, name, description } = bo;

                cmd.updateDef(
                  { properties, name, description } as Definition,
                  info => {
                    p.report({ message: info });
                  }
                );
              }
              await cmd.write();
              cmd.save();
              p.report({ message: "更新成功！" });
              vscode.window.showInformationMessage(bo.name + "更新成功!");
              cmd.diff();
              showStatus(mainBar, modBar, boBar, updateBar, cmd.diffs);
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        }
      );
    },
    e => {}
  );
}

export function updateAll() {
  cmd.dataStructure = cmd.newDataStructure;
  debugger;
  console.log(cmd.newDataStructure);

  vscode.window.showInformationMessage("确定全量更新所有接口吗？", "确定").then(
    text => {
      if (!text) {
        return;
      }

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window
        },
        p => {
          return new Promise(async (resolve, reject) => {
            try {
              p.report({ message: "开始更新..." });
              await cmd.write();
              cmd.save();
              p.report({ message: "更新成功！" });
              vscode.window.showInformationMessage("更新成功!");
              cmd.diff();
              showStatus(mainBar, modBar, boBar, updateBar, cmd.diffs);
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        }
      );
    },
    e => {}
  );
}
