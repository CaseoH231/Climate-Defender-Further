// ======================================
// LEARNING CONTENT
// Everything the game uses to teach lives here: the Climate Dictionary,
// the quiz questions, the Climate Coach tips and the game-over advice.
// ======================================

// ---------- CLIMATE DICTIONARY ----------
// New words unlock as the player meets them in the game.
const glossary = [
  { id: "greenhouse", icon: "🌍", term: "Greenhouse gas", definition: "A gas, like carbon dioxide or methane, that traps heat in the air like a blanket." },
  { id: "emissions", icon: "💨", term: "Emissions", definition: "Gases and smoke that are released into the air, for example from power plants and cars." },
  { id: "fossilfuel", icon: "🛢", term: "Fossil fuel", definition: "Coal, oil and gas. They formed from ancient plants and animals millions of years ago, and burning them makes greenhouse gases." },
  { id: "renewable", icon: "☀", term: "Renewable energy", definition: "Energy from sources that don't run out, like sunshine, wind and water." },
  { id: "carbonsink", icon: "🌳", term: "Carbon sink", definition: "Something that takes in more carbon dioxide than it gives out, like a forest or the ocean." },
  { id: "climateweather", icon: "🌦", term: "Climate vs weather", definition: "Weather is what happens today. Climate is the pattern of weather over many years." },
  { id: "mitigation", icon: "⬇", term: "Mitigation", definition: "Actions that reduce greenhouse gases, like building solar farms or planting trees." },
  { id: "adaptation", icon: "🛡", term: "Adaptation", definition: "Getting ready for changes that are already happening, like building flood defences or cooling centres." },
  { id: "sealevel", icon: "🌊", term: "Sea level rise", definition: "The ocean is getting higher because water expands as it warms and ice on land melts into the sea." },
  { id: "storage", icon: "🔋", term: "Energy storage", definition: "Saving spare electricity, in batteries for example, so it can be used when the sun isn't shining or the wind isn't blowing." },
  { id: "carboncapture", icon: "🌎", term: "Carbon capture", definition: "Technology that pulls carbon dioxide out of the air or out of smokestacks and stores it safely." },
  { id: "blackout", icon: "⚡", term: "Blackout", definition: "When a city needs more electricity than it can make, so the power goes out." },
  { id: "efficiency", icon: "💡", term: "Energy efficiency", definition: "Getting the same job done using less energy, like swapping to LED lights or adding insulation." },
  { id: "recycling", icon: "♻", term: "Recycling", definition: "Turning used materials into new things, which saves energy and keeps rubbish out of landfill." },
  { id: "extreme", icon: "🌪", term: "Extreme weather", definition: "Very strong or unusual weather like heatwaves, big storms, floods and bushfire conditions." },
  { id: "ecosystem", icon: "🦜", term: "Ecosystem", definition: "All the living things in a place, plus the air, water and soil they depend on." },
  { id: "nuclear", icon: "⚛", term: "Nuclear power", definition: "Electricity made from the heat of splitting atoms. It makes almost no greenhouse gas while running, but it makes radioactive waste." },
  { id: "radwaste", icon: "☢", term: "Radioactive waste", definition: "Used material from nuclear power plants. It stays harmful for a very long time, so it has to be stored safely." },
  { id: "baseload", icon: "📈", term: "Baseload power", definition: "Power stations that run steadily day and night, whatever the weather, so the lights stay on." },
  { id: "transport", icon: "🚲", term: "Sustainable transport", definition: "Ways of getting around that make little pollution, like walking, cycling, trains and electric buses." },
];

