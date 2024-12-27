let isProcessing = false; // Prevent double execution

chrome.commands.onCommand.addListener(async (command) => {
    if (isProcessing) return; // Block double execution
    isProcessing = true; // Lock execution

    try {
        if (command === "prepend-emoji") {
            await handleBookmark(addFire, "fire"); // Add 🔥
        } else if (command === "remove-emoji") {
            await handleBookmark(removeFire, "ice", true); // Remove 🔥
        }
    } finally {
        isProcessing = false; // Unlock
    }
});

// Find or create [q] folder
async function getOrCreateFolder() {
    const folders = await chrome.bookmarks.search({ title: "[q]" });
    for (const folder of folders) {
        if (folder.parentId === "1") return folder; // Found in Bookmarks Bar (ID 1)
    }
    // Create folder in Bookmarks Bar if not found
    return await chrome.bookmarks.create({
        parentId: "1",
        title: "[q]"
    });
}

// Handle bookmarks in [q] folder
async function handleBookmark(modifyFn, effect, warnIfNone = false) {
    const folder = await getOrCreateFolder(); // Ensure [q] exists
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        showEffect("warning");
        return;
    }

    // Find bookmark in the [q] folder
    const bookmarks = await chrome.bookmarks.search({ url: tab.url });
    let bookmark = bookmarks.find(b => b.parentId === folder.id);

    if (!bookmark && effect === "ice") {
        showEffect("warning"); // Can't remove if it doesn't exist
        return;
    }

    if (!bookmark && effect === "fire") {
        // Add bookmark if not found
        bookmark = await chrome.bookmarks.create({
            parentId: folder.id,
            title: tab.title, // Start with original title
            url: tab.url
        });
    }

    const originalTitle = bookmark.title || "";
    const newTitle = modifyFn(originalTitle);

    // Update or delete based on count
    const fireCount = (newTitle.match(/🔥/g) || []).length;
    if (fireCount > 0) {
        await chrome.bookmarks.update(bookmark.id, { title: newTitle }); // Update title
        showEffect(effect, fireCount);
    } else {
        await chrome.bookmarks.remove(bookmark.id); // Remove bookmark if no 🔥
        showEffect("ice", 0); // Show ❄️ effect
    }
}

// Add one 🔥
function addFire(title) {
    const match = title.match(/^(🔥*)(.*)$/) || ["", "", ""];
    const fires = match[1]; // Current fires
    const rest = match[2]; // Original title
    return "🔥".repeat(fires.length + 1) + rest; // Add 1 fire
}

// Remove one 🔥
function removeFire(title) {
    const match = title.match(/^(🔥*)(.*)$/) || ["", "", ""];
    const fires = match[1]; // Current fires
    const rest = match[2]; // Original title

    if (fires.length > 1) {
        return "🔥".repeat(fires.length - 1) + rest; // Remove 1 fire
    }
    return rest; // Remove all fires
}

// Show effects (fire, ice, or warning)
function showEffect(effect, count = "") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (effect, count) => {
                    document.querySelectorAll(".bookmark-effect").forEach(e => e.remove());

                    const div = document.createElement("div");
                    div.classList.add("bookmark-effect");
                    div.textContent = effect === "fire" ? `🔥${count}` :
                        effect === "ice" ? (count > 0 ? `🔥${count}` : "❄️") :
                            "⚠️";
                    document.body.appendChild(div);

                    setTimeout(() => div.remove(), 300); // Clear effect
                },
                args: [effect, count]
            });
        }
    });
}
