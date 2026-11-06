// Each event has two choices. "learns" are dictionary words unlocked when it appears,
// "acceptTerm" is unlocked if the player picks the first choice.
const events = [
  {
    id: "bushfire",
    title: "🔥 Bushfire Warning",
    description: "Hot and dry conditions have increased bushfire risk near the city.",
    education:
      "Bushfires are becoming more common in some places because climate change can create hotter and drier conditions.",
    realLife:
      "Australia's Black Summer fires in 2019–20 burned millions of hectares. Fire seasons are getting longer, so towns invest in fire crews and early warnings.",
    learns: ["extreme"],
    acceptTerm: "adaptation",
    acceptText: "Deploy Firefighters ($300)",
    declineText: "Do Nothing",
    accept: { money: -300, pollution: 2, approval: 3, population: 0, news: "🔥 Firefighters contained most of the bushfire." },
    decline: { money: 0, pollution: 12, approval: -8, population: -50, news: "🔥 Bushfires caused significant environmental damage." },
  },

  {
    id: "heatwave",
    title: "🌡 Heatwave",
    description: "Extreme temperatures are affecting residents across the city.",
    education: "Heatwaves are becoming more frequent and more intense as global temperatures rise.",
    realLife:
      "Heatwaves are one of Australia's deadliest natural hazards. Cooling centres, shady trees and checking on neighbours all save lives.",
    learns: ["extreme"],
    acceptTerm: "adaptation",
    acceptText: "Open Cooling Centres ($200)",
    declineText: "Take No Action",
    accept: { money: -200, pollution: 0, approval: 4, population: 0, news: "🌡 Cooling centres helped residents stay safe." },
    decline: { money: 0, pollution: 2, approval: -6, population: -30, news: "🌡 Residents struggled during the heatwave." },
  },

  {
    id: "oilspill",
    title: "🛢 Oil Spill",
    description: "An oil company spilled oil at your port and has offered you a bribe to let it go.",
    education: "Oil spills can cause long-term environmental damage and harm wildlife.",
    realLife:
      "Oil spills coat seabirds and sea animals, and clean-ups can take years. Companies are legally responsible for the damage they cause.",
    learns: ["ecosystem"],
    acceptText: "Take Them to Jail ($200)",
    declineText: "Take the Bribe (+$500)",
    accept: { money: -200, pollution: 0, approval: 7, population: 10, news: "🛢 Residents approved of holding the oil company accountable." },
    decline: { money: 500, pollution: 30, approval: -6, population: -80, news: "🌊 The oil spill damaged ecosystems and reduced confidence in city leadership." },
  },

  {
    id: "flood",
    title: "🌧 Flood Warning",
    description: "Heavy rainfall is expected across the region.",
    education: "Warmer air can hold more moisture, which can increase the risk of heavy rainfall and flooding.",
    realLife:
      "Flood-ready cities build levees and drains, and keep homes off floodplains. Preparing for floods before they arrive costs far less than repairing them afterwards.",
    learns: ["extreme"],
    acceptTerm: "adaptation",
    acceptText: "Build Flood Protection ($250)",
    declineText: "Take The Risk",
    accept: { money: -250, pollution: 0, approval: 2, population: 0, news: "🌧 Flood defences protected the city." },
    decline: { money: -400, pollution: 1, approval: -5, population: -30, news: "🌧 Flooding damaged homes and businesses." },
  },

  {
    id: "communityTrees",
    title: "🌳 Community Tree Day",
    description: "Residents want to plant trees across the city.",
    education: "Trees absorb carbon dioxide from the atmosphere and help reduce the effects of climate change.",
    realLife:
      "Trees also make shade that can cool a street by several degrees, and they give animals a home. Many councils run tree-planting days.",
    learns: ["carbonsink"],
    acceptTerm: "mitigation",
    acceptText: "Support Event ($100)",
    declineText: "Decline",
    accept: { money: -100, pollution: -10, approval: 6, population: 0, news: "🌳 Thousands of trees were planted." },
    decline: { money: 0, pollution: 0, approval: -2, population: 0, news: "🌳 The project was cancelled." },
  },

  {
    id: "governmentGrant",
    title: "💰 Government Climate Grant",
    description: "Funding is available for environmental projects.",
    education:
      "Governments can help reduce emissions by investing in renewable energy and sustainability projects.",
    realLife:
      "Real governments run programs that help families put solar panels and batteries on their homes, and that help towns build clean energy.",
    learns: ["renewable"],
    acceptTerm: "mitigation",
    acceptText: "Accept Grant",
    declineText: "Decline Grant",
    accept: { money: 500, pollution: -2, approval: 3, population: 0, news: "💰 The city received funding for climate projects." },
    decline: { money: 0, pollution: 0, approval: -2, population: 0, news: "💰 Funding opportunity declined." },
  },

  {
    id: "oceanWarning",
    title: "🌊 Coastal Erosion",
    description: "Coastal communities are experiencing damage from rising sea levels.",
    education: "Global sea levels have risen because oceans warm and land ice melts.",
    realLife:
      "Global sea level has risen about 20 cm since 1900, and it is rising faster now. Coastal towns build sea walls and restore dunes and mangroves.",
    learns: ["sealevel"],
    acceptTerm: "adaptation",
    acceptText: "Fund Protection ($400)",
    declineText: "Ignore Issue",
    accept: { money: -400, pollution: 0, approval: 4, population: 0, news: "🌊 Coastal protection reduced damage." },
    decline: { money: -250, pollution: 0, approval: -6, population: -50, news: "🌊 Coastal erosion damaged homes and infrastructure." },
  },

  {
    id: "renewableExpo",
    title: "⚡ Renewable Energy Expo",
    description: "A clean energy exhibition is coming to the city.",
    education:
      "Renewable energy sources such as solar and wind power can generate electricity without burning fossil fuels.",
    realLife:
      "In many countries, including Australia, new solar and wind farms are now among the cheapest ways to make electricity.",
    learns: ["renewable"],
    acceptTerm: "mitigation",
    acceptText: "Sponsor Event ($150)",
    declineText: "Skip Event",
    accept: { money: -150, pollution: -4, approval: 5, population: 0, news: "⚡ Interest in renewable energy increased." },
    decline: { money: 0, pollution: 0, approval: -1, population: 0, news: "⚡ The event was cancelled." },
  },

  {
    id: "populationboom",
    title: "👥 Population Boom",
    description: "People are moving to the city in droves.",
    education:
      "More people means more homes, more cars and more electricity. Cities that grow need clean energy to grow with them.",
    realLife:
      "Planners have to make sure power, water, transport and parks keep up when a city grows quickly.",
    acceptText: "Sponsor New Residents ($250)",
    declineText: "Refuse New Residents",
    accept: { money: -250, pollution: 5, approval: 5, population: 400, news: "👥 Many new people moved to Adrianville." },
    decline: { money: 0, pollution: 0, approval: 0, population: 0, news: "👥 The city turned new residents away." },
  },

  {
    id: "populationloss",
    title: "👥 Population Loss",
    description: "People are moving away from the city in droves.",
    education:
      "People move to places with jobs, clean air and a good future. Pollution and disasters can make people leave.",
    realLife:
      "When a place becomes hard to live in, because of floods, fires or pollution, families may move somewhere safer.",
    acceptText: "Convince Residents to Stay ($250)",
    declineText: "Let Them Leave",
    accept: { money: -250, pollution: 0, approval: 5, population: 0, news: "👥 Residents decided to remain in Adrianville." },
    decline: { money: 0, pollution: 0, approval: -5, population: -200, news: "👥 Many residents chose to leave the city." },
  },

  {
    id: "homeEfficiency",
    title: "🏠 Home Efficiency Program",
    description: "Residents are asking for help upgrading insulation and sealing homes.",
    education: "Improving home efficiency can reduce energy use and lower emissions.",
    realLife:
      "Good insulation, sealed gaps and LED lights can cut a home's energy use a lot, and they save families money on power bills.",
    learns: ["efficiency"],
    acceptTerm: "mitigation",
    acceptText: "Fund Program ($350)",
    declineText: "Decline",
    accept: { money: -350, pollution: -6, approval: 5, population: 0, news: "🏠 More efficient homes reduced electricity demand." },
    decline: { money: 0, pollution: 2, approval: -3, population: 0, news: "🏠 Home efficiency improvements were delayed." },
  },

  {
    id: "recycling",
    title: "♻ Recycling Drive",
    description: "Students are asking the city to start a big recycling and composting program.",
    education:
      "Recycling saves energy and keeps rubbish out of landfill, where rotting food makes methane, a powerful greenhouse gas.",
    realLife:
      "Recycling an aluminium can uses about 95% less energy than making a new one from raw ore.",
    learns: ["recycling"],
    acceptTerm: "mitigation",
    acceptText: "Start Program ($120)",
    declineText: "Not Now",
    accept: { money: -120, pollution: -3, approval: 4, population: 0, news: "♻ Recycling and composting cut the city's waste." },
    decline: { money: 0, pollution: 1, approval: -2, population: 0, news: "♻ The recycling drive was postponed." },
  },

  {
    id: "earthHour",
    title: "💡 Earth Hour",
    description: "The city is invited to switch off its lights for one hour to show it cares about the planet.",
    education:
      "Saving electricity means fewer fossil fuels are burned. Small actions by lots of people add up.",
    realLife:
      "Earth Hour began in Sydney in 2007 and is now celebrated in countries all around the world.",
    learns: ["efficiency"],
    acceptTerm: "mitigation",
    acceptText: "Join Earth Hour (Free)",
    declineText: "Skip It",
    accept: { money: 0, pollution: -2, approval: 3, population: 0, news: "💡 The city switched off its lights for Earth Hour." },
    decline: { money: 0, pollution: 0, approval: -1, population: 0, news: "💡 The city skipped Earth Hour." },
  },

  {
    id: "nuclearDebate",
    title: "⚛ Nuclear Power Debate",
    description:
      "Residents are arguing about nuclear power. Some want low-carbon electricity, while others worry about waste and safety.",
    education:
      "Nuclear plants don't burn fuel, so they make almost no greenhouse gas while running. But they make radioactive waste, cost a lot to build and need strict safety rules.",
    realLife:
      "France makes about two-thirds of its electricity from nuclear power, while Germany chose to close its plants. Countries disagree because every energy source has trade-offs.",
    learns: ["nuclear"],
    acceptText: "Hold Public Information Sessions ($150)",
    declineText: "Stay Silent",
    accept: { money: -150, pollution: 0, approval: 4, population: 0, news: "⚛ Information sessions helped residents understand the facts." },
    decline: { money: 0, pollution: 0, approval: -3, population: 0, news: "⚛ Residents felt left out of the nuclear debate." },
  },

  {
    id: "nuclearInspection",
    title: "🛡 Nuclear Safety Inspection",
    description: "Independent inspectors are checking the safety of your nuclear power plants.",
    education:
      "Nuclear plants have many safety systems, strict rules and regular checks. Safety costs money, but it protects people and the environment.",
    realLife:
      "Every country that uses nuclear power has an independent safety regulator that inspects its plants.",
    learns: ["radwaste"],
    acceptTerm: "adaptation",
    acceptText: "Pay for Safety Upgrades ($300)",
    declineText: "Delay Upgrades",
    accept: { money: -300, pollution: 0, approval: 4, population: 0, news: "🛡 Safety upgrades passed inspection. Residents feel safer." },
    decline: { money: 0, pollution: 8, approval: -6, population: -50, news: "🛡 A safety scare worried residents and some families moved away." },
  },

  {
    id: "bikeLanes",
    title: "🚲 Bike Lanes",
    description: "Residents want safe bike lanes and more footpaths so people can leave the car at home.",
    education:
      "Cars and trucks make a big share of transport pollution. Walking, riding and public transport make much less.",
    realLife:
      "Cities that build safe bike lanes see more people riding, which cuts pollution, traffic and noise.",
    learns: ["transport"],
    acceptTerm: "mitigation",
    acceptText: "Build Bike Lanes ($300)",
    declineText: "Decline",
    accept: { money: -300, pollution: -5, approval: 4, population: 0, news: "🚲 More people started riding and walking." },
    decline: { money: 0, pollution: 2, approval: -3, population: 0, news: "🚲 Traffic and pollution stayed high." },
  },
];