// ---------- QUIZ QUESTIONS ----------
// answer is the position (0-3) of the correct option in "options".
const quizQuestions = [
  { id: "q1", q: "Which gas is released when we burn coal, oil and gas, and is the main cause of climate change?", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], answer: 1, explain: "Burning fossil fuels releases carbon dioxide (CO₂), a greenhouse gas that traps heat in the air." },
  { id: "q2", q: "What does a greenhouse gas do?", options: ["Traps heat in the atmosphere", "Makes it rain more", "Blocks all sunlight", "Cleans the air"], answer: 0, explain: "Greenhouse gases work like a blanket around Earth. More of them means more heat is trapped." },
  { id: "q3", q: "Which of these is a renewable energy source?", options: ["Coal", "Natural gas", "Wind", "Oil"], answer: 2, explain: "Wind will never run out. Coal, gas and oil are fossil fuels, and we can't make more." },
  { id: "q4", q: "Why are forests good for the climate?", options: ["They take in carbon dioxide and store the carbon", "They make oil underground", "They block the Sun", "They heat up the air"], answer: 0, explain: "Trees take in carbon dioxide as they grow and keep the carbon in their wood and leaves. That's why forests are called carbon sinks." },
  { id: "q5", q: "What is the difference between weather and climate?", options: ["Weather is today's conditions, climate is the pattern over many years", "They mean exactly the same thing", "Climate changes every hour", "Weather only happens in summer"], answer: 0, explain: "A cold day doesn't disprove climate change, because climate is the average over many years." },
  { id: "q6", q: "Which of these is a fossil fuel?", options: ["Solar power", "Coal", "Wind", "Hydro (water) power"], answer: 1, explain: "Coal is a fossil fuel. It formed from ancient plants over millions of years." },
  { id: "q7", q: "Why are sea levels rising?", options: ["Warm water expands and ice on land melts into the sea", "More rivers are being built", "The Moon is moving closer", "Fish are making more water"], answer: 0, explain: "The ocean takes in heat and expands, and melting glaciers and ice sheets add extra water." },
  { id: "q8", q: "What does a battery do for a solar or wind farm?", options: ["Stores spare electricity for later", "Makes more wind", "Makes the Sun brighter", "Burns coal"], answer: 0, explain: "The sun sets and the wind drops, so batteries save extra electricity to use when it's needed." },
  { id: "q9", q: "Which change would cut a city's pollution the most?", options: ["Replacing a coal power plant with solar and wind", "Leaving more lights on", "Building a bigger car park", "Using more plastic bags"], answer: 0, explain: "Coal power is one of the biggest sources of greenhouse gases, so swapping it for clean energy has a big effect." },
  { id: "q10", q: "Why is coal called a 'fossil' fuel?", options: ["It formed from ancient plants and animals over millions of years", "It is found in museums", "It is made in factories", "It is made from old bones of dinosaurs only"], answer: 0, explain: "Coal, oil and gas formed from plants and animals that lived long ago and were buried." },
  { id: "q11", q: "What can happen to coral reefs when the ocean gets too warm?", options: ["They bleach and can die", "They grow faster", "They turn into islands", "Nothing at all"], answer: 0, explain: "Heat stress makes corals push out the tiny algae that give them colour and food. This is called coral bleaching." },
  { id: "q12", q: "What is carbon capture?", options: ["Technology that removes carbon dioxide from the air or smokestacks", "Catching carbon in a net", "A type of coal", "Burning wood faster"], answer: 0, explain: "Carbon capture pulls CO₂ out and stores it safely so it can't warm the planet." },
  { id: "q13", q: "Which is an example of ADAPTATION to climate change?", options: ["Building a sea wall to protect homes", "Burning more coal", "Using more plastic", "Leaving lights on"], answer: 0, explain: "Adaptation means getting ready for changes that are already happening. Mitigation means reducing the causes." },
  { id: "q14", q: "Which of these is an example of MITIGATION?", options: ["Building a solar farm", "Building a flood barrier", "Opening a cooling centre", "Hiring more firefighters"], answer: 0, explain: "Mitigation reduces greenhouse gases. The other choices help people cope with the effects, which is adaptation." },
  { id: "q15", q: "Which home upgrade saves the most energy for years to come?", options: ["Good insulation", "Leaving the TV on standby", "Opening windows while the heater is on", "Using old, bright light bulbs"], answer: 0, explain: "Insulation keeps heat in during winter and out during summer, so heaters and air conditioners work less." },
  { id: "q16", q: "Rubbish rotting in landfill makes which greenhouse gas?", options: ["Methane", "Helium", "Oxygen", "Neon"], answer: 0, explain: "Rotting food and plants make methane, which traps a lot of heat. Composting and recycling help." },
  { id: "q17", q: "Which way of travelling makes the least pollution per person?", options: ["Riding a bike", "Driving alone", "Flying", "A big truck"], answer: 0, explain: "Walking and cycling make almost no pollution. Buses and trains are also much cleaner per person than cars." },
  { id: "q18", q: "About how much has Earth warmed since before people started burning lots of fossil fuels?", options: ["About 1.1°C", "About 0.01°C", "About 11°C", "About 50°C"], answer: 0, explain: "Earth is about 1.1°C warmer. It sounds small, but it's an average across the whole planet and it changes weather a lot." },
  { id: "q19", q: "What does 'emissions' mean?", options: ["Gases released into the air", "Money from taxes", "Rain clouds", "Solar panels"], answer: 0, explain: "Emissions are gases released into the air, such as the CO₂ that comes out of power plants and car exhausts." },
  { id: "q20", q: "Why can't we use only solar power without batteries?", options: ["The Sun doesn't shine at night", "Solar panels make pollution", "Solar power is too cold", "Solar panels need coal"], answer: 0, explain: "Solar panels only work in daylight. Batteries, wind and other sources fill the gaps." },
  { id: "q21", q: "What happens if a city needs more electricity than it can make?", options: ["Blackouts", "Cheaper power", "More wind", "Nothing"], answer: 0, explain: "When demand is higher than supply, the power goes out. Cities plan ahead and build enough generation and storage." },
  { id: "q22", q: "What kind of weather makes bushfires more dangerous?", options: ["Hot, dry and windy", "Cool and rainy", "Cloudy and calm", "Snowy"], answer: 0, explain: "Heat dries out plants so they burn easily, and wind spreads fire fast. Climate change is making hot, dry days more common." },
  { id: "q23", q: "Which part of Earth soaks up lots of the extra heat and carbon dioxide?", options: ["The ocean", "The Moon", "Deserts only", "Clouds only"], answer: 0, explain: "The ocean absorbs most of the extra heat and about a quarter of our CO₂. That makes seawater warmer and more acidic." },
  { id: "q24", q: "Why does recycling aluminium cans help the climate?", options: ["Making a can from recycled metal uses far less energy than making a new one", "Cans are made of paper", "Cans grow on trees", "It makes the cans heavier"], answer: 0, explain: "Recycling aluminium saves about 95% of the energy, so fewer fossil fuels are burned." },
  { id: "q25", q: "Is the greenhouse effect always bad?", options: ["No. The natural effect keeps Earth warm enough to live on", "Yes, it should be stopped completely", "Yes, it only happens in cities", "No, it only happens on Mars"], answer: 0, explain: "Without any greenhouse gases Earth would be frozen. The problem is that people have added extra gases." },
  { id: "q26", q: "Why is coal called a non-renewable energy source?", options: ["It can't be replaced in a human lifetime", "It is very cheap", "It is dark", "It is very light"], answer: 0, explain: "It takes millions of years to form, so once we use it up it's gone." },
  { id: "q27", q: "How does a wind turbine make electricity?", options: ["Wind spins the blades, which turn a generator", "It burns wind", "It stores the Sun", "It uses coal"], answer: 0, explain: "Moving air turns the blades. The blades turn a generator that makes electricity. No fuel is burned." },
  { id: "q29", q: "Does a nuclear power station release greenhouse gases while it makes electricity?", options: ["Almost none, but it makes radioactive waste", "Lots of carbon dioxide, like coal", "More than gas power stations", "It releases methane"], answer: 0, explain: "Nuclear plants don't burn fuel, so they make almost no CO₂ while running. They do make radioactive waste that must be stored safely for a very long time." },
  { id: "q30", q: "Which of these is a challenge of nuclear power?", options: ["It makes radioactive waste that needs safe storage", "It only works at night", "It needs coal to run", "It makes lots of methane"], answer: 0, explain: "Nuclear power also costs a lot and takes years to build. Every energy source has trade-offs." },
  { id: "q31", q: "Why is nuclear power called 'baseload' power?", options: ["It runs steadily day and night, whatever the weather", "It only runs when it's windy", "It only runs in summer", "It runs on batteries"], answer: 0, explain: "Baseload power is always available. Solar and wind change with the weather, so they are often paired with baseload power or batteries." },
  { id: "q32", q: "How does a nuclear power station make heat?", options: ["By splitting atoms", "By burning coal", "By burning wood", "By using sunlight"], answer: 0, explain: "Splitting atoms is called nuclear fission. It releases a lot of heat, which makes steam that spins a turbine." },
  { id: "q28", q: "A very cold day happens. What does it tell us about climate change?", options: ["Not much, because one day is weather, not climate", "Climate change is fake", "It is definitely getting colder", "The Sun has gone out"], answer: 0, explain: "Scientists look at average temperatures over many years across the whole world, not single days." },
];

