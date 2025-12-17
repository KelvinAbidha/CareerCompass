
let logs = [];
let weeklyActivities = [];

// DOM Elements
const logForm = document.getElementById('log-form');
const logDate = document.getElementById('log-date');
const logTitle = document.getElementById('log-title');
const logDescription = document.getElementById('log-description');
const charCount = document.getElementById('char-count');
const maxChars = 280;

logDescription.addEventListener('input', () => {
    const remaining = maxChars - logDescription.value.length;
    charCount.textContent = `${remaining} characters remaining`;
});
const logImageUrl = document.getElementById('log-image-url');
const imagePreview = document.getElementById('image-preview');

logImageUrl.addEventListener('input', () => {
    if (logImageUrl.value) {
        imagePreview.src = logImageUrl.value;
        imagePreview.style.display = 'block';
    } else {
        imagePreview.style.display = 'none';
    }
});
const logTags = document.getElementById('log-tags');
const logsList = document.getElementById('logs-list');
const generatePostBtn = document.getElementById('generate-post-btn');
const searchBar = document.getElementById('search-bar');
const sortBy = document.getElementById('sort-by');
const startDate = document.getElementById('start-date');
const endDate = document.getElementById('end-date');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const filterByTag = document.getElementById('filter-by-tag');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');

let currentPage = 1;
const logsPerPage = 5;

// Fetch initial data
document.addEventListener('DOMContentLoaded', () => {
    fetchLogs();
});


async function fetchLogs() {
    try {
        const response = await fetch('/api/logs');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        logs = await response.json();
        console.log("Logs loaded:", logs);
        renderWeeklyActivities(logs);
    } catch (error) {
        console.error("Failed to fetch logs:", error);
        alert("Failed to load logs. Is the server running? Please check the console for more details.");
    }
}


function getWeekStart() {
    const today = new Date();
    const day = today.getDay(); // 0 (Sunday) to 6 (Saturday)
    const diff = today.getDate() - day;
    const weekStart = new Date(today);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
}

function getWeekEnd() {
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
}

async function deleteLog(logId) {
    if (confirm('Are you sure you want to delete this log?')) {
        try {
            const response = await fetch(`/api/logs/${logId}`, { method: 'DELETE' });
             if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            console.log("Document with ID: ", logId, " deleted");
            fetchLogs(); // Refresh logs
        } catch (e) {
            console.error("Error deleting document: ", e);
        }
    }
}

