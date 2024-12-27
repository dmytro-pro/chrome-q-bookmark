let lastCommandTime = 0; // Debounce timing

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
                            const fires = (newTitle.match(/🔥/g) || []).length;

                            if (newTitle === originalTitle && warnIfNone) {
                                sendEffectToTab("warning", fires);
                            } else if (fires === 0) {
                                // Remove bookmark if no fires left
                                chrome.bookmarks.remove(bookmark.id, () => {
                                    sendEffectToTab(effect, 0);
                                });
                            } else {
                                // Update bookmark title
                                chrome.bookmarks.update(bookmark.id, { title: newTitle }, () => {
                                    setTimeout(() => {
                                        chrome.bookmarks.get(bookmark.id, (updated) => {
                                            const updatedCount = (updated[0].title.match(/🔥/g) || []).length;
                                            sendEffectToTab(effect, updatedCount);
                                        });
                                    }, 100);
                                });
                            }
                        } else if (effect === "fire") {
                            // Create new bookmark in [q] folder
                            const newTitle = transformTitle(tab.title);
                            chrome.bookmarks.create({
                                parentId: qFolderId,
                                title: newTitle,
                                url: tab.url
                            }, () => {
                                const fireCount = (newTitle.match(/🔥/g) || []).length;
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

// Add ONE 🔥 emoji
function addOneFire(title) {
    const match = title.match(/^(🔥+)?(.*)/); // Match fires and text
    const fires = match[1] ? match[1].length : 1; // Count existing fires, or add one!
    const rest = match[2] ? match[2].trim() : ""; // Extract the rest

    return "🔥".repeat(fires) + rest; // Add exactly ONE 🔥
}

// Remove ONE 🔥 emoji
function removeOneFire(title) {
    const match = title.match(/^(🔥+)?(.*)/); // Match fires and text
    const fires = match[1] ? match[1].length : 0; // Count existing fires
    const rest = match[2] ? match[2].trim() : ""; // Extract the rest

    if (fires > 1) {
        return "🔥".repeat(fires-1) + rest; // Remove ONE 🔥
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
