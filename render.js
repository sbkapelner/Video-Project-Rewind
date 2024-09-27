const { ipcRenderer } = require("electron");
const { exec } = require("child_process");
const { dialog } = require("electron");

let repoPath = null;
const openDirectoryButton = document.getElementById("open-directory");
const logBox = document.getElementById("log-box");
const refreshLogButton = document.getElementById("refresh-log");
const checkoutCommitButton = document.getElementById("checkout-commit");
const previousCommitButton = document.getElementById("previous-commit");

//Function to check if git is installed
function checkGitInstalled() {
  exec("git --version", (error, stdout, stderr) => {
    if (error) {
      console.log("Git is not installed.");
      dialog
        .showMessageBox({
          type: "warning",
          buttons: ["Install Git", "Cancel"],
          title: "Git Not Found",
          message:
            "Git is required to use this application. Do you want to install Git?",
        })
        .then((response) => {
          if (response.response === 0) {
            // User clicked 'Install Git'
            installGit();
          }
        });
    } else {
      console.log("Git is installed: " + stdout);
    }
  });
}

//Function to install git
function installGit() {
  // For Windows, you can trigger the Git installer
  if (process.platform === "win32") {
    alert("Download Git at https://git-scm.com/downloads");
  }

  // For macOS
  if (process.platform === "darwin") {
    exec("xcode-select --install", (error) => {
      if (error) {
        console.log("Failed to install Git via xcode command line tools");
        alert(
          "Faild to install Git. Visit https://git-scm.com/downloads/mac to download Git manually."
        );
      }
    });
  }
}

checkGitInstalled();

// Function to handle item selection
function handleItemClick(event, boxId) {
  const selectedItem = event.target;
  // Remove 'selected' class from previously selected items
  const box = document.getElementById(boxId);
  const previousSelected = box.querySelector(".selected");
  if (previousSelected) {
    previousSelected.classList.remove("selected");
  }

  // Add 'selected' class to the clicked item
  selectedItem.classList.add("selected");
}

const currentCommitTextbox = document.getElementById("current-commit");

// Function to update the current commit text box
async function updateCurrentCommit() {
  if (!repoPath) return;

  try {
    const currentCommit = await ipcRenderer.invoke(
      "git-command",
      "git rev-parse HEAD", // Get the current commit ID
      repoPath
    );
    currentCommitTextbox.textContent = currentCommit.trim().substring(0, 7);
  } catch (error) {
    currentCommitTextbox.value = "Error getting commit ID";
    console.error("Error getting current commit:", error);
  }
}

// Open directory
openDirectoryButton.addEventListener("click", async () => {
  repoPath = await ipcRenderer.invoke("open-directory");
  if (repoPath === "NOT_GIT_REPO") {
    alert("Selected directory is not a Git repository");
  } else if (repoPath) {
    loadGitLog();
    updateCurrentCommit();
  }
});

// Load git log
async function loadGitLog() {
  if (!repoPath) return;
  const log = await ipcRenderer.invoke(
    "git-command",
    "git log --all --oneline",
    repoPath
  );

  logBox.innerHTML = ""; // Clear previous entries

  log.split("\n").forEach((commit) => {
    if (commit.trim() !== "") {
      const commitDiv = document.createElement("div");
      commitDiv.textContent = commit;
      commitDiv.classList.add("list-item");
      commitDiv.addEventListener("click", (event) =>
        handleItemClick(event, "log-box")
      );
      logBox.appendChild(commitDiv);
    }
  });
  updateCurrentCommit();
}

// Refresh log
refreshLogButton.addEventListener("click", loadGitLog);

// Checkout a commit
checkoutCommitButton.addEventListener("click", async () => {
  const selectedCommitEl = logBox.querySelector(".selected");
  if (selectedCommitEl) {
    const selectedCommit = selectedCommitEl.textContent.split(" ")[0]; // Get commit hash
    await ipcRenderer.invoke(
      "git-command",
      `git checkout -f ${selectedCommit}`,
      repoPath
    );
    alert(`Checked out to commit ${selectedCommit}`);
    loadGitLog(); // Refresh the log to reflect the checkout
    updateCurrentCommit();
  } else {
    alert("Please select a commit to checkout.");
  }
});

// Go to previous commit
previousCommitButton.addEventListener("click", async () => {
  const log = await ipcRenderer.invoke(
    "git-command",
    "git log --oneline",
    repoPath
  );
  const commits = log.split("\n");
  const previousCommit = commits[0].split(" ")[0]; // Second commit is the previous one
  await ipcRenderer.invoke("git-command", `git reset --hard`, repoPath);
  alert(`Reverted to ${previousCommit}`);
  loadGitLog();
  updateCurrentCommit();
});

// Create repo button
const createRepoButton = document.getElementById("create-repo");
createRepoButton.addEventListener("click", async () => {
  const result = await ipcRenderer.invoke("open-create-repo-dialog");

  if (!result.canceled) {
    const newRepoPath = result.filePaths[0];
    try {
      await ipcRenderer.invoke("git-command", `git init`, newRepoPath); // Initialize the repo
      alert(`Git repository created at: ${newRepoPath}`);
      // You might want to automatically open the newly created repo:
      repoPath = newRepoPath;
      loadGitLog();
    } catch (error) {
      alert(`Error creating repository: ${error}`);
    }
  }
});

//New commit button
const commitMessageInput = document.getElementById("commit-message");
const commitButton = document.getElementById("commit-button");

commitButton.addEventListener("click", async () => {
  const commitMessage = commitMessageInput.value.trim();

  if (commitMessage === "") {
    alert("Please enter a commit message.");
    return;
  }

  try {
    await ipcRenderer.invoke("git-command", "git add .", repoPath);
    await ipcRenderer.invoke(
      "git-command",
      `git stash && git checkout main && git stash pop && git add . && git commit -m "${commitMessage}"`,
      repoPath
    );
    alert(`Committed changes with message: "${commitMessage}"`);
    loadGitLog(); // Refresh the log to show the new commit
    commitMessageInput.value = ""; // Clear the input field
    updateCurrentCommit();
  } catch (error) {
    alert(`Error committing changes: ${error}`);
  }
});
