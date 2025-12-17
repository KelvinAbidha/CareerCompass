import { generateContent } from './gemini.js';

let weeklyActivities = [];

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    fetchAndRenderPosts();

    const generatePostBtn = document.getElementById('generate-post-btn');
    generatePostBtn.addEventListener('click', () => handleGeneratePost(weeklyActivities));

    const copyToClipboardBtn = document.getElementById('copy-to-clipboard-btn');
    copyToClipboardBtn.addEventListener('click', handleCopyToClipboard);
});

async function fetchAndRenderPosts() {
    try {
        const response = await fetch('/api/logs');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const logs = await response.json();
        weeklyActivities = filterWeeklyActivities(logs);
        renderPost(weeklyActivities);
    } catch (error) {
        console.error("Failed to fetch logs for post generation:", error);
        alert("Failed to load post data. Is the server running? Please check the console.");
    }
}

async function handleGeneratePost(activities) {
    const prompt = `
System: You are a career coach helping a user write a LinkedIn post.

User: Here are my activities for the week:
${activities.map(activity => `- ${activity.title}: ${activity.description}`).join('\n')}

Please generate a LinkedIn post that summarizes my week's activities and highlights my skills and accomplishments.
`;
    
    const loadingSpinner = document.getElementById('loading-spinner');
    const generatedPost = document.getElementById('generated-post');

    loadingSpinner.classList.remove('hidden');
    generatedPost.textContent = '';

    try {
        const response = await generateContent(prompt);
        const post = response.candidates[0].content.parts[0].text;
        generatedPost.textContent = post;
    } catch (error) {
        console.error('Error generating post:', error);
        generatedPost.textContent = 'Failed to generate post. Please check the console for more details.';
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

function handleCopyToClipboard() {
    const generatedPost = document.getElementById('generated-post');
    const postText = generatedPost.textContent;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(postText).then(() => {
            alert('Post copied to clipboard!');
        }, (err) => {
            console.error('Could not copy text: ', err);
            alert('Failed to copy post. Please check the console for more details.');
        });
    } else {
        // Fallback for browsers that do not support navigator.clipboard
        const textArea = document.createElement('textarea');
        textArea.value = postText;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            alert('Post copied to clipboard!');
        } catch (err) {
            console.error('Could not copy text: ', err);
            alert('Failed to copy post. Please check the console for more details.');
        }
        document.body.removeChild(textArea);
    }
}



function filterWeeklyActivities(logs) {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    return logs.filter(log => {
        if (!log.timestamp) {
            return false;
        }
        const logDate = new Date(log.timestamp);
        return logDate >= weekStart && logDate <= weekEnd;
    });
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

function renderPost(weeklyActivities) {
    const postContainer = document.getElementById('post-container');
    postContainer.innerHTML = '';

    if (weeklyActivities.length === 0) {
        postContainer.innerHTML = '<p>No activities logged for this week.</p>';
        return;
    }

    weeklyActivities.forEach(log => {
        const logElement = document.createElement('div');
        logElement.classList.add('p-4', 'mb-4', 'bg-white', 'rounded', 'shadow');
        logElement.innerHTML = `
            <h3 class="text-lg font-bold">${log.title}</h3>
            <p class="text-gray-600">${log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'Date not available'}</p>
            <p class="mt-2">${log.description}</p>
            ${log.imageUrl ? `<img src="${log.imageUrl}" class="mt-2 max-w-full rounded">` : ''}
        `;
        postContainer.appendChild(logElement);
    });
}
