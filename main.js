const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

let mainWindow;

function checkGitInstalled() {
  return new Promise((resolve, reject) => {
    exec('git --version', (error) => {
      if (error) {
        dialog.showErrorBox(
          'Git Not Found',
          'Git is not installed or not accessible. Please install Git to use this application.'
        );
        app.quit();
        resolve(false);
      }
      resolve(true);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 650,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: "Simple Git",
  });

  mainWindow.loadFile("index.html");
}

app.on("ready", async () => {
  await checkGitInstalled();
  createWindow();
});

// Open a directory and ensure it’s a git repository
ipcMain.handle("open-directory", async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (!result.canceled) {
    const dir = result.filePaths[0];
    if (fs.existsSync(path.join(dir, ".git"))) {
      return dir;
    } else {
      return "NOT_GIT_REPO";
    }
  }
  return null;
});

// Open directory to create repo
ipcMain.handle("open-create-repo-dialog", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
  });
  return result; // Return the dialog result to the renderer process
});

// Execute a git command
ipcMain.handle("git-command", async (event, command, repoPath) => {
  return new Promise((resolve, reject) => {
    exec(`cd "${repoPath}" && ${command}`, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
});
