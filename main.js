// ======================================
// START GAME (loaded last, after every other script)
// ======================================

// The event buttons always run the same handlers, so they are attached once.
el.eventAccept.onclick = acceptEvent;
el.eventDecline.onclick = declineEvent;

const loadedSave = loadGame();

el.weather.textContent = weatherLabel(currentWeather.name);
el.weatherInfo.textContent = "💡 " + currentWeather.education;

if (loadedSave) addNews("💾 Welcome back! Your saved game was loaded.");
else updateCoach(true);

ensureMap(); // saves from before the tile map get a map built around their buildings
ensureDistricts(); // and maps from before districts get districts
syncMapWithCounts();
ensureGrid(); // and power lines
ensurePolitics(); // and citizen groups
ensureBudget(); // and the budget books
initExtras();
initMapInput();
randomFact();
renderGlossary();
renderNews();
updateUI();
startTicker();

// A brand new game starts by choosing a city.
if (!loadedSave || !X.started) showScenarioPicker();
