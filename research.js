const researchProjects = {
  wind: {
    id: "wind",
    icon: "🌬",
    name: "Wind Energy",
    description:
      "Unlocks Wind Turbines. Wind power makes electricity without burning fossil fuels.",
    cost: 400,
    monthsRequired: 10,
    unlocked: false,
  },

  battery: {
    id: "battery",
    icon: "🔋",
    name: "Battery Technology",
    description:
      "Unlocks Battery Storage. Batteries save spare electricity for when the sun isn't shining or the wind isn't blowing.",
    cost: 800,
    monthsRequired: 15,
    unlocked: false,
  },

  solar2: {
    id: "solar2",
    icon: "☀",
    name: "Solar Panels II",
    description:
      "Solar Farms you build after this make 30 MW instead of 20 MW.",
    cost: 500,
    monthsRequired: 8,
    unlocked: false,
  },

  greenCity: {
    id: "greenCity",
    icon: "🏙",
    name: "Green City Program",
    description:
      "Launches a sustainability initiative that improves approval and reduces pollution.",
    cost: 1200,
    monthsRequired: 10,
    unlocked: false,
  },

  electricBuses: {
    id: "electricBuses",
    icon: "🚌",
    name: "Electric Bus Network",
    description:
      "Cleaner public transport that reduces pollution across the city.",
    cost: 1800,
    monthsRequired: 12,
    unlocked: false,
  },

  carbonCapture: {
    id: "carbonCapture",
    icon: "🌎",
    name: "Carbon Capture",
    description:
      "Unlocks Carbon Capture Plants. Each one removes 4 pollution a month, but uses 40 MW of electricity.",
    cost: 2500,
    monthsRequired: 18,
    unlocked: false,
  },

  nuclear: {
    id: "nuclear",
    icon: "⚛",
    name: "Nuclear Power",
    description:
      "Unlocks Nuclear Power Plants: 300 MW each, steady in any weather, and no greenhouse gas while running. But they cost a lot, make radioactive waste and worry some residents. Needs a population of 20,000.",
    cost: 3000,
    monthsRequired: 24,
    requires: { population: 20000 },
    unlocked: false,
  },

  advancedSolar: {
    id: "advancedSolar",
    icon: "⚡",
    name: "Advanced Solar Farms",
    description:
      "Solar Farms you build after this make 45 MW each, much more than before.",
    cost: 2200,
    monthsRequired: 30,
    unlocked: false,
  },
};