// ---------- CLIMATE COACH ----------
// The coach looks at how the city is going and gives the first matching tip it hasn't shown recently.
// The conditions run inside the game, so they can use the game's variables.
const coachTips = [
  { id: "welcome", title: "🧑‍🏫 Welcome, Mayor!", when: () => totalMonths() === 0,
    text: "Your city runs on coal. Burning coal makes greenhouse gases, so pollution is going up every month. Build clean energy like solar farms and plant forests to bring it back down. Check the Pollution Report to see what's making pollution." },
  { id: "crisis", title: "🚨 Pollution is dangerous!", when: () => pollution >= 100,
    text: "Pollution is very high. Coal plants are the biggest cause. Plant forests (they soak up carbon dioxide), build solar or wind, and sell coal plants if you have enough clean power to replace them." },
  { id: "blackout", title: "⚡ Power shortage", when: () => getEnergyBalance() < 0,
    text: "Your city needs more electricity (demand) than it makes (supply), so there's a blackout risk. Offices, factories and more people all use power. Build more generation before you build more things that use it." },
  { id: "coalheavy", title: "🏭 Coal is making most of your pollution", when: () => coal >= 5 && pollution >= 70,
    text: "Coal is a fossil fuel. Each plant adds 2 pollution a month. Solar and wind add none, and forests take pollution out. Try swapping a few coal plants for clean energy." },
  { id: "forest", title: "🌳 No forests yet", when: () => forest === 0,
    text: "Forests are carbon sinks. They take carbon dioxide out of the air and store it. They're cheap to build and a great way to push pollution down." },
  { id: "storage", title: "🔋 Sun and wind aren't steady", when: () => getEnergyBalance() > 80 && batteryUnlocked && batteries === 0,
    text: "You have spare electricity, but the sun sets and the wind drops. Batteries save the extra so you can use it during shortages. That's called energy storage." },
  { id: "batteryresearch", title: "🔬 Sunny days don't last", when: () => !batteryUnlocked && (solar + wind) >= 4,
    text: "Clean energy depends on the weather. Research Battery Technology so you can store spare power for cloudy or still days." },
  { id: "idlelab", title: "🔬 The Research Centre is empty", when: () => activeResearch === null && money >= 800 && totalMonths() >= 3,
    text: "Scientists help us discover cleaner ways to live. Pick a project in the Research Centre. Some unlock new buildings and others clean up the city straight away." },
  { id: "capture", title: "🌎 Carbon capture is ready", when: () => carbonCaptureUnlocked && capturePlants === 0,
    text: "Carbon Capture Plants remove carbon dioxide from the air, but they use electricity. They work best on a grid that is already powered by clean energy." },
  { id: "nuclearready", title: "⚛ Your city is big enough for nuclear power", when: () => population >= NUCLEAR_MIN_POP && !nuclearUnlocked && activeResearch === null && money >= 3000,
    text: "Nuclear plants make a lot of steady electricity with almost no greenhouse gas, but they cost a lot, make radioactive waste and worry some people. Is it right for your city? Research it and weigh up the pros and cons." },
  { id: "nuclearwaste", title: "☢ Nuclear waste is building up", when: () => nuclearWaste >= 12,
    text: "Radioactive waste stays harmful for a very long time, so it has to be stored safely. Storage costs $1 per unit every month, and it keeps costing even if you shut a plant down. Think about long-term costs." },
  { id: "landlimit", title: "🗺 Running out of space", when: () => X.map && freeTilesFor("solar") <= 3,
    text: "Solar and wind farms need a lot of land, and your map is nearly full. Sell old coal plants to free up tiles, or look at options that need less space: offshore wind, hydro, geothermal, efficiency policies or nuclear power." },
  { id: "approval", title: "🏛 People are unhappy", when: () => approval < 35,
    text: "Approval drops when people suffer blackouts, pollution and disasters you ignore. Fixing power, cleaning the air and looking after residents all help." },
  { id: "money", title: "💸 Running low on funds", when: () => money < 150,
    text: "Every building costs money to maintain each month. Selling spare electricity and keeping people happy brings in funds. Choose upgrades carefully." },
  { id: "good", title: "🌟 Great work!", when: () => getCleanShare() >= 50 && pollution < 60,
    text: "More than half of your electricity is clean and pollution is under control. This is what real countries are aiming for. Keep going and see how low you can get pollution." },
  { id: "mix", title: "🌱 Energy mix", when: () => getCleanShare() > 0 && getCleanShare() < 50,
    text: "Your energy mix shows how much of your power is clean. Real countries are working to raise this number. Can you get yours to 100%?" },
];