function renderWeeklyActivities(logsToRender, sortByValue, startDateValue, endDateValue, tagFilter) {
    let weeklyActivities = logsToRender;

    if (tagFilter) {
        weeklyActivities = weeklyActivities.filter(log => log.tags && log.tags.includes(tagFilter));
    }

    if (startDateValue && endDateValue) {
        const start = new Date(startDateValue);
        const end = new Date(endDateValue);
        end.setHours(23, 59, 59, 999);

        weeklyActivities = weeklyActivities.filter(log => {
            if (!log.timestamp) {
                return false;
            }
            const logDate = new Date(log.timestamp);
            return logDate >= start && logDate <= end;
        });
    } else {
        const weekStart = getWeekStart();
        const weekEnd = getWeekEnd();

        weeklyActivities = weeklyActivities.filter(log => {
            if (!log.timestamp) {
                return false;
            }
            const logDate = new Date(log.timestamp);
            return logDate >= weekStart && logDate <= weekEnd;
        });
    }

    if (sortByValue === 'date') {
        weeklyActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (sortByValue === 'title') {
        weeklyActivities.sort((a, b) => a.title.localeCompare(b.title));
    }

    const indexOfLastLog = currentPage * logsPerPage;
    const indexOfFirstLog = indexOfLastLog - logsPerPage;
    const currentLogs = weeklyActivities.slice(indexOfFirstLog, indexOfLastLog);

    logsList.innerHTML = '';
    currentLogs.forEach(log => {
        const logElement = document.createElement('div');
        logElement.classList.add('p-6', 'mb-4', 'bg-white', 'rounded-lg', 'shadow-md', 'hover:shadow-lg', 'transition-shadow', 'duration-200');
        logElement.setAttribute('data-id', log.id);

        const description = log.description;
        const shortDescription = description.length > 100 ? `${description.substring(0, 100)}...` : description;

        logElement.innerHTML = `
            <div class="flex justify-between">
                <h3 class="text-lg font-bold">${log.title}</h3>
                <div>
                    <button class="copy-log-btn text-green-500 hover:underline mr-2" data-id="${log.id}">Copy</button>
                    <button class="edit-log-btn text-blue-500 hover:underline mr-2" data-id="${log.id}">Edit</button>
                    <button class="delete-log-btn text-red-500 hover:underline" data-id="${log.id}">Delete</button>
                </div>
            </div>
            <p class="text-gray-600">${log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'Date not available'}</p>
            <p class="mt-2" data-full-description="${description}">${shortDescription}</p>
            ${description.length > 100 ? '<button class="show-more-btn text-blue-500 hover:underline">Show more</button>' : ''}
            ${log.imageUrl ? `<img src="${log.imageUrl}" class="mt-2 max-w-full rounded">` : ''}
            <div class="mt-4">
                ${log.tags ? log.tags.map(tag => `<button class="tag-btn bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm hover:bg-gray-300">${tag}</button>`).join('') : ''}
            </div>
        `;
        logsList.appendChild(logElement);
    });

    // Update generator button
    const numActivities = weeklyActivities.length;
    generatePostBtn.textContent = `Generate Post (${numActivities} Activities)`;
    generatePostBtn.disabled = numActivities === 0;

    // Update pagination buttons
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = indexOfLastLog >= weeklyActivities.length;
}

prevPageBtn.addEventListener('click', () => {
    currentPage--;
    renderWeeklyActivities(logs, sortBy.value, startDate.value, endDate.value, filterByTag.value);
});

nextPageBtn.addEventListener('click', () => {
    currentPage++;
    renderWeeklyActivities(logs, sortBy.value, startDate.value, endDate.value, filterByTag.value);
});

startDate.addEventListener('change', (e) => {
    const startDateValue = e.target.value;
    const endDateValue = endDate.value;
    const sortByValue = sortBy.value;
    const searchQuery = searchBar.value.toLowerCase();
    const filteredLogs = logs.filter(log => log.title.toLowerCase().includes(searchQuery));
    renderWeeklyActivities(filteredLogs, sortByValue, startDateValue, endDateValue, filterByTag.value);
});

endDate.addEventListener('change', (e) => {
    const startDateValue = startDate.value;
    const endDateValue = e.target.value;
    const sortByValue = sortBy.value;
    const searchQuery = searchBar.value.toLowerCase();
    const filteredLogs = logs.filter(log => log.title.toLowerCase().includes(searchQuery));
    renderWeeklyActivities(filteredLogs, sortByValue, startDateValue, endDateValue, filterByTag.value);
});

sortBy.addEventListener('change', (e) => {
    const sortByValue = e.target.value;
    const searchQuery = searchBar.value.toLowerCase();
    const filteredLogs = logs.filter(log => log.title.toLowerCase().includes(searchQuery));
    renderWeeklyActivities(filteredLogs, sortByValue, startDate.value, endDate.value, filterByTag.value);
});

searchBar.addEventListener('input', (e) => {
    const searchQuery = e.target.value.toLowerCase();
    const filteredLogs = logs.filter(log => log.title.toLowerCase().includes(searchQuery));
    renderWeeklyActivities(filteredLogs, sortBy.value, startDate.value, endDate.value, filterByTag.value);
});

filterByTag.addEventListener('input', (e) => {
    const tagFilter = e.target.value;
    const searchQuery = searchBar.value.toLowerCase();
    const filteredLogs = logs.filter(log => log.title.toLowerCase().includes(searchQuery));
    renderWeeklyActivities(filteredLogs, sortBy.value, startDate.value, endDate.value, tagFilter);
});

clearFiltersBtn.addEventListener('click', () => {
    searchBar.value = '';
    sortBy.value = 'date';
    startDate.value = '';
    endDate.value = '';
    filterByTag.value = '';
    renderWeeklyActivities(logs, 'date');
});

function copyLog(logId) {
    const log = logs.find(log => log.id === logId);
    if (!log) return;
    const logContent = `Title: ${log.title}\nDescription: ${log.description}\nImage URL: ${log.imageUrl || 'N/A'}`;
    navigator.clipboard.writeText(logContent).then(() => {
        alert('Log content copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy log content: ', err);
        alert('Failed to copy log content. Please check the console for more details.');
    });
}

function editLog(logId) {
    const logElement = document.querySelector(`[data-id="${logId}"]`);
    const log = logs.find(log => log.id === logId);
    if (!log) return;

    logElement.innerHTML = `
        <form class="edit-log-form bg-white p-6 rounded-lg shadow-md" data-id="${logId}">
            <input type="text" value="${log.title}" class="w-full p-2 mb-4 border border-gray-300 rounded" required>
            <textarea class="w-full p-2 mb-4 border border-gray-300 rounded" required>${log.description}</textarea>
            <input type="text" value="${log.imageUrl || ''}" class="w-full p-2 mb-4 border border-gray-300 rounded">
            <input type="text" value="${log.tags ? log.tags.join(', ') : ''}" class="w-full p-2 mb-4 border border-gray-300 rounded">
            <div class="flex justify-end">
                <button type="submit" class="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mr-2">Save</button>
                <button type="button" class="cancel-edit-btn bg-gray-500 text-white p-2 rounded hover:bg-gray-600">Cancel</button>
            </div>
        </form>
    `;
}

async function updateLog(logId, updatedLog) {
    try {
        const response = await fetch(`/api/logs/${logId}`, {
            method: 'POST', // or PUT
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedLog)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log("Document with ID: ", logId, " updated");
        fetchLogs(); // Refresh
    } catch (e) {
        console.error("Error updating document: ", e);
    }
}

logsList.addEventListener('click', (e) => {
    if (e.target.classList.contains('show-more-btn')) {
        const p = e.target.previousElementSibling;
        p.textContent = p.dataset.fullDescription;
        e.target.textContent = 'Show less';
        e.target.classList.remove('show-more-btn');
        e.target.classList.add('show-less-btn');
    } else if (e.target.classList.contains('show-less-btn')) {
        const p = e.target.previousElementSibling;
        p.textContent = `${p.dataset.fullDescription.substring(0, 100)}...`;
        e.target.textContent = 'Show more';
        e.target.classList.remove('show-less-btn');
        e.target.classList.add('show-more-btn');
    } else if (e.target.classList.contains('delete-log-btn')) {
        const logId = e.target.dataset.id;
        deleteLog(logId);
    } else if (e.target.classList.contains('edit-log-btn')) {
        const logId = e.target.dataset.id;
        editLog(logId);
    } else if (e.target.classList.contains('copy-log-btn')) {
        const logId = e.target.dataset.id;
        copyLog(logId);
    } else if (e.target.classList.contains('cancel-edit-btn')) {
        fetchLogs();
    } else if (e.target.classList.contains('tag-btn')) {
        filterByTag.value = e.target.textContent;
        const tagFilter = e.target.textContent;
        const searchQuery = searchBar.value.toLowerCase();
        const filteredLogs = logs.filter(log => log.title.toLowerCase().includes(searchQuery));
        renderWeeklyActivities(filteredLogs, sortBy.value, startDate.value, endDate.value, tagFilter);
    }
});

logsList.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.classList.contains('edit-log-form')) {
        const logId = e.target.dataset.id;
        const updatedLog = {
            title: e.target.querySelector('input[type="text"]').value,
            description: e.target.querySelector('textarea').value,
            imageUrl: e.target.querySelectorAll('input[type="text"]')[1].value,
            tags: e.target.querySelectorAll('input[type="text"]')[2].value.split(',').map(tag => tag.trim()).filter(tag => tag)
        };
        updateLog(logId, updatedLog);
    }
});

// Form submission
logForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const log = {
        date: logDate.value,
        title: logTitle.value,
        description: logDescription.value,
        imageUrl: logImageUrl.value,
        tags: logTags.value.split(',').map(tag => tag.trim()).filter(tag => tag),
    };

    saveLog(log);

    logForm.reset();
    imagePreview.style.display = 'none';
});

async function saveLog(log) {
    try {
        const response = await fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(log)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const newLog = await response.json();
        console.log("Document written with ID: ", newLog.id);
        fetchLogs(); // Refresh logs
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

// Career Compass App
console.log("Career Compass App Loaded (Local API)");
