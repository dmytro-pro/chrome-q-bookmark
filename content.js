const namespace = 'q ';
document.body.addEventListener(`bookmarkEffect-${namespace}`, (event) => {
    const { effect, count } = event.detail;

    const effectDiv = document.createElement("div");
    effectDiv.classList.add("bookmark-effect");

    if (effect === "fire") {
        if (count) {
            effectDiv.textContent = `🔥${namespace}${count}`;
        } else {
            effectDiv.textContent = `✅${namespace}`;
        }
    } else if (effect === "ice") {
        effectDiv.textContent = count > 0 ? `❄️${namespace}${count}` : `✅${namespace}`;
    } else if (effect === "warning") {
        effectDiv.textContent = `⚠️${namespace}`;
    }

    effectDiv.style.top = `${window.innerHeight / 2}px`;
    effectDiv.style.left = `${window.innerWidth / 2}px`;

    document.body.appendChild(effectDiv);
    setTimeout(() => effectDiv.remove(), 300);
});