// ---------- GAME OVER ADVICE ----------
const gameOverTips = {
  pollution: [
    "Coal plants add pollution every month. Replacing them with solar or wind stops that.",
    "Forests soak up carbon dioxide, and they are cheap to build.",
    "Check the Pollution Report each month. It shows which buildings push pollution up and which pull it down.",
    "Research Carbon Capture to remove pollution after it's made, but remember it uses electricity.",
    "A big city can research Nuclear Power for steady electricity with almost no greenhouse gas. Just plan for the waste.",
  ],
  energy: [
    "Demand grows as your population and buildings grow, so build power before you need it.",
    "Offices and factories use a lot of electricity. Make sure there is spare power first.",
    "Batteries store spare power for cloudy and still days.",
    "Heatwaves raise demand and storms cut wind power, so keep a buffer.",
    "Nuclear plants run steadily in any weather, which helps keep the lights on. They need a big city, though.",
  ],
  approval: [
    "Blackouts cost you 10 approval each time. Keep supply above demand.",
    "Say yes to events that protect people, like cooling centres, flood protection and bushfire crews.",
    "High pollution makes people leave and makes them unhappy. Clean energy helps approval too.",
  ],
};

// ---------- STAGE 2: words, quiz questions and tips for the climate model, new power, policies and the map ----------

