import { generateContent } from './gemini.js';

let weeklyActivities = [];

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    fetchAndRenderPosts();

    const generatePostBtn = document.getElementById('generate-post-btn');
    generatePostBtn.textContent = 'Generate Weekly Summary'; // Rename the button
    generatePostBtn.addEventListener('click', () => handleGeneratePost(weeklyActivities));

    const copyToClipboardBtn = document.getElementById('copy-to-clipboard-btn');
    copyToClipboardBtn.addEventListener('click', handleCopyToClipboard);

    // Event delegation for generating posts from single activities
    const postContainer = document.getElementById('post-container');
    postContainer.addEventListener('click', (event) => {
        const generateButton = event.target.closest('.generate-single-post-btn');
        if (generateButton) {
            const logIndex = parseInt(generateButton.dataset.logIndex, 10);
            const singleActivity = weeklyActivities[logIndex];
            if (singleActivity) {
                handleGeneratePost([singleActivity]); // Pass as an array
            }
        }
    });

    // Event listeners for regeneration buttons
    document.getElementById('regen-shorter').addEventListener('click', () => {
        handleGeneratePost(weeklyActivities, 'Make the previous post shorter.');
    });
    document.getElementById('regen-enthusiastic').addEventListener('click', () => {
        handleGeneratePost(weeklyActivities, 'Based on the previous post, make it more enthusiastic.');
    });
    document.getElementById('regen-hashtags').addEventListener('click', () => {
        handleGeneratePost(weeklyActivities, 'Based on the previous post, add more relevant hashtags.');
    });
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

