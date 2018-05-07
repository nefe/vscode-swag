import * as vscode from "vscode";

export function showStatus(
	mainBar: vscode.StatusBarItem,
	modBar: vscode.StatusBarItem,
	boBar: vscode.StatusBarItem,
	updateBar: vscode.StatusBarItem,
	diffs
) {
	const { modDiffs, boDiffs } = diffs;

	updateBar.color = "yellow";
	updateBar.text = '同步';
	updateBar.show();

	if (!boDiffs.length && !modDiffs.length) {
		mainBar.text = "swag(same)";
		mainBar.color = "white";
		mainBar.show();
	} else {
		mainBar.text = "swag";
		mainBar.color = "yellow";
		mainBar.show();
	}

	if (modDiffs && modDiffs.length) {
		modBar.text = `模块(${modDiffs.length})`;
		modBar.show();
		modBar.color = "yellow";
	} else {
		modBar.text = "";
		modBar.color = "white";
		modBar.hide();
	}

	if (boDiffs && boDiffs.length) {
		boBar.text = `基类(${boDiffs.length})`;
		boBar.show();
		boBar.color = "yellow";
	} else {
		boBar.text = "";
		boBar.color = "white";
		boBar.hide();
	}
}