glossary.push(
  { id: "interest", icon: "🏦", term: "Interest", definition: "The extra money you pay a bank for borrowing. A 1.5% monthly rate on $1,000 costs $15 every month until you pay it back." },
  { id: "landuse", icon: "🗺", term: "Land use", definition: "How land is shared between homes, farms, nature, industry and energy. Solar and wind farms need lots of space, so planning where things go matters." },
);

quizQuestions.push(
  { id: "q40", q: "Why does natural gas still cause climate change?", options: ["Burning it releases carbon dioxide", "It is made of water", "It cools the air", "It only makes oxygen"], answer: 0, explain: "Gas makes about half the CO₂ of coal for the same electricity, but it is still a fossil fuel." },
  { id: "q41", q: "What does a hydro dam use to make electricity?", options: ["Falling water spinning a turbine", "Burning wood", "Sunlight on panels", "Hot rocks"], answer: 0, explain: "Water held behind a dam falls through turbines. It's clean and steady, but dams change rivers and need the right place." },
  { id: "q42", q: "Where does geothermal energy come from?", options: ["Heat from deep underground", "The Moon", "Ocean waves", "Burning rubbish"], answer: 0, explain: "In some places hot rock is close to the surface. Its heat makes steam that spins turbines, day and night." },
  { id: "q43", q: "Why are wind farms often built out at sea?", options: ["The wind is stronger and steadier there", "Fish need the electricity", "It is cheaper to build at sea", "There is no wind on land"], answer: 0, explain: "Offshore wind blows harder and more often, and it doesn't use land, but building at sea costs more." },
  { id: "q44", q: "What is a climate tipping point?", options: ["A point where a natural system flips into a big change that is hard to undo", "The hottest day of the year", "A place to leave tips for scientists", "When it starts to rain"], answer: 0, explain: "Examples include coral reefs dying and permafrost thawing. Scientists warn many could be crossed between 1.5°C and 2°C of warming." },
  { id: "q45", q: "Why does Earth keep warming for years after pollution is cut?", options: ["The oceans take a long time to heat up, and CO₂ stays in the air", "Thermometers are slow", "The Sun gets brighter each year", "It doesn't, it stops at once"], answer: 0, explain: "CO₂ lasts in the air for centuries and the oceans warm slowly, so today's choices show up over many years." },
  { id: "q46", q: "What does a carbon tax do?", options: ["Makes polluters pay for their greenhouse gas", "Pays people to burn coal", "Bans all cars", "Plants trees automatically"], answer: 0, explain: "When pollution costs money, clean options become the cheaper choice for businesses and families." },
  { id: "q47", q: "How does a sea wall help a coastal city?", options: ["It holds back flood water from rising seas and storms", "It stops the sea from warming", "It makes the sea level fall", "It produces electricity"], answer: 0, explain: "Sea walls are adaptation: they protect people from changes that are already happening." },
  { id: "q48", q: "A heat pump warms a home. Why is it better than an old electric heater?", options: ["It moves heat from outside instead of making it, so it uses less power", "It burns gas", "It is louder", "It only works in summer"], answer: 0, explain: "Heat pumps can give out three or more times the energy they use, a big efficiency win." },
  { id: "q49", q: "CO₂ in the air is measured in 'ppm'. What does that mean?", options: ["Parts per million", "Pollution per month", "People per mile", "Power per minute"], answer: 0, explain: "It was about 280 ppm before factories. Today it is over 420 ppm." },
  { id: "q50", q: "Why can't a city cover all its land with solar farms?", options: ["Land is also needed for homes, farms and nature", "Solar panels don't work on land", "The Sun would run out", "It is against the law everywhere"], answer: 0, explain: "Planning land use means balancing energy, food, housing and wildlife. Rooftops, offshore wind and efficiency help save land." },
  { id: "q51", q: "Why do nuclear power plants usually sit next to a river, lake or the sea?", options: ["They need lots of water for cooling", "The waste is thrown in the water", "Boats deliver the electricity", "Fish help run them"], answer: 0, explain: "Nuclear and many other power stations turn water into steam and need cooling water to keep running." },
);

