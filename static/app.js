
let logs = [];
let weeklyActivities = [];

// DOM Elements
const logForm = document.getElementById('log-form');
const logDate = document.getElementById('log-date');
const logTitle = document.getElementById('log-title');
const logDescription = document.getElementById('log-description');
const charCount = document.getElementById('char-count');
const maxChars = 280;

if (logDescription) {
    logDescription.addEventListener('input', () => {
        const remaining = maxChars - logDescription.value.length;
        charCount.textContent = `${remaining} characters remaining`;
    });
}

const logImageUrl = document.getElementById('log-image-url');
const imagePreview = document.getElementById('image-preview');

if (logImageUrl) {
    logImageUrl.addEventListener('input', () => {
        if (logImageUrl.value) {
            imagePreview.src = logImageUrl.value;
            imagePreview.style.display = 'block';
        } else {
            imagePreview.style.display = 'none';
        }
    });
}
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
const heatmapYearSelect = document.getElementById('heatmap-year-selector');

let currentPage = 1;
let currentHeatmapYear = new Date().getFullYear();
const logsPerPage = 5;

// Fetch initial data
document.addEventListener('DOMContentLoaded', () => {
    fetchLogs();
    setupSSE();
    if (logDate) logDate.valueAsDate = new Date();
    if (heatmapYearSelect) {
        heatmapYearSelect.addEventListener('change', (e) => {
            currentHeatmapYear = parseInt(e.target.value, 10);
            renderHeatmap(logs);
        });
    }
});

function setupSSE() {
    const evtSource = new EventSource("/api/stream/updates");
    evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'log_created') {
            const newLog = data.data;
            // Add to the top of logs
            logs.unshift(newLog);
            // Re-render current views
            renderWeeklyActivities(logs, sortBy?.value, startDate?.value, endDate?.value, filterByTag?.value);
            renderHeatmap(logs);

            // Add to live community feed
            addLogToFeed(newLog);
        }
    };
    evtSource.onerror = (err) => {
        console.error("SSE Error:", err);
    };
}

function addLogToFeed(log) {
    const feed = document.getElementById('community-feed');
    if (feed && feed.querySelector('p.italic')) {
        feed.innerHTML = ''; // Remove placeholder
    }
    if (feed) {
        const item = document.createElement('div');
        item.className = "p-4 bg-white/50 rounded-lg shadow-sm border border-slate-200 animate-fade-in-down";
        item.innerHTML = `
            <div class="flex items-center mb-2">
                <div class="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-700 font-bold text-sm mr-3">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                    <p class="text-sm font-semibold text-slate-800">Someone logged activity</p>
                    <p class="text-[10px] text-slate-500">${new Date(log.timestamp).toLocaleTimeString()}</p>
                </div>
            </div>
            <p class="text-sm font-medium text-slate-900">${log.title}</p>
            <p class="text-xs text-slate-600 truncate mt-1">${log.description}</p>
        `;
        feed.prepend(item);
    }
}



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

    if (logsList) {
        logsList.innerHTML = '';
        if (weeklyActivities.length === 0) {
            logsList.innerHTML = `
                <div class="text-center py-12 col-span-full">
                    <svg class="mx-auto h-24 w-24 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 class="mt-2 text-lg font-medium text-slate-900">No logs found</h3>
                    <p class="mt-1 text-sm text-slate-500">Get started by logging your first activity.</p>
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
                <div class="group relative block w-full bg-white/30 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-lg border border-white/20 overflow-hidden transition-all duration-300 transform hover:-translate-y-1">
                    <div class="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
                        <button class="edit-log-btn text-slate-600 bg-white/80 backdrop-blur-md rounded-full p-2.5 shadow-sm hover:shadow-md hover:bg-white hover:text-indigo-600 transition-all" data-id="${log.id}" title="Edit log">
                            <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                        </button>
                        <button class="delete-log-btn text-slate-600 bg-white/80 backdrop-blur-md rounded-full p-2.5 shadow-sm hover:shadow-md hover:bg-white hover:text-rose-600 transition-all" data-id="${log.id}" title="Delete log">
                             <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                    ${log.imageUrl ? `<img src="${log.imageUrl}" class="w-full h-48 object-cover border-b border-gray-100">` : ''}
                    <div class="p-6">
                        <h3 class="font-bold text-xl text-slate-900 tracking-tight mb-1">${log.title}</h3>
                        <p class="text-xs font-medium text-indigo-600 mb-3">${log.timestamp ? new Date(log.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date not available'}</p>
                        <p class="text-slate-700 leading-relaxed text-sm mb-4" data-full-description="${description.replace(/"/g, '&quot;')}">${shortDescription}</p>
                        ${description.length > 100 ? '<button class="show-more-btn text-indigo-600 hover:text-indigo-700 hover:underline text-sm font-semibold transition-colors">Show more</button>' : ''}
                        <div class="mt-4 flex flex-wrap gap-2">
                            ${log.tags ? log.tags.map(tag => `<span class="${getTagColor(tag)} text-xs font-semibold px-3 py-1 rounded-full shadow-sm border border-transparent hover:border-current transition-colors cursor-pointer tag-btn">${tag}</span>`).join('') : ''}
                        </div>
                    </div>
                </div>
            `;
            logsList.appendChild(logElement);
        });
    }

    // Update generator button
    if (generatePostBtn) {
        const numActivities = weeklyActivities.length;
        generatePostBtn.textContent = `Generate Post (${numActivities} Activities)`;
        generatePostBtn.disabled = numActivities === 0;
    }

    // Update pagination buttons
    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.disabled = currentPage === 1;
        const indexOfLastLog = currentPage * logsPerPage;
        nextPageBtn.disabled = indexOfLastLog >= weeklyActivities.length;
    }
}

