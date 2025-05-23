document.addEventListener('DOMContentLoaded', () => {
  const clipTitleInput = document.getElementById('clipTitle');
  const clippedSentenceEl = document.getElementById('clippedSentence');
  const sourceUrlEl = document.getElementById('sourceUrl');
  const clipDateEl = document.getElementById('clipDate');
  const saveClipButton = document.getElementById('saveClipButton');
  const savedClipsArea = document.getElementById('savedClipsArea');

  // Request data from background.js
  chrome.runtime.sendMessage({ type: "GET_CLIPBOARD_DATA" }, (response) => {
    if (response) {
      if (response.text) {
        clippedSentenceEl.textContent = response.text;
      }
      if (response.url) {
        sourceUrlEl.textContent = response.url;
      }
    }
  });

  // Set current date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  clipDateEl.textContent = `${year}-${month}-${day} ${hours}:${minutes}`;

  // Call loadAndDisplayClips (to be implemented later)
  loadAndDisplayClips();
});

function loadAndDisplayClips() {
  const savedClipsArea = document.getElementById('savedClipsArea');
  savedClipsArea.innerHTML = ''; // Clear previous clips

  chrome.storage.local.get(['clips'], (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error loading clips:", chrome.runtime.lastError);
      return;
    }

    const clips = result.clips;
    if (Array.isArray(clips)) {
      clips.forEach(clip => {
        const clipDiv = document.createElement('div');

        const titleEl = document.createElement('h3');
        titleEl.textContent = clip.title;
        clipDiv.appendChild(titleEl);

        const sentenceEl = document.createElement('p');
        sentenceEl.textContent = clip.sentence;
        clipDiv.appendChild(sentenceEl);

        if (clip.url) {
          const urlEl = document.createElement('a');
          urlEl.href = clip.url;
          urlEl.textContent = 'Source';
          urlEl.target = '_blank'; // Open in new tab
          clipDiv.appendChild(urlEl);
        }

        const dateEl = document.createElement('small');
        dateEl.textContent = ` (Clipped on: ${clip.date})`;
        clipDiv.appendChild(dateEl);

        savedClipsArea.appendChild(clipDiv);
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const clipTitleInput = document.getElementById('clipTitle');
  const clippedSentenceEl = document.getElementById('clippedSentence');
  const sourceUrlEl = document.getElementById('sourceUrl');
  const clipDateEl = document.getElementById('clipDate');
  const saveClipButton = document.getElementById('saveClipButton');
  // const savedClipsArea = document.getElementById('savedClipsArea'); // already got in loadAndDisplayClips

  // Request data from background.js
  chrome.runtime.sendMessage({ type: "GET_CLIPBOARD_DATA" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error getting clipboard data:", chrome.runtime.lastError);
      return;
    }
    if (response) {
      if (response.text) {
        clippedSentenceEl.textContent = response.text;
      }
      if (response.url) {
        sourceUrlEl.textContent = response.url;
      }
    }
  });

  // Set current date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentDate = `${year}-${month}-${day} ${hours}:${minutes}`;
  clipDateEl.textContent = currentDate;

  saveClipButton.addEventListener('click', () => {
    const title = clipTitleInput.value.trim();
    const sentence = clippedSentenceEl.textContent;
    const url = sourceUrlEl.textContent;
    const date = clipDateEl.textContent; // Use the displayed date

    if (!sentence) {
      alert("No sentence selected to save.");
      return;
    }

    const newClip = {
      title: title || 'Untitled',
      sentence,
      url,
      date
    };

    chrome.storage.local.get(['clips'], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting existing clips:", chrome.runtime.lastError);
        return;
      }
      const clips = result.clips || [];
      clips.push(newClip);
      chrome.storage.local.set({ clips: clips }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving clip:", chrome.runtime.lastError);
          return;
        }
        loadAndDisplayClips();
        // Clear inputs after saving
        clipTitleInput.value = '';
        // We might not want to clear sentence and URL if the user wants to save variations.
        // However, for this exercise, let's clear them.
        // clippedSentenceEl.textContent = '';
        // sourceUrlEl.textContent = '';
        // The date will be updated when the popup is next opened or if we add a refresh.
      });
    });
  });

  // Call loadAndDisplayClips
  loadAndDisplayClips();
});
