
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
const heatmap = document.getElementById('heatmap');

let currentPage = 1;
const logsPerPage = 5;

// Fetch initial data
document.addEventListener('DOMContentLoaded', () => {
    fetchLogs();
    logDate.valueAsDate = new Date();
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
        renderHeatmap(logs);
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

    logsList.innerHTML = '';
    if(weeklyActivities.length === 0) {
        logsList.innerHTML = `
            <div class="text-center py-12 col-span-full">
                <svg class="mx-auto h-24 w-24 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 class="mt-2 text-lg font-medium text-slate-900 dark:text-white">No logs found</h3>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Get started by logging your first activity.</p>
            </div>
        `;
        return;
    }

    const indexOfLastLog = currentPage * logsPerPage;
    const indexOfFirstLog = indexOfLastLog - logsPerPage;
    const currentLogs = weeklyActivities.slice(indexOfFirstLog, indexOfLastLog);

    
    currentLogs.forEach(log => {
        const logElement = document.createElement('div');
        logElement.classList.add('break-inside-avoid', 'mb-8');
        logElement.setAttribute('data-id', log.id);

        const description = log.description;
        const shortDescription = description.length > 100 ? `${description.substring(0, 100)}...` : description;

        logElement.innerHTML = `
            <div class="group relative block w-full bg-white/30 dark:bg-slate-800/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 overflow-hidden">
                <div class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center">
                    <button class="edit-log-btn text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 backdrop-blur-md rounded-full p-2 leading-none hover:scale-110 transition-transform" data-id="${log.id}">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                    </button>
                    <button class="delete-log-btn text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 backdrop-blur-md rounded-full p-2 leading-none hover:scale-110 transition-transform ml-1" data-id="${log.id}">
                         <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
                ${log.imageUrl ? `<img src="${log.imageUrl}" class="w-full h-auto object-cover">` : ''}
                <div class="p-5">
                    <h3 class="font-bold text-lg text-slate-900 dark:text-white">${log.title}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mb-2">${log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'Date not available'}</p>
                    <p class="text-slate-700 dark:text-slate-300 leading-relaxed">${shortDescription}</p>
                    ${description.length > 100 ? '<button class="show-more-btn text-indigo-500 dark:text-indigo-400 hover:underline text-sm font-semibold mt-2">Show more</button>' : ''}
                    <div class="mt-4 flex flex-wrap">
                        ${log.tags ? log.tags.map(tag => `<span class="${getTagColor(tag)} text-xs font-medium mr-2 mb-2 px-2.5 py-1 rounded-full">${tag}</span>`).join('') : ''}
                    </div>
                </div>
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

function getTagColor(tag) {
    const colors = [
        'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    ];
    // simple hash to get a color
    const hash = tag.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
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

function renderHeatmap(logs) {
    const contributions = new Map();
    logs.forEach(log => {
        if (log.timestamp) {
            const date = new Date(log.timestamp).toISOString().split('T')[0];
            contributions.set(date, (contributions.get(date) || 0) + 1);
        }
    });

    heatmap.innerHTML = '';

    if(logs.length === 0) {
        heatmap.innerHTML = `
            <div class="text-center py-8">
                <svg class="mx-auto h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 class="mt-2 text-lg font-medium text-slate-900 dark:text-white">No activity yet</h3>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Your contributions will appear here.</p>
            </div>
        `;
        return;
    }

    const today = new Date();
    const heatmapDays = 90;
    
    const grid = document.createElement('div');
    grid.classList.add('grid', 'grid-flow-col', 'grid-rows-7', 'gap-1.5');

    for (let i = heatmapDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const count = contributions.get(dateString) || 0;

        const cell = document.createElement('div');
        cell.classList.add('w-5', 'h-5', 'rounded');
        cell.style.backgroundColor = getColor(count);
        cell.title = `${count} contributions on ${date.toLocaleDateString()}`;
        grid.appendChild(cell);
    }
    heatmap.appendChild(grid);
}

function getColor(count) {
    const isDarkMode = document.documentElement.classList.contains('dark');
    if (count === 0) return isDarkMode ? 'rgb(30 41 59 / 0.5)' : 'rgb(241 245 249 / 0.5)';
    if (count < 2) return '#a5b4fc'; // indigo-300
    if (count < 4) return '#818cf8'; // indigo-400
    if (count < 6) return '#6366f1'; // indigo-500
    return '#4f46e5'; // indigo-600
}
