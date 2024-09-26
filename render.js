const { ipcRenderer } = require("electron");

let repoPath = null;
const openDirectoryButton = document.getElementById("open-directory");
const logBox = document.getElementById("log-box");
const refreshLogButton = document.getElementById("refresh-log");
const checkoutCommitButton = document.getElementById("checkout-commit");
const previousCommitButton = document.getElementById("previous-commit");

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
  const previousCommit = commits[1].split(" ")[0]; // Second commit is the previous one
  await ipcRenderer.invoke(
    "git-command",
    `git checkout -f ${previousCommit}`,
    repoPath
  );
  alert(`Checked out to previous commit ${previousCommit}`);
  loadGitLog();
});