async function handleGeneratePost(activities, refinementInstruction = null) {
    const platform = document.querySelector('input[name="platform"]:checked').value;
    const tone = document.getElementById('tone-selector').value;
    const length = document.querySelector('input[name="length"]:checked').value;
    const emojiDensity = document.getElementById('emoji-density').value;
    const includeCta = document.getElementById('cta-toggle').checked;
    
    const postPreview = document.getElementById('post-preview');
    const regenerateOptions = document.getElementById('regenerate-options');
    const hashtagCloud = document.getElementById('hashtag-cloud');

    let prompt;

    let platformInstructions;
    if (platform === 'linkedin') {
        platformInstructions = "The post should be formatted for LinkedIn, with professional language, good use of line breaks for readability, and a 'see more' hook to encourage expansion.";
    } else {
        platformInstructions = "The post should be formatted for Twitter/X. If the content is long, structure it as a small thread (2-3 tweets).";
    }

    let baseInstruction = `
System: You are a career coach and social media expert. Your task is to generate a ${platform} post based on the user's weekly activities.

**Primary Instructions:**
- **Tone:** Adopt a ${tone} tone.
- **Length:** The post should be of ${length} length.
- **Emoji Density:** Use emojis according to this density: ${emojiDensity}% (0% = no emojis, 100% = social-heavy).
- **Call-to-Action:** ${includeCta ? "Include a call-to-action at the end, such as a question to engage the audience." : "Do not include a specific call-to-action."}
- **Platform Specifics:** ${platformInstructions}

**Output Format (IMPORTANT):**
You MUST output the post content first. Then, on a new line, add a separator '---'. After the separator, on a new line, provide a list of relevant hashtags, starting with 'Suggested Hashtags:'. For example:
[Your generated post content here]
---
Suggested Hashtags: #career, #professionaldevelopment, #learning

`;

    if (refinementInstruction) {
        baseInstruction += `
**Refinement Request:**
- **Instruction:** ${refinementInstruction}
- **Previous Post:** "${postPreview.value}"

Please refine the previous post based on the new instruction, following all primary instructions and formatting rules.
`;
    } else {
        baseInstruction += `
**User's Weekly Activities:**
${activities.map(activity => `- ${activity.title}: ${activity.description}`).join('\n')}

Please generate a new post based on these activities, following all primary instructions and formatting rules.
`;
    }
    
    prompt = baseInstruction;

    const loadingSpinner = document.getElementById('loading-spinner');
    
    loadingSpinner.classList.remove('hidden');
    regenerateOptions.classList.add('hidden');
    hashtagCloud.innerHTML = ''; // Clear previous hashtags
    if (!refinementInstruction) { // Only clear for brand new posts
        postPreview.value = '';
    }

    try {
        const response = await generateContent(prompt);
        let fullText = response.candidates[0].content.parts[0].text;
        
        let post = fullText;
        let hashtags = [];

        if (fullText.includes('---')) {
            const parts = fullText.split('---');
            post = parts[0].trim();
            const hashtagPart = parts[1] || '';
            const hashtagMatch = hashtagPart.match(/Suggested Hashtags:(.*)/);
            if (hashtagMatch && hashtagMatch[1]) {
                hashtags = hashtagMatch[1].split(',').map(h => h.trim()).filter(h => h.startsWith('#'));
            }
        }
        
        renderPreview(post);
        renderHashtagCloud(hashtags);

        regenerateOptions.classList.remove('hidden'); // Show on success
    } catch (error) {
        console.error('Error generating post:', error);
        postPreview.value = 'Failed to generate post. Please try again.';
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

function renderHashtagCloud(hashtags) {
    const hashtagCloud = document.getElementById('hashtag-cloud');
    hashtagCloud.innerHTML = ''; // Clear previous before rendering

    if (hashtags.length === 0) return;

    const title = document.createElement('h3');
    title.className = 'text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2';
    title.textContent = 'Suggested Hashtags';
    hashtagCloud.appendChild(title);

    const container = document.createElement('div');
    container.className = 'flex flex-wrap gap-2';

    hashtags.forEach(tag => {
        const button = document.createElement('button');
        button.className = 'hashtag-btn bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/50 text-sm';
        button.textContent = tag;
        container.appendChild(button);
    });

    hashtagCloud.appendChild(container);
}

// Add event listener for the hashtag cloud
document.getElementById('hashtag-cloud').addEventListener('click', (event) => {
    if (event.target.classList.contains('hashtag-btn')) {
        const postPreview = document.getElementById('post-preview');
        const tag = event.target.textContent;
        // Append with a space, ensuring not to add multiple spaces
        if (postPreview.value.slice(-1) === ' ' || postPreview.value.slice(-1) === '\n') {
            postPreview.value += tag;
        } else {
            postPreview.value += ' ' + tag;
        }
    }
});

function renderPreview(post) {
    const postPreview = document.getElementById('post-preview');
    postPreview.value = post;
}

function handleCopyToClipboard() {
    const postPreview = document.getElementById('post-preview');
    const postText = postPreview.value;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(postText).then(() => {
            alert('Post copied to clipboard!');
        }, (err) => {
            console.error('Could not copy text: ', err);
            alert('Failed to copy post. Please check the console for more details.');
        });
    } else {
        // Fallback for browsers that do not support navigator.clipboard
        postPreview.focus();
        postPreview.select();
        try {
            document.execCommand('copy');
            alert('Post copied to clipboard!');
        } catch (err) {
            console.error('Could not copy text: ', err);
            alert('Failed to copy post. Please check the console for more details.');
        }
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

    weeklyActivities.forEach((log, index) => {
        const logElement = document.createElement('div');
        logElement.classList.add('p-5', 'bg-white/30', 'dark:bg-slate-800/30', 'backdrop-blur-md', 'rounded-2xl', 'shadow-lg', 'border', 'border-white/20', 'flex', 'flex-col');
        logElement.innerHTML = `
            <div class="flex-grow">
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">${log.title}</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 mb-2">${log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'Date not available'}</p>
                <p class="text-slate-700 dark:text-slate-300 leading-relaxed">${log.description}</p>
                ${log.imageUrl ? `<img src="${log.imageUrl}" class="mt-4 w-full h-auto object-cover rounded-lg">` : ''}
            </div>
            <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button data-log-index="${index}" class="generate-single-post-btn w-full bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-600 transition-all flex items-center justify-center">
                    <i data-lucide="pen-square" class="w-4 h-4 mr-2"></i>
                    Generate Post for this Activity
                </button>
            </div>
        `;
        postContainer.appendChild(logElement);
    });
    lucide.createIcons(); // Re-run lucide to create the new icons
}
