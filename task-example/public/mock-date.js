(function() {
    let cachedMockTime = null;
    let lastFetchTime = 0;
    let mockEnabled = false;
    const CACHE_DURATION = 100; // Cache for 100ms to avoid excessive API calls

    async function fetchMockTime() {
        const now = Date.now();
        
        // Use cached value if it's fresh
        if (cachedMockTime && (now - lastFetchTime) < CACHE_DURATION) {
            return new Date(cachedMockTime);
        }

        try {
            const response = await fetch('/api/mock-time');
            const data = await response.json();
            
            if (data.time) {
                cachedMockTime = data.time;
                mockEnabled = data.mockEnabled !== false; // Default to true if not specified
                lastFetchTime = now;
                return new Date(data.time);
            }
        } catch (error) {
            console.error('Failed to fetch mock time:', error);
        }
        
        // Fallback to actual current time
        return new Date();
    }

    function mockDateFromAPI() {
        const OriginalDate = window.Date;

        window.Date = class extends OriginalDate {
            constructor(...args) {
                if (args.length === 0) {
                    // For new Date() without arguments, we need to use the mock time
                    // But we can't await in constructor, so we use a synchronous approach
                    // This will use the cached value only if mock is enabled
                    if (mockEnabled && cachedMockTime) {
                        super(cachedMockTime);
                    } else {
                        super();
                    }
                } else {
                    super(...args);
                }
            }

            static now() {
                if (mockEnabled && cachedMockTime) {
                    return new OriginalDate(cachedMockTime).getTime();
                }
                return OriginalDate.now();
            }
        };

        // Initial fetch to populate cache
        fetchMockTime().then(() => {
            if (mockEnabled) {
                console.log('🕰️ Frontend time traveling enabled! Using mock-date.txt via API');
            } else {
                console.log('⏰ Frontend mock date disabled - using real system time');
            }
        });

        // Refresh cache periodically (every 50ms)
        setInterval(() => {
            fetchMockTime();
        }, 50);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mockDateFromAPI);
    } else {
        mockDateFromAPI();
    }
})();