function getTagColor(tag) {
    const colors = [
        'bg-indigo-50 text-indigo-700',
        'bg-purple-50 text-purple-700',
        'bg-pink-50 text-pink-700',
        'bg-emerald-50 text-emerald-700',
        'bg-rose-50 text-rose-700',
        'bg-amber-50 text-amber-700',
        'bg-cyan-50 text-cyan-700'
    ];
    // simple hash to get a color
    const hash = tag.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
}

if (prevPageBtn && nextPageBtn) {
    prevPageBtn.addEventListener('click', () => {
        currentPage--;
        renderWeeklyActivities(logs, sortBy.value, startDate.value, endDate.value, filterByTag.value);
    });

    nextPageBtn.addEventListener('click', () => {
        currentPage++;
        renderWeeklyActivities(logs, sortBy.value, startDate.value, endDate.value, filterByTag.value);
    });
}

if (startDate && endDate && searchBar && sortBy && filterByTag && clearFiltersBtn) {
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
}

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

if (logsList) {
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
            if (filterByTag) {
                filterByTag.value = e.target.textContent;
                const tagFilter = e.target.textContent;
                const searchQuery = searchBar ? searchBar.value.toLowerCase() : '';
                const filteredLogs = logs.filter(log => log.title.toLowerCase().includes(searchQuery));
                renderWeeklyActivities(filteredLogs, sortBy?.value, startDate?.value, endDate?.value, tagFilter);
            }
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
}

// Form submission
if (logForm) {
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
        if (imagePreview) {
            imagePreview.style.display = 'none';
        }
    });
}

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
        // fetchLogs(); // Handled by SSE now
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

// Career Compass App
console.log("Career Compass App Loaded (Local API)");

function populateHeatmapYears(logs) {
    if (!heatmapYearSelect) return;
    
    const years = new Set();
    years.add(new Date().getFullYear());
    
    logs.forEach(log => {
        if (log.timestamp) {
            years.add(new Date(log.timestamp).getFullYear());
        }
    });

    const sortedYears = Array.from(years).sort((a,b) => b - a);
    
    if (heatmapYearSelect.options.length !== sortedYears.length) {
        heatmapYearSelect.innerHTML = '';
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentHeatmapYear) option.selected = true;
            heatmapYearSelect.appendChild(option);
        });
    }
}

