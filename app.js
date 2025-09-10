document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const queryInput = document.getElementById('query');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');

    const API_KEY = CONFIG.GOOGLE_API_KEY;

    // Auto-focus search input when page loads
    queryInput.focus();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = queryInput.value.trim();
        if (!query) return;

        showLoading();
        
        try {
            const url = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query)}&limit=10000&key=${API_KEY}`;
            const response = await fetch(url);
            
            if (!response.ok) throw new Error(`Failed to fetch results (${response.status})`);
            
            const data = await response.json();
            displayResults(data, query);
        } catch (error) {
            hideLoading();
            showError(error.message);
        }
    });

    function showLoading() {
        loadingDiv.classList.remove('hidden');
        resultsDiv.innerHTML = '';
        // Scroll to loading section
        loadingDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function hideLoading() {
        loadingDiv.classList.add('hidden');
    }

    function showError(message) {
        resultsDiv.innerHTML = `
            <div class="text-center py-20 fade-in">
                <i class="fas fa-exclamation-triangle text-5xl mb-4 text-red-500"></i>
                <h3 class="text-xl mb-2 text-gray-800">Something went wrong</h3>
                <p class="text-gray-600">${message}</p>
                <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
                    Try Again
                </button>
            </div>
        `;
    }

    function displayResults(data, query) {
        hideLoading();
        
        if (!data.itemListElement?.length) {
            resultsDiv.innerHTML = `
                <div class="text-center py-20 fade-in">
                    <i class="fas fa-search text-5xl mb-4 text-gray-400"></i>
                    <h3 class="text-xl mb-2 text-gray-800">No results found for "${query}"</h3>
                    <p class="text-gray-600 mb-6">This means Google doesn't have information about this entity in their Knowledge Graph</p>
                    <button onclick="document.getElementById('query').focus()" class="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
                        Try Another Search
                    </button>
                </div>
            `;
            return;
        }

        const total = data.itemListElement.length;
        let html = `
            <div class="glass rounded-xl p-6 mb-8 text-center fade-in">
                <div class="flex items-center justify-center gap-2 text-gray-700">
                    <i class="fas fa-database text-indigo-500"></i>
                    <span class="font-semibold">Found ${total} result${total > 1 ? 's' : ''} for "${query}"</span>
                </div>
            </div>
        `;

        data.itemListElement.forEach((item, i) => {
            html += createCard(item.result, item.resultScore, i);
        });

        resultsDiv.innerHTML = html;
        // Smooth scroll to results
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function createCard(entity, score, index) {
        const name = entity.name || 'Unknown Entity';
        const types = getTypes(entity['@type']);
        const subtitle = entity.description || '';
        const description = entity.detailedDescription?.articleBody || '';
        const image = entity.image?.contentUrl || '';
        const id = entity['@id'] || '';
        const website = entity.url || '';
        const moreInfo = entity.detailedDescription?.url || '';

        return `
            <div class="glass rounded-2xl p-6 mb-6 shadow-lg hover:shadow-xl transition-all duration-300 fade-in stagger" style="--delay: ${index * 100}ms">
                
                <!-- Header -->
                <div class="flex flex-col md:flex-row gap-6 mb-6">
                    ${image ? `
                        <img src="${image}" alt="${name}" 
                             class="w-24 h-24 rounded-xl object-cover self-center md:self-start shadow-md hover:scale-105 transition-transform"
                             onerror="this.style.display='none'">
                    ` : ''}
                    
                    <div class="flex-1 text-center md:text-left">
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">${name}</h2>
                        
                        ${subtitle ? `
                            <p class="text-indigo-600 font-medium mb-3">${subtitle}</p>
                        ` : `
                            <p class="text-gray-400 italic mb-3">No description available</p>
                        `}
                        
                        <div class="flex flex-wrap justify-center md:justify-start gap-2 mb-3">
                            <span class="text-sm text-gray-600 mr-2">Type:</span>
                                ${types.map(type => `
                                <div class="has-tooltip relative">
                                    <span class="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium cursor-help">
                                        ${type}
                                    </span>
                                    <div class="tooltip">Schema.org classification</div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="has-tooltip relative inline-block">
                            <span class="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm cursor-help">
                                <i class="fas fa-chart-line mr-2"></i>
                                Confidence: ${Math.round(score)}
                            </span>
                            <div class="tooltip">Google's confidence score for this match</div>
                        </div>
                    </div>
                </div>

                <!-- Description -->
                ${description ? `
                    <div class="bg-gray-50 rounded-lg p-4 mb-6 border-l-4 border-indigo-400">
                        <p class="text-gray-800 leading-relaxed">${truncate(description, 300)}</p>
                    </div>
                ` : `
                    <div class="bg-gray-50 rounded-lg p-4 mb-6 border-l-4 border-gray-300">
                        <p class="text-gray-700 italic">No detailed description available in Google's Knowledge Graph</p>
                    </div>
                `}

                <!-- Links -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${id ? createLinkCard('fingerprint', 'Knowledge Graph ID', cleanId(id), `https://www.google.com/search?kgmid=${cleanId(id)}`, 'purple') : ''}
                    ${website ? createLinkCard('globe', 'Official Website', getDomain(website), website, 'green') : ''}
                    ${moreInfo ? createLinkCard('info-circle', 'More Info', getDomain(moreInfo), moreInfo, 'blue') : ''}
                </div>
            </div>
        `;
    }

    function createLinkCard(icon, title, text, url, color) {
    const colors = {
        purple: 'from-purple-500 to-indigo-500 border-purple-200',
        green: 'from-green-500 to-emerald-500 border-green-200',
        blue: 'from-blue-500 to-cyan-500 border-blue-200'
    };
    
    return `
        <div class="has-tooltip relative">
            <a href="${url}" target="_blank" class="block group">
                <div class="p-0 rounded-xl shadow-md hover:shadow-lg group-hover:scale-105 transition-all duration-200">
                    <div class="bg-gradient-to-br ${colors[color]} rounded-xl p-1">
                        <div class="flex items-center gap-3 bg-white rounded-lg p-4">
                            <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-white shadow-sm">
                                <i class="fas fa-${icon} text-${color.split('-')[0]}-500 text-lg"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <h4 class="font-semibold text-gray-800 text-sm mb-1">${title}</h4>
                                <span class="text-xs text-gray-600 break-all group-hover:text-${color.split('-')[0]}-600 transition-colors">
                                    ${text} <i class="fas fa-external-link-alt ml-1 opacity-50"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </a>
            <div class="tooltip">
                ${getTooltipText(title)}
            </div>
        </div>
    `;
}


    // Helper functions
    function getTypes(typeData) {
        if (!typeData) return ['Thing'];
        return Array.isArray(typeData) ? typeData : [typeData];
    }

    function cleanId(id) {
        return id?.startsWith('kg:') ? id.substring(3) : id;
    }

    function truncate(text, length) {
        return text.length > length ? text.substring(0, length).trim() + '...' : text;
    }

    function getDomain(url) {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    }

    function getTooltipText(title) {
        const tooltips = {
            'Knowledge Graph ID': 'Unique identifier in Google\'s Knowledge Graph database',
            'Official Website': 'Primary website for this entity',
            'More Info': 'Additional information source (usually Wikipedia)'
        };
        return tooltips[title] || 'Click to open';
    }
});

// Example search function for the example buttons
function searchExample(query) {
    const queryInput = document.getElementById('query');
    queryInput.value = query;
    document.getElementById('search-form').dispatchEvent(new Event('submit'));
}
