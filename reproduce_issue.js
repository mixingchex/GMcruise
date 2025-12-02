
// Mock localStorage
const localStorageStore = {};
const localStorage = {
    getItem: (key) => localStorageStore[key] || null,
    setItem: (key, value) => { localStorageStore[key] = value; },
    removeItem: (key) => { delete localStorageStore[key]; }
};

// Mock Data
const countryKoreanToEnglishMap = { '브라질': 'Brazil' };
let apiTrips = [];
let apiVisitedCountries = {};

// Logic from MapPage (simplified)
function getAutoColorMap(trips) {
    const autoColorMap = {};
    trips.forEach((trip) => {
        if (trip.destination) {
            const destinations = trip.destination.split(',').map(d => d.trim()).filter(d => d);
            destinations.forEach((dest) => {
                const englishName = countryKoreanToEnglishMap[dest];
                if (englishName) {
                    autoColorMap[englishName] = '#EF4444';
                }
            });
        }
    });
    return autoColorMap;
}

// Simulate init()
function init() {
    console.log('--- Init ---');
    // 1. Load trips from local
    const localTripsRaw = localStorage.getItem('myTrips');
    const localTrips = localTripsRaw ? JSON.parse(localTripsRaw) : [];

    // 2. Load trips from API (mock)
    // (Assuming API returns what's on server)

    // 3. Merge trips (simplified: just use local for now as it has priority in code)
    const mergedTrips = localTrips; // In real code, it merges.

    // 4. Auto color map
    const autoColorMap = getAutoColorMap(mergedTrips);
    console.log('Auto Color Map:', autoColorMap);

    // 5. Load colors from local
    let localColorMap = {};
    const savedColors = localStorage.getItem('countryColors');
    if (savedColors) {
        localColorMap = JSON.parse(savedColors);
    }
    console.log('Local Color Map:', localColorMap);

    // 5. API visited countries (mock)
    const apiColorMap = apiVisitedCountries;

    // Merge Colors
    // Code: const mergedColorMap = { ...autoColorMap, ...apiColorMapConverted, ...localColorMap };
    const mergedColorMap = { ...autoColorMap, ...apiColorMap, ...localColorMap };
    console.log('Merged Color Map:', mergedColorMap);

    // Save back to local
    localStorage.setItem('countryColors', JSON.stringify(mergedColorMap));

    return { mergedTrips, mergedColorMap };
}

// Simulate Adding Trip
function addTrip() {
    console.log('--- Adding Trip to Brazil ---');
    const newTrip = { id: 1, destination: '브라질', startDate: '2023-01-01', endDate: '2023-01-10' };

    // Update Local Trips
    const currentTrips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    currentTrips.push(newTrip);
    localStorage.setItem('myTrips', JSON.stringify(currentTrips));

    // Update Server (Mock)
    apiTrips.push(newTrip);

    // Re-run init logic (useEffect)
    init();
}

// Simulate Deleting Trip
function deleteTrip() {
    console.log('--- Deleting Trip ---');
    // Remove from server
    apiTrips = [];

    // Remove from local (handleDeleteTrip does this by fetching from server and saving to local)
    localStorage.setItem('myTrips', JSON.stringify([]));

    // Note: handleDeleteTrip does NOT update countryColors directly.
    // It only updates userTrips.

    // User reloads page -> init() runs
    init();
}

// Run Simulation
console.log('Initial State: Empty');
init();

addTrip();

deleteTrip();

// Check result
const finalColors = JSON.parse(localStorage.getItem('countryColors'));
if (finalColors['Brazil']) {
    console.log('FAIL: Brazil is still in countryColors!');
} else {
    console.log('SUCCESS: Brazil is gone.');
}