// Important warnings go near the front so the coach shows them first.
coachTips.splice(
  2,
  0,
  { id: "nearTipping", title: "⚠ A tipping point is close", when: () => TIPPING_POINTS.some((p) => !X.tipped[p.id] && X.temp >= p.temp - 0.15),
    text: "Warming is close to a tipping point. Once it's crossed, the damage stays even if you cut pollution later. Warming lags years behind pollution, so cut emissions now." },
  { id: "debt", title: "🏦 The bank is worried", when: () => X.bankruptMonths > 0 || X.loan > creditLimit() * 0.8,
    text: "Your loan is close to (or over) the bank's limit. Unpaid bills go onto the loan, and interest grows every month. Sell buildings you don't need and cut upkeep before the city goes bankrupt." },
  { id: "flooding", title: "🌊 The coast is flooding", when: () => X.map && X.map.flood > 0,
    text: "The sea has risen enough to flood your lowest coast, and anything built there is lost. Sea Walls (Policy tab) hold the water back. Build important things on higher ground, away from the beach." },
  { id: "placing", title: "🗺 Plan your map", when: () => totalMonths() >= 1 && totalMonths() <= 6,
    text: "Every building needs a tile. Hydro dams go on 💧 river rapids, geothermal on ♨ hot springs, offshore wind on 🌊 shallow sea, and nuclear plants next to water. Homes spread out from the town hall as people move in, so leave room!" },
);

coachTips.push(
  { id: "gasbridge", title: "🔥 Gas is a bridge, not a fix", when: () => X.plants.gas >= 3,
    text: "Gas plants pollute half as much as coal, but they still pollute. Use them to keep the lights on while you build clean power, then close them." },
  { id: "taxidea", title: "💲 Try a carbon tax", when: () => X.carbonTax === 0 && totalMonths() >= 24 && coal + X.plants.gas >= 4,
    text: "A carbon tax makes polluters pay. It raises money for clean projects and makes coal and gas dearer to run. People grumble a little about prices." },
);

gameOverTips.bankrupt = [
  "Every building has upkeep. Check the build menu tooltips before you build, and sell what you don't need.",
  "Loans cost 1.5% interest every month. Borrow for things that pay you back, like power you can sell.",
  "If money runs out, unpaid bills go onto the loan. Keep a little money spare for bad months.",
];

// ---------- STAGE 3: districts, air quality and planning ----------

glossary.push(
  { id: "airquality", icon: "😷", term: "Air quality", definition: "How clean the air is to breathe. Smoke from coal, gas and factories makes the air near them unhealthy, even when the greenhouse gas spreads around the whole world." },
  { id: "urbanplanning", icon: "🏘", term: "Urban planning", definition: "Deciding where homes, shops, factories, parks and power go in a city, so people live well and the city works." },
);

quizQuestions.push(
  { id: "q52", q: "Why do city planners keep factories and power stations away from homes?", options: ["Their smoke makes the air unhealthy to breathe nearby", "Factories are scared of houses", "Homes make factories dirty", "It makes electricity faster"], answer: 0, explain: "Local air pollution causes breathing problems, so planners put a gap, or a park, between industry and homes." },
  { id: "q53", q: "How can trees and parks help a neighbourhood?", options: ["They clean the air, give shade and make people happier", "They make the air smokier", "They use lots of electricity", "They make it hotter in summer"], answer: 0, explain: "Trees catch dust, soak up CO₂, cool streets with shade and give people green places to relax." },
  { id: "q54", q: "Coal smoke causes two problems. Which pair is right?", options: ["Local air pollution and global warming", "Earthquakes and tides", "Snow and hail", "Louder birds and longer days"], answer: 0, explain: "The smoke harms people nearby, and its CO₂ warms the whole planet. Clean power fixes both." },
);

