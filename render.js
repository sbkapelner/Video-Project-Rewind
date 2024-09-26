const { ipcRenderer } = require("electron");

let repoPath = null;

// Selectors
const openDirectoryButton = document.getElementById("open-directory");
const logBox = document.getElementById("log-box");
const branchBox = document.getElementById("branch-box");
const refreshLogButton = document.getElementById("refresh-log");
const checkoutCommitButton = document.getElementById("checkout-commit");
const checkoutBranchButton = document.getElementById("checkout-branch");
const previousCommitButton = document.getElementById("previous-commit");

// Open directory
openDirectoryButton.addEventListener("click", async () => {
  repoPath = await ipcRenderer.invoke("open-directory");
  if (repoPath === "NOT_GIT_REPO") {
    alert("Selected directory is not a Git repository");
  } else if (repoPath) {
    loadGitLog();
    loadBranches();
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

  // Clear previous log entries
  logBox.innerHTML = "";

  // Populate the log box with options
  log.split("\n").forEach((commit) => {
    if (commit.trim() !== "") {
      // Avoid empty lines
      const option = document.createElement("option");
      option.value = commit.split(" ")[0]; // Use commit hash as value
      option.text = commit;
      logBox.appendChild(option);
    }
  });
}

// Load branches
async function loadBranches() {
  if (!repoPath) return;
  const branches = await ipcRenderer.invoke(
    "git-command",
    "git branch",
    repoPath
  );

  // Clear previous branch entries
  branchBox.innerHTML = "";

  // Populate the branch box with options
  branches.split("\n").forEach((branch) => {
    const branchName = branch.trim();
    if (branchName !== "") {
      // Avoid empty lines
      const option = document.createElement("option");
      option.value = branchName;
      option.text = branchName;
      branchBox.appendChild(option);
    }
  });
}

// Refresh log
refreshLogButton.addEventListener("click", loadGitLog);

// Checkout a commit
checkoutCommitButton.addEventListener("click", async () => {
  const selectedCommit = logBox.value; // Get the selected option's value
  if (selectedCommit) {
    await ipcRenderer.invoke(
      "git-command",
      `git checkout -f ${selectedCommit}`, // No need to split anymore
      repoPath
    );
    alert(`Checked out to commit ${selectedCommit}`);
    loadGitLog();
  }
});

// Checkout a branch
checkoutBranchButton.addEventListener("click", async () => {
  const selectedBranch = branchBox.value; // Get the selected option's value
  if (selectedBranch) {
    await ipcRenderer.invoke(
      "git-command",
      `git checkout -f ${selectedBranch.trim()}`,
      repoPath
    );
    alert(`Checked out to branch ${selectedBranch}`);
    loadBranches();
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
  const currentCommit = commits[0].split(" ")[0]; // First commit is the current one
  const previousCommit = commits[1].split(" ")[0]; // Second commit is the previous one
  await ipcRenderer.invoke(
    "git-command",
    `git checkout -f ${previousCommit}`,
    repoPath
  );
  alert(`Checked out to previous commit ${previousCommit}`);
  loadGitLog();
});

// Get selected text in the log or branch box
function getSelectedText(box) {
  const selection = window.getSelection();
  if (
    selection.rangeCount > 0 &&
    selection.getRangeAt(0).commonAncestorContainer.parentElement === box
  ) {
    return selection.toString();
  }
  return null;
}