function renderHeatmap(logs) {
    if (!heatmap) return;
    populateHeatmapYears(logs);

    heatmap.innerHTML = '';

    if (logs.length === 0) {
        heatmap.innerHTML = `
            <div class="text-center py-8">
                <svg class="mx-auto h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 class="mt-2 text-lg font-medium text-slate-900">No activity yet</h3>
                <p class="mt-1 text-sm text-slate-500">Your contributions will appear here.</p>
            </div>
        `;
        return;
    }

    const contributions = new Map();
    logs.forEach(log => {
        if (log.timestamp) {
            const logDate = new Date(log.timestamp);
            const y = logDate.getFullYear();
            const m = String(logDate.getMonth() + 1).padStart(2, '0');
            const d = String(logDate.getDate()).padStart(2, '0');
            const dateString = `${y}-${m}-${d}`;
            contributions.set(dateString, (contributions.get(dateString) || 0) + 1);
        }
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'w-full overflow-x-auto pb-4'; // Removed custom scrollbar class, relying on default scroll behavior

    const daysColumn = document.createElement('div');
    daysColumn.className = 'grid grid-rows-7 gap-1.5 text-[10px] text-slate-400 pr-3 py-1 text-right sticky left-0 bg-white/5 backdrop-blur-sm z-10';
    daysColumn.style.minWidth = '30px';
    
    ['', 'Mon', '', 'Wed', '', 'Fri', ''].forEach(day => {
        const div = document.createElement('div');
        div.textContent = day;
        div.className = 'h-3 flex items-center justify-end leading-none';
        daysColumn.appendChild(div);
    });

    const grid = document.createElement('div');
    grid.classList.add('grid', 'grid-flow-col', 'grid-rows-7', 'gap-1.5');

    const startDate = new Date(currentHeatmapYear, 0, 1);
    const endDate = new Date(currentHeatmapYear, 11, 31);
    const oneDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / oneDay) + 1;
    
    // Add empty padding cells so the first real date matches its correct day of the week
    const startDayOfWeek = startDate.getDay(); 
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('w-3', 'h-3', 'rounded-[2px]', 'bg-transparent');
        grid.appendChild(emptyCell);
    }

    for (let i = 0; i < totalDays; i++) {
        const date = new Date(currentHeatmapYear, 0, i + 1);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateString = `${y}-${m}-${d}`;
        const count = contributions.get(dateString) || 0;

        const cell = document.createElement('div');
        cell.classList.add('w-3', 'h-3', 'rounded-[2px]', 'transition-all', 'duration-200', 'hover:ring-2', 'hover:ring-indigo-400', 'hover:scale-110', 'cursor-pointer');
        cell.style.backgroundColor = getColor(count);
        
        // Formatted tooltip
        const dateFormatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        cell.title = count === 0 ? `No contributions on ${dateFormatted}` : `${count} contribution${count > 1 ? 's' : ''} on ${dateFormatted}`;
        
        grid.appendChild(cell);
    }
    
    const flexContainer = document.createElement('div');
    flexContainer.className = 'flex items-start';
    flexContainer.appendChild(daysColumn);
    flexContainer.appendChild(grid);
    
    wrapper.appendChild(flexContainer);

    const legend = document.createElement('div');
    legend.className = 'flex items-center justify-end text-[11px] text-slate-500 mt-4 gap-1.5 pt-4 border-t border-slate-100/20';
    legend.innerHTML = `
        <span class="mr-1">Less</span>
        <div class="w-3 h-3 rounded-[2px]" style="background-color: ${getColor(0)}"></div>
        <div class="w-3 h-3 rounded-[2px]" style="background-color: ${getColor(1)}"></div>
        <div class="w-3 h-3 rounded-[2px]" style="background-color: ${getColor(3)}"></div>
        <div class="w-3 h-3 rounded-[2px]" style="background-color: ${getColor(5)}"></div>
        <div class="w-3 h-3 rounded-[2px]" style="background-color: ${getColor(6)}"></div>
        <span class="ml-1">More</span>
    `;

    heatmap.appendChild(wrapper);
    heatmap.appendChild(legend);
}

function getColor(count) {
    if (count === 0) return '#dbeafe'; // blue-100
    if (count < 2) return '#93c5fd'; // blue-300
    if (count < 4) return '#60a5fa'; // blue-400
    if (count < 6) return '#3b82f6'; // blue-500
    return '#1d4ed8'; // blue-700
}
