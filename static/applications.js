document.addEventListener('DOMContentLoaded', () => {
    fetchApplications();
    setupModal();
    setupDragAndDrop();
});

let applications = [];

async function fetchApplications() {
    try {
        const response = await fetch('/api/applications/');
        applications = await response.json();
        renderKanban();
    } catch (e) {
        console.error('Failed to fetch applications', e);
    }
}

function renderKanban() {
    const cols = {
        'Applied': document.getElementById('col-applied'),
        'Interviewing': document.getElementById('col-interviewing'),
        'Offer': document.getElementById('col-offer'),
        'Rejected': document.getElementById('col-rejected')
    };

    // Clear all
    Object.values(cols).forEach(col => col.innerHTML = '');
    
    const counts = { 'Applied': 0, 'Interviewing': 0, 'Offer': 0, 'Rejected': 0 };

    applications.forEach(app => {
        counts[app.status]++;
        const card = document.createElement('div');
        card.className = 'bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative';
        card.draggable = true;
        card.dataset.id = app.id;

        const dateStr = app.date_applied ? new Date(app.date_applied + 'T00:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' }) : 'No date';

        card.innerHTML = `
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                <button class="edit-btn text-slate-400 hover:text-indigo-500" data-id="${app.id}"><svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                <button class="delete-btn text-slate-400 hover:text-rose-500" data-id="${app.id}"><svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
            <h4 class="font-bold text-slate-800 pr-10">${app.company_name}</h4>
            <p class="text-sm font-medium text-indigo-600 mb-2">${app.role}</p>
            <div class="text-xs text-slate-500 flex items-center mb-2">
                <i data-lucide="calendar" class="w-3 h-3 mr-1"></i> ${dateStr}
            </div>
            ${app.notes ? `<p class="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg line-clamp-2">${app.notes}</p>` : ''}
        `;
        
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);

        if (cols[app.status]) cols[app.status].appendChild(card);
    });

    Object.keys(counts).forEach(status => {
        const col = document.querySelector(`.kanban-column[data-status="${status}"] .col-count`);
        if(col) col.textContent = counts[status];
    });

    if (window.lucide) lucide.createIcons();

    // Event Delegation for Edit/Delete
    document.querySelectorAll('.kanban-cards').forEach(col => {
        col.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-btn')) {
                if(confirm('Delete application?')){
                    await fetch(`/api/applications/${e.target.dataset.id}`, { method: 'DELETE' });
                    fetchApplications();
                }
            } else if (e.target.classList.contains('edit-btn')) {
                openModal(applications.find(a => a.id == e.target.dataset.id));
            }
        });
    });
}

function setupModal() {
    const modal = document.getElementById('application-modal');
    const content = document.getElementById('modal-content');
    const openBtn = document.getElementById('open-modal-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const form = document.getElementById('application-form');

    function closeModal() {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => modal.classList.replace('flex', 'hidden'), 300);
    }

    openBtn.addEventListener('click', () => openModal());
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if(e.target === modal) closeModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('app-id').value;
        const payload = {
            company_name: document.getElementById('app-company').value,
            role: document.getElementById('app-role').value,
            status: document.getElementById('app-status').value,
            date_applied: document.getElementById('app-date').value || null,
            notes: document.getElementById('app-notes').value || null
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/applications/${id}` : '/api/applications/';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        closeModal();
        fetchApplications();
    });
}

function openModal(app = null) {
    const modal = document.getElementById('application-modal');
    const content = document.getElementById('modal-content');
    const form = document.getElementById('application-form');
    
    if (app) {
        document.getElementById('modal-title').textContent = 'Edit Application';
        document.getElementById('app-id').value = app.id;
        document.getElementById('app-company').value = app.company_name;
        document.getElementById('app-role').value = app.role;
        document.getElementById('app-status').value = app.status;
        document.getElementById('app-date').value = app.date_applied || '';
        document.getElementById('app-notes').value = app.notes || '';
    } else {
        document.getElementById('modal-title').textContent = 'New Application';
        form.reset();
        document.getElementById('app-id').value = '';
        document.getElementById('app-date').valueAsDate = new Date();
    }

    modal.classList.replace('hidden', 'flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

// Drag and Drop
let draggedCard = null;

function handleDragStart(e) {
    draggedCard = this;
    setTimeout(() => this.classList.add('opacity-50'), 0);
}
function handleDragEnd() {
    draggedCard.classList.remove('opacity-50');
    draggedCard = null;
}
function setupDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-column');
    columns.forEach(col => {
        col.addEventListener('dragover', e => {
            e.preventDefault();
            col.classList.add('bg-white/60');
        });
        col.addEventListener('dragleave', () => {
            col.classList.remove('bg-white/60');
        });
        col.addEventListener('drop', async (e) => {
            e.preventDefault();
            col.classList.remove('bg-white/60');
            const newStatus = col.dataset.status;
            const container = col.querySelector('.kanban-cards');
            container.appendChild(draggedCard);

            // Update Backend
            const appId = draggedCard.dataset.id;
            const app = applications.find(a => a.id == appId);
            if(app && app.status !== newStatus) {
                app.status = newStatus;
                await fetch(`/api/applications/${appId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(app)
                });
                renderKanban();
            }
        });
    });
}
