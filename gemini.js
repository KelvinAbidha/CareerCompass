async function withExponentialBackoff(fetchFn, maxRetries = 2) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const response = await fetchFn();
            if (response.ok) {
                return response.json();
            }
            // Try to parse the error response
            const errorBody = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
            throw new Error(errorBody.message || `HTTP error! status: ${response.status}`);
        } catch (error) {
            console.error(`Attempt ${retries + 1} failed. Retrying in ${2 ** retries * 1000}ms... Error: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 2 ** retries * 1000));
            retries++;
        }
    }
    throw new Error('Max retries reached. Could not fetch data.');
}

export async function generateContent(prompt) {
    const fetchFn = () => fetch('/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
    });

    return withExponentialBackoff(fetchFn);
}
