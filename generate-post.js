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
    const platform = document.querySelector('input[name="platform"]:checked').value;
    let prompt;

    if (platform === 'linkedin') {
        prompt = `
System: You are a career coach helping a user write a LinkedIn post.

User: Here are my activities for the week:
${activities.map(activity => `- ${activity.title}: ${activity.description}`).join('\n')}

Please generate a LinkedIn post that summarizes my week's activities and highlights my skills and accomplishments.
`;
    } else {
        prompt = `
System: You are a social media expert helping a user write a Twitter thread.

User: Here are my activities for the week:
${activities.map(activity => `- ${activity.title}: ${activity.description}`).join('\n')}

Please generate a short, engaging Twitter thread (3-4 tweets) summarizing my week's activities. Use hashtags and a conversational tone.
`;
    }
    
    const loadingSpinner = document.getElementById('loading-spinner');
    const generatedPost = document.getElementById('generated-post');
    const postPreview = document.getElementById('post-preview');

    loadingSpinner.classList.remove('hidden');
    generatedPost.textContent = '';
    postPreview.innerHTML = '';

    try {
        const response = await generateContent(prompt);
        const post = response.candidates[0].content.parts[0].text;
        generatedPost.textContent = post;
        renderPreview(post, platform);
    } catch (error) {
        console.error('Error generating post:', error);
        generatedPost.textContent = 'Failed to generate post. Please check the console for more details.';
        postPreview.innerHTML = '<p class="text-red-500">Failed to generate post. Please try again.</p>';
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

function renderPreview(post, platform) {
    const postPreview = document.getElementById('post-preview');
    
    let content;
    if (platform === 'linkedin') {
        content = `
            <div class="flex items-center mb-4">
                <img src="https://via.placeholder.com/40/6366f1/FFFFFF?text=U" alt="User" class="rounded-full mr-3">
                <div>
                    <p class="font-bold text-slate-900 dark:text-white">You</p>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Just now</p>
                </div>
            </div>
            <p class="text-slate-800 dark:text-slate-200">${post.replace(/\n/g, '<br>')}</p>
        `;
    } else {
        const tweets = post.split('\n\n');
        content = tweets.map((tweet, index) => `
            <div class="mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                <div class="flex items-center mb-2">
                    <img src="https://via.placeholder.com/40/6366f1/FFFFFF?text=U" alt="User" class="rounded-full mr-3">
                    <p class="font-bold text-slate-900 dark:text-white">You</p>
                </div>
                <p class="text-slate-800 dark:text-slate-200">${tweet.replace(/\n/g, '<br>')}</p>
                <div class="flex items-center justify-end text-slate-500 dark:text-slate-400 text-sm mt-2">
                    <span>${index + 1}/${tweets.length}</span>
                </div>
            </div>
        `).join('');
    }

    postPreview.innerHTML = content;
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
        postContainer.innerHTML = '<p class="text-slate-500 dark:text-slate-400">No activities logged for this week to generate a post from.</p>';
        return;
    }

    weeklyActivities.forEach(log => {
        const logElement = document.createElement('div');
        logElement.classList.add('p-5', 'bg-white/30', 'dark:bg-slate-800/30', 'backdrop-blur-md', 'rounded-2xl', 'shadow-lg', 'border', 'border-white/20');
        logElement.innerHTML = `
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">${log.title}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-2">${log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'Date not available'}</p>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed">${log.description}</p>
            ${log.imageUrl ? `<img src="${log.imageUrl}" class="mt-4 w-full h-auto object-cover rounded-lg">` : ''}
        `;
        postContainer.appendChild(logElement);
    });
}
