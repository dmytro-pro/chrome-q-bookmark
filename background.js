let lastCommandTime = 0; // Debounce timing
let lastUpdateTime = 0; // Debounce for bookmark updates

chrome.commands.onCommand.addListener((command) => {
    const now = Date.now();

    // Debounce to prevent double execution
    if (now - lastCommandTime < 300) return;
    lastCommandTime = now;

    if (command === "prepend-emoji") {
        handleBookmark(addOneFire, "fire"); // Add one 🔥
    } else if (command === "remove-emoji") {
        handleBookmark(removeOneFire, "ice", true); // Remove one 🔥 or warn
    }
});

// Process bookmark updates
function handleBookmark(transformTitle, effect, warnIfNone = false) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab) {
            // First, check if [q] folder exists in bookmarks bar
            chrome.bookmarks.search({ title: "[q]" }, (results) => {
                const bookmarksBar = "1"; // Chrome's bookmark bar ID
                let qFolder = results.find(b => b.parentId === bookmarksBar);

                const processBookmark = (qFolderId) => {
                    // Search for bookmark in [q] folder
                    chrome.bookmarks.search({ url: tab.url }, (results) => {
                        const bookmark = results.find(b => b.parentId === qFolderId);
                        if (bookmark) {
                            const originalTitle = bookmark.title.trim();
                            const newTitle = transformTitle(originalTitle);

                            // Check if there are any fire emojis in the original title
                            const originalMatch = originalTitle.match(/^(🔥+)?(.*)/);
                            const originalFires = originalMatch && originalMatch[1] ? originalMatch[1].length : 0;

                            if (effect === "ice" && originalFires <= 1) {
                                // Remove bookmark if this was the last fire
                                const now = Date.now();
                                if (now - lastUpdateTime < 300) return;
                                lastUpdateTime = now;

                                chrome.bookmarks.remove(bookmark.id, () => {
                                    sendEffectToTab(effect, 0);
                                });
                                return;
                            }

                            if (newTitle === originalTitle && warnIfNone) {
                                sendEffectToTab("warning", originalFires);
                            } else {
                                // Update bookmark title with debounce
                                const now = Date.now();
                                if (now - lastUpdateTime < 300) return;
                                lastUpdateTime = now;

                                chrome.bookmarks.update(bookmark.id, { title: newTitle }, () => {
                                    const updatedCount = (newTitle.match(/🔥/g) || []).length;
                                    sendEffectToTab(effect, updatedCount);
                                });
                            }
                        } else if (effect === "fire") {
                            // Create new bookmark in [q] folder
                            const now = Date.now();
                            if (now - lastUpdateTime < 300) return;
                            lastUpdateTime = now;

                            const newTitle = addNoFire(tab.title);
                            chrome.bookmarks.create({
                                parentId: qFolderId,
                                title: newTitle,
                                url: tab.url
                            }, (newBookmark) => {
                                const fireCount = (newBookmark.title.match(/🔥/g) || []).length;
                                sendEffectToTab(effect, fireCount);
                            });
                        } else {
                            sendEffectToTab("warning");
                        }
                    });
                };

                if (qFolder) {
                    processBookmark(qFolder.id);
                } else {
                    // Create [q] folder if it doesn't exist
                    chrome.bookmarks.create({
                        parentId: bookmarksBar,
                        title: "[q]"
                    }, (newFolder) => {
                        processBookmark(newFolder.id);
                    });
                }
            });
        }
    });
}

// no fire for the first time
function addNoFire(title) {
    return title;
}

// Add ONE 🔥 emoji
function addOneFire(title) {
    const match = title.match(/^(🔥+)?(.*)/); // Match fires and text
    const fires = match[1] ? match[1].length : 1; // Count existing fires
    const rest = match[2] ? match[2].trim() : ""; // Extract the rest

    return "🔥".repeat(fires) + (rest ? " " + rest : ""); // Add exactly ONE 🔥
}

// Remove ONE 🔥 emoji
function removeOneFire(title) {
    const match = title.match(/^(🔥+)?(.*)/); // Match fires and text
    const fires = match[1] ? match[1].length : 0; // Count existing fires
    const rest = match[2] ? match[2].trim() : ""; // Extract the rest

    if (fires > 1) {
        return "🔥".repeat(fires-2) + rest; // Remove ONE 🔥
    }
    return rest; // No fires left—return plain title
}

// Send visual effect
function sendEffectToTab(effect, count = "") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (effect, count) => {
                    document.body.dispatchEvent(
                        new CustomEvent("bookmarkEffect", { detail: { effect, count } })
                    );
                },
                args: [effect, count]
            });
        }
    });
}
