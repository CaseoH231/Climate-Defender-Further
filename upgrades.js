const upgrades = {
  wind: {
    name: "Wind Energy",
    apply() {
      windUnlocked = true;
      learnTerm("renewable");
      addNews(
        "🌬 RESEARCH COMPLETE: Wind Turbines unlocked! Wind power creates electricity without burning fossil fuels.",
      );
      updateUI();
    },
  },

  battery: {
    name: "Battery Technology",
    apply() {
      batteryUnlocked = true;
      learnTerm("storage");
      addNews(
        "🔋 RESEARCH COMPLETE: Battery Storage unlocked! Each battery stores up to 100 MW of spare electricity for later.",
      );
      updateUI();
    },
  },

  solar2: {
    name: "Solar Panels II",
    apply() {
      solarUpgrade = true;
      addNews(
        "☀ RESEARCH COMPLETE: Solar Panels II unlocked! New solar farms now make 30 MW.",
      );
      updateUI();
    },
  },

  greenCity: {
    name: "Green City Program",
    apply() {
      approval += 10;
      pollution -= 10;
      pollution = Math.max(0, pollution);
      learnTerm("mitigation");
      addNews(
        "🏙 RESEARCH COMPLETE: Green City Program launched! Sustainability projects improved city conditions.",
      );
      updateUI();
    },
  },

  electricBuses: {
    name: "Electric Bus Network",
    apply() {
      approval += 5;
      pollution -= 8;
      pollution = Math.max(0, pollution);
      learnTerm("transport");
      addNews(
        "🚌 RESEARCH COMPLETE: Electric Bus Network introduced. Cleaner public transport reduces emissions.",
      );
      updateUI();
    },
  },

  carbonCapture: {
    name: "Carbon Capture",
    apply() {
      carbonCaptureUnlocked = true;
      learnTerm("carboncapture");
      addNews(
        "🌎 RESEARCH COMPLETE: Carbon Capture unlocked! You can now build Carbon Capture Plants that remove pollution from the air.",
      );
      updateUI();
    },
  },

  nuclear: {
    name: "Nuclear Power",
    apply() {
      nuclearUnlocked = true;
      learnTerm("nuclear");
      addNews(
        "⚛ RESEARCH COMPLETE: Nuclear Power unlocked! Plants make 300 MW in any weather and no greenhouse gas while running, but they cost a lot, make radioactive waste and need strict safety. You need 20,000 residents for the first plant.",
      );
      updateUI();
    },
  },

  advancedSolar: {
    name: "Advanced Solar Farms",
    apply() {
      advancedSolarUnlocked = true;
      addNews(
        "⚡ RESEARCH COMPLETE: Advanced Solar Farms unlocked! New solar farms now make 45 MW each.",
      );
      updateUI();
    },
  },
};