coachTips.splice(5, 0, {
  id: "smokyHomes", title: "😷 Smoke near homes", when: () => X.map && X.map.dn && neighbourhoodMood() <= -0.4,
  text: "Some homes are right next to smoky coal plants, gas plants or factories, and the people there are unhappy. Use the 💨 Air view on the map to find them. Move industry away, or plant forests in between.",
});

coachTips.push({
  id: "districtsIntro", title: "🏘 Your city has neighbourhoods", when: () => totalMonths() >= 8 && totalMonths() <= 20,
  text: "Press 🏘 Districts on the map to see your neighbourhoods. The Districts tab shows how much power each one uses and makes, how much it pollutes, and how happy its people are.",
});

// ---------- STAGE 3: the power grid ----------

glossary.push({ id: "grid", icon: "🔌", term: "Power grid", definition: "The network of power lines that carries electricity from power stations to homes and businesses. If a line is too small, places at the end of it can lose power even when there is enough electricity overall." });

quizQuestions.push(
  { id: "q55", q: "A city makes enough electricity, but one neighbourhood still has a blackout. What could be wrong?", options: ["The power lines to it are too small or broken", "The sun is too bright", "There are too many trees", "People used too little power"], answer: 0, explain: "Electricity has to travel through power lines. Full or damaged lines can't deliver it, so grids need upgrading as cities grow." },
  { id: "q56", q: "Why are big new solar and wind farms often waiting to be connected?", options: ["The grid needs new power lines to carry their electricity", "They make no electricity", "They are too quiet", "They only work in winter"], answer: 0, explain: "In many countries, clean power projects wait years for grid connections. Building power lines is a big part of the energy transition." },
);

coachTips.splice(5, 0, {
  id: "lineFull", title: "🔌 A power line is full", when: () => X.grid && Object.keys(X.grid.short).length > 0,
  text: "Part of your city had a blackout because a power line was full, even though the city made enough electricity. Open the Districts tab and upgrade the red line, or build power closer to where people live.",
});

// ---------- STAGE 4: people and politics ----------

glossary.push(
  { id: "election", icon: "🗳", term: "Election", definition: "When people vote to choose their leaders. A mayor who wants to stay in charge has to keep enough voters happy." },
  { id: "protest", icon: "📣", term: "Protest", definition: "When people gather to show they disagree with a decision. It's a peaceful way for citizens to be heard." },
  { id: "justtransition", icon: "🎓", term: "Just transition", definition: "Making sure workers in polluting industries, like coal mining, get help and new jobs when those industries close." },
);

quizQuestions.push(
  { id: "q57", q: "What is a 'just transition'?", options: ["Helping workers in polluting jobs find new work as those industries close", "Closing every factory overnight", "Moving the city to a new place", "Changing the city's name"], answer: 0, explain: "Climate action works better when nobody is left behind. Retraining coal workers for clean-energy jobs is one example." },
  { id: "q58", q: "Why might families and young voters disagree about a carbon tax?", options: ["It cuts pollution, but it can also raise prices for families", "Young people pay no taxes", "Families like pollution", "It only affects farmers"], answer: 0, explain: "Many climate policies have costs and benefits for different people. Some countries give the tax money back to families to keep it fair." },
  { id: "q59", q: "Why do leaders listen to many different groups before making big decisions?", options: ["Each group is affected differently, and all of them vote", "Only the biggest group matters", "It makes decisions slower on purpose", "Groups never disagree"], answer: 0, explain: "Good climate plans balance jobs, prices, health and the planet, so they keep enough people on side to last." },
);

coachTips.splice(2, 0, {
  id: "electionSoon", title: "🗳 Election coming up", when: () => electionsOn() && X.politics && monthsUntilElection() <= 6 && monthsUntilElection() > 0 && voteShare() < neededVote() + 8,
  text: "An election is coming and the vote is close. Open the 🗳 People tab to see which groups are unhappy and why, then use a support action or fix what bothers them most.",
});

coachTips.splice(5, 0, {
  id: "angryGroup", title: "📣 Some people are very unhappy", when: () => X.politics && GROUPS.some((g) => groupHappiness(g.id) < 30),
  text: "One group of citizens is very unhappy and may protest. Check the 🗳 People tab: it shows what they want, and a support action can win them back.",
});

coachTips.push({
  id: "peopleIntro", title: "🗳 Not everyone wants the same thing", when: () => totalMonths() >= 4 && totalMonths() <= 14,
  text: "Workers want jobs, families want clean air and low prices, businesses want growth, young voters want climate action, and farmers want good weather. The 🗳 People tab shows how each group feels, and there's an election every 4 years.",
});

// ---------- STAGE 5: the tech tree ----------

glossary.push(
  { id: "tidal", icon: "🌀", term: "Tidal power", definition: "Electricity from the tides. The Moon pulls the oceans in and out twice a day, so tidal power is very predictable." },
  { id: "biogas", icon: "♻", term: "Biogas", definition: "Gas made by bacteria breaking down food scraps, manure and sewage. Burning it for power stops methane, a strong greenhouse gas, leaking into the air." },
);

quizQuestions.push(
  { id: "q60", q: "Why is tidal power so predictable?", options: ["The tides follow the Moon, so we know when they'll come", "The sea is always calm", "It only works on sunny days", "Fish push the turbines"], answer: 0, explain: "Tides can be predicted years ahead, unlike wind or sunshine. The hard part is building machines that survive the sea." },
  { id: "q61", q: "How does a biogas plant help the climate?", options: ["It burns methane from waste instead of letting it leak", "It plants trees", "It cools the ocean", "It makes the waste disappear by magic"], answer: 0, explain: "Methane traps much more heat than CO₂. Burning it turns it into CO₂ and water, which is much less harmful, and makes power too." },
  { id: "q62", q: "Why do new technologies often build on older ones?", options: ["Scientists learn from earlier inventions", "Old inventions are always better", "They don't, every invention starts from nothing", "Because of the weather"], answer: 0, explain: "Offshore wind turbines grew out of land turbines, and big grid batteries grew out of phone and car batteries." },
);

coachTips.push({
  id: "techTree", title: "🔬 Plan your research", when: () => totalMonths() >= 10 && totalMonths() <= 24 && activeResearch === null,
  text: "Research is a tree: some projects unlock others. Clean energy brings new power stations, Storage & grid makes batteries and power lines better, and Adaptation protects you from extreme weather. Pick a path that fits your city.",
});

// ---------- STAGE 6: budget, carbon market and green grants ----------

glossary.push(
  { id: "subsidy", icon: "🏛", term: "Subsidy", definition: "Money a government gives to help pay for something it wants more of, like clean power, electric buses or home insulation." },
  { id: "carboncredit", icon: "🌳", term: "Carbon credit", definition: "Proof that one amount of greenhouse gas was kept out of, or taken out of, the air. Companies buy credits to make up for pollution they can't cut yet." },
  { id: "budget", icon: "📒", term: "Budget", definition: "A plan of the money coming in and going out. Cities have to balance what they spend on running things with what they invest for the future." },
);

quizQuestions.push(
  { id: "q63", q: "What is a carbon credit?", options: ["Proof that some greenhouse gas was kept out of the air", "A coupon for free electricity", "A bank card made from trees", "A fine for driving too fast"], answer: 0, explain: "Credits can be sold to companies that still pollute. They only help if the clean-up is real and wouldn't have happened anyway." },
  { id: "q64", q: "Why do governments give green grants (subsidies)?", options: ["To help pay for things they want more of, like clean power", "To make electricity dearer", "Because they have too much money", "To pay for more coal"], answer: 0, explain: "Subsidies make clean choices cheaper. Many countries pay part of the cost of solar panels, heat pumps or electric cars." },
  { id: "q65", q: "A city earns $5,000 a month and spends $5,500. What will happen if nothing changes?", options: ["It will run out of money and have to borrow", "It will get richer", "Nothing, the numbers are the same", "The extra money appears by itself"], answer: 0, explain: "Spending more than you earn every month means debt keeps growing. Cutting costs or earning more balances the budget." },
);

coachTips.splice(3, 0, {
  id: "losingMoney", title: "📉 The city is losing money", when: () => X.budget && X.budget.history.length >= 3 && X.budget.history.slice(-3).every((h) => h.running < 0),
  text: "For three months in a row the city has spent more than it earned. Open the 💰 Budget tab to see where the money goes. Big-city upkeep and loan interest are often the hidden costs.",
});

coachTips.push({
  id: "carbonMarket", title: "🌳 Sell your clean-up", when: () => X.budget && !X.budget.market && lastBreakdown && Object.keys(lastBreakdown).reduce((sum, key) => sum + (key === "weather" ? 0 : lastBreakdown[key]), 0) < 0,
  text: "Your city now removes more pollution than it makes. Join the carbon market in the 🌍 Policy tab and get paid for every extra unit you clean up.",
});
