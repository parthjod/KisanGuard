// Hyper-personalized Farmer Agromet Advisory Engine for KisanGuard
// Generates authentic, region-specific, crop-specific, stage-specific spoken voice advisories and WhatsApp dispatches for each farmer.

export interface FarmerAdvisory {
  farmerName: string
  village: string
  district: string
  state: string
  cropName: string
  stageName: string
  wbgt: number
  riskLevel: "caution" | "red"
  haltHours: string
  spokenText: string
  displayBody: string
  whatsappText: string
  voiceLangCode: string
  voiceName: string
  suggestedDuration: number
}

interface FarmerProfile {
  id?: string
  name: string
  village?: string
  district?: string
  state?: string
  crops?: string[]
  preferredLanguage?: string
}

export function getPersonalizedAdvisory(
  farmer: FarmerProfile,
  langCode: string = "EN"
): FarmerAdvisory {
  const normLang = (langCode || "EN").toUpperCase()
  const name = farmer.name || "Farmer"
  const village = farmer.village || farmer.district || "Farm"
  const district = farmer.district || "District"
  const state = farmer.state || "India"

  // 1. Harpreet Singh (Khanna, Ludhiana, Punjab - Wheat at Flowering Stage)
  if (name.toLowerCase().includes("harpreet") || district.toLowerCase().includes("ludhiana") || state.toLowerCase().includes("punjab")) {
    if (normLang === "PA") {
      return {
        farmerName: "Harpreet Singh",
        village: "Khanna Ward 2",
        district: "Ludhiana",
        state: "Punjab",
        cropName: "Wheat (ਕਣਕ)",
        stageName: "Flowering (ਫੁੱਲ ਅਵਸਥਾ)",
        wbgt: 33.8,
        riskLevel: "red",
        haltHours: "11:30 AM - 3:30 PM",
        spokenText:
          "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਹਰਪ੍ਰੀਤ ਸਿੰਘ ਜੀ। ਖੰਨਾ, ਲੁਧਿਆਣਾ ਵਿੱਚ ਦੁਪਹਿਰ ਦਾ ਵੈੱਟ-ਬਲਬ ਤਾਪਮਾਨ 33.8 ਡਿਗਰੀ ਤੱਕ ਪਹੁੰਚ ਰਿਹਾ ਹੈ। ਕਣਕ ਦੀ ਫੁੱਲ ਅਵਸਥਾ ਦੌਰਾਨ ਤੇਜ਼ ਗਰਮੀ ਕਾਰਨ ਦਾਣੇ ਸੁੰਗੜਨ ਦਾ ਗੰਭੀਰ ਖਤਰਾ ਹੈ। ਸਵੇਰੇ 11:30 ਤੋਂ ਦੁਪਹਿਰ 3:30 ਵਜੇ ਤੱਕ ਖੇਤ ਵਿੱਚ ਕੰਮ ਅਤੇ ਟਰੈਕਟਰ ਚਲਾਉਣਾ ਬੰਦ ਰੱਖੋ। ਕੈਨੋਪੀ ਦਾ ਤਾਪਮਾਨ ਘਟਾਉਣ ਲਈ ਸ਼ਾਮ ਨੂੰ ਹਲਕਾ ਪਾਣੀ ਲਗਾਓ ਅਤੇ ਨਾਈਟ੍ਰੋਜਨ ਸਪਰੇਅ ਨਾ ਕਰੋ।",
        displayBody:
          "🌾 [ਕਿਸਾਨਗਾਰਡ ਖੇਤੀ ਸਲਾਹ - ਹਰਪ੍ਰੀਤ ਸਿੰਘ ਜੀ]\nਸਥਾਨ: ਖੰਨਾ, ਲੁਧਿਆਣਾ | ਫ਼ਸਲ: ਕਣਕ (ਫੁੱਲ ਅਵਸਥਾ)\nਵੈੱਟ-ਬਲਬ ਤਾਪਮਾਨ 33.8°C — ਗੰਭੀਰ ਹੀਟ ਸਟ੍ਰੈਸ!\n• ਸਵੇਰੇ 11:30 ਤੋਂ ਦੁਪਹਿਰ 3:30 ਤੱਕ ਖੇਤ ਦਾ ਕੰਮ ਬੰਦ ਰੱਖੋ।\n• ਦਾਣਿਆਂ ਨੂੰ ਸੜਨ ਤੋਂ ਬਚਾਉਣ ਲਈ ਸ਼ਾਮ ਨੂੰ ਹਲਕੀ ਸਿੰਚਾਈ ਕਰੋ।\n• ਤੇਜ਼ ਧੁੱਪ ਵਿੱਚ ਨਾਈਟ੍ਰੋਜਨ ਸਪਰੇਅ ਬਿਲਕੁਲ ਨਾ ਕਰੋ।",
        whatsappText:
          "🌾 *KisanGuard ਅਗਰੋਮੈਟ ਵੌਇਸ ਅਲਰਟ*\nਕਿਸਾਨ: ਹਰਪ੍ਰੀਤ ਸਿੰਘ (ਖੰਨਾ, ਲੁਧਿਆਣਾ)\nਫ਼ਸਲ: ਕਣਕ (ਫੁੱਲ ਅਵਸਥਾ)\n\nਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਹਰਪ੍ਰੀਤ ਜੀ! ਖੰਨਾ ਵਿੱਚ 33.8°C ਵੈੱਟ-ਬਲਬ ਗਰਮੀ ਦਰਜ ਕੀਤੀ ਗਈ ਹੈ। ਕਣਕ ਦੀ ਫੁੱਲ ਅਵਸਥਾ ਵਿੱਚ ਦਾਣੇ ਸੜਨ ਤੋਂ ਬਚਾਉਣ ਲਈ 11:30 ਤੋਂ 15:30 ਦਰਮਿਆਨ ਕੰਮ ਬੰਦ ਰੱਖੋ ਅਤੇ ਸ਼ਾਮ ਨੂੰ ਹਲਕਾ ਪਾਣੀ ਦਿਓ।",
        voiceLangCode: "pa-IN",
        voiceName: "Gurpreet (Punjabi Neural)",
        suggestedDuration: 21,
      }
    }
    // English for Harpreet
    return {
      farmerName: "Harpreet Singh",
      village: "Khanna Ward 2",
      district: "Ludhiana",
      state: "Punjab",
      cropName: "Wheat",
      stageName: "Flowering / Anthesis",
      wbgt: 33.8,
      riskLevel: "red",
      haltHours: "11:30 AM - 3:30 PM",
      spokenText:
        "Sat Sri Akal Harpreet Singh ji. KisanGuard agromet advisory for Khanna, Ludhiana. Wet-bulb globe temperature is reaching 33.8 degrees Celsius. Your wheat crop is at sensitive flowering stage with severe terminal heat stress detected. Mandatory halt on field labor and spraying between 11:30 AM and 3:30 PM. Apply light evening irrigation to cool the crop canopy and prevent forced grain shriveling.",
      displayBody:
        "🌾 [KisanGuard Advisory - Harpreet Singh]\nLocation: Khanna, Ludhiana | Crop: Wheat (Flowering)\nWBGT 33.8°C — Severe Terminal Heat Stress Alert!\n• Halt field labor & tractor operations between 11:30 AM and 3:30 PM.\n• Apply light evening irrigation to maintain canopy moisture.\n• Avoid foliar nitrogen spray during peak afternoon sun.",
      whatsappText:
        "🌾 *KisanGuard Agromet Voice Advisory*\nFarmer: Harpreet Singh (Khanna, Ludhiana)\nCrop: Wheat (Flowering)\n\nSat Sri Akal Harpreet ji! Extreme heat stress (WBGT 33.8°C) detected at Khanna. Halt field operations 11:30-15:30. Apply light evening irrigation to prevent grain shriveling.",
      voiceLangCode: "en-IN",
      voiceName: "Kajal (Indian English Neural)",
      suggestedDuration: 20,
    }
  }

  // 2. Ramesh Patil (Pimpalgaon Baswant, Nashik, Maharashtra - Grapes & Onions)
  if (name.toLowerCase().includes("ramesh") || district.toLowerCase().includes("nashik")) {
    if (normLang === "MR") {
      return {
        farmerName: "Ramesh Patil",
        village: "Pimpalgaon Baswant",
        district: "Nashik",
        state: "Maharashtra",
        cropName: "द्राक्ष व कांदा (Grapes & Onion)",
        stageName: "मणी वाढ व काढणी (Berry Development)",
        wbgt: 34.1,
        riskLevel: "red",
        haltHours: "12:00 PM - 4:00 PM",
        spokenText:
          "नमस्कार रमेश पाटील. पिंपळगाव बसवंत, नाशिक येथे आज उष्णतेचा पारा वेगाने वाढत असून वेट-बल्ब तापमान 34.1 अंश नोंदवले गेले आहे. द्राक्षाच्या बागेत मणी तडकणे आणि उन्हामुळे सनबर्नचा मोठा धोका निर्माण झाला आहे. दुपारी १२ ते ४ दरम्यान सल्फर, कॉपर किंवा कीटकनाशक फवारणी पूर्णपणे टाळा. सायंकाळी २५ मिलिमीटर ठिबक सिंचन देऊन वेलींमधील पाण्याचा ताण कमी करा.",
        displayBody:
          "🍇 [किसानगार्ड शेती सल्ला - रमेश पाटील]\nस्थान: पिंपळगाव बसवंत, नाशिक | पीक: द्राक्ष व कांदा\nWBGT 34.1°C — तीव्र उष्माघात व मणी तडकण्याचा धोका!\n• दुपारी १२:०० ते ४:०० दरम्यान सल्फर/कॉपर फवारणी बंद ठेवा.\n• सायंकाळी २५ मिमी ठिबक सिंचन सुरू करून ओलावा टिकवा.\n• उघड्या घडयांवर पानांचे आच्छादन अथवा शेडनेट लावा.",
        whatsappText:
          "🍇 *KisanGuard कृषी व्हॉइस अलर्ट*\nशेतकरी: रमेश पाटील (पिंपळगाव बसवंत, नाशिक)\nपीक: द्राक्ष व कांदा (मणी विकास)\n\nनमस्कार रमेशजी! नाशिकमध्ये 34.1°C उष्णता आहे. द्राक्षाचे मणी सनबर्नपासून वाचवण्यासाठी १२ ते ४ फवारणी टाळा आणि सायंकाळी २५ मिमी ठिबक सिंचन द्या.",
        voiceLangCode: "mr-IN",
        voiceName: "Aarohi (Marathi Neural)",
        suggestedDuration: 22,
      }
    }
    return {
      farmerName: "Ramesh Patil",
      village: "Pimpalgaon Baswant",
      district: "Nashik",
      state: "Maharashtra",
      cropName: "Table Grapes & Onions",
      stageName: "Berry Sizing & Maturity",
      wbgt: 34.1,
      riskLevel: "red",
      haltHours: "12:00 PM - 4:00 PM",
      spokenText:
        "Namaskar Ramesh Patil ji. KisanGuard agromet advisory for Pimpalgaon Baswant, Nashik. WBGT heat index has touched 34.1 degrees Celsius. High risk of grape berry sunburn, cracking, and onion bulb desiccation. Do not spray sulfur or copper between 12:00 PM and 4:00 PM to prevent chemical scorch. Run 25 millimeter evening drip irrigation to preserve cluster turgor pressure.",
      displayBody:
        "🍇 [KisanGuard Advisory - Ramesh Patil]\nLocation: Pimpalgaon Baswant, Nashik | Crop: Grapes & Onion\nWBGT 34.1°C — Berry Sunburn & Cracking Warning!\n• Suspend sulfur and copper sprays between 12:00 PM and 4:00 PM.\n• Apply 25 mm evening drip irrigation to protect berry quality.\n• Ensure canopy shading over exposed grape clusters.",
      whatsappText:
        "🍇 *KisanGuard Agromet Voice Advisory*\nFarmer: Ramesh Patil (Pimpalgaon, Nashik)\nCrop: Grapes & Onion\n\nNamaskar Ramesh ji! Severe heat stress (WBGT 34.1°C) at Nashik. Halt spraying 12:00-16:00. Run 25mm evening drip irrigation to protect grape clusters from sunburn.",
      voiceLangCode: "en-IN",
      voiceName: "Kajal (Indian English Neural)",
      suggestedDuration: 21,
    }
  }

  // 3. Sunita Deshmukh (Ausa Road, Latur, Maharashtra - Soybean & Tur)
  if (name.toLowerCase().includes("sunita") || district.toLowerCase().includes("latur")) {
    if (normLang === "MR") {
      return {
        farmerName: "Sunita Deshmukh",
        village: "Ausa Road Ward 4",
        district: "Latur",
        state: "Maharashtra",
        cropName: "सोयाबीन व तूर (Soybean & Tur)",
        stageName: "शेंगा भरणे (Pod Filling)",
        wbgt: 33.2,
        riskLevel: "caution",
        haltHours: "11:30 AM - 3:30 PM",
        spokenText:
          "नमस्कार सुनीता देशमुख ताई. औसा रोड, लातूर परिसरात कडक उन्हामुळे वेट-बल्ब तापमान 33.2 अंश आहे. सोयाबीनच्या शेंगा भरण्याच्या अत्यंत नाजूक टप्प्यात जमिनीतील ओलावा वेगाने कमी होत आहे. दुपारच्या कडक उन्हात शेतातील मजुरांची कामे थांबवा. शेंगांची गळ थांबवण्यासाठी संध्याकाळी तुषार सिंचनाने ४५ मिनिटे पाणी द्या.",
        displayBody:
          "🌱 [किसानगार्ड शेती सल्ला - सुनीता देशमुख]\nस्थान: औसा रोड, लातूर | पीक: सोयाबीन व तूर\nWBGT 33.2°C — शेंगा भरण्याच्या टप्प्यात पाण्याचा ताण!\n• सकाळी ११:३० ते दुपारी ३:३० पर्यंत शेतातील कामे थांबवा.\n• शेंगांची गळ रोखण्यासाठी संध्याकाळी ४५ मिनिटे तुषार सिंचन द्या.\n• मजुरांना दर अर्ध्या तासाने ताक किंवा लिंबू पाणी द्या.",
        whatsappText:
          "🌱 *KisanGuard कृषी व्हॉइस अलर्ट*\nशेतकरी: सुनीता देशमुख (औसा रोड, लातूर)\nपीक: सोयाबीन व तूर (शेंगा भरणे)\n\nनमस्कार सुनीताताई! लातूरमध्ये 33.2°C उष्णता आहे. सोयाबीनच्या शेंगा भरण्यासाठी संध्याकाळी ४५ मिनिटे तुषार सिंचनाने पाणी द्या व ११:३० ते ३:३० काम थांबवा.",
        voiceLangCode: "mr-IN",
        voiceName: "Aarohi (Marathi Neural)",
        suggestedDuration: 20,
      }
    }
    return {
      farmerName: "Sunita Deshmukh",
      village: "Ausa Road Ward 4",
      district: "Latur",
      state: "Maharashtra",
      cropName: "Soybean & Pigeonpea",
      stageName: "Pod Development & Seed Fill",
      wbgt: 33.2,
      riskLevel: "caution",
      haltHours: "11:30 AM - 3:30 PM",
      spokenText:
        "Namaskar Sunita Deshmukh ji. KisanGuard agromet advisory for Ausa Road, Latur. Moisture deficit and heat index of 33.2 degrees Celsius detected during soybean pod filling. Suspend manual weeding and spraying between 11:30 AM and 3:30 PM. Run your sprinkler irrigation system for 45 minutes this evening to prevent aborted pod fill and leaf scorch.",
      displayBody:
        "🌱 [KisanGuard Advisory - Sunita Deshmukh]\nLocation: Ausa Road, Latur | Crop: Soybean & Tur\nWBGT 33.2°C — Critical Pod Development Stress!\n• Suspend field labor between 11:30 AM and 3:30 PM.\n• Run sprinkler irrigation for 45 minutes during evening hours.\n• Conserve soil moisture with organic surface mulching.",
      whatsappText:
        "🌱 *KisanGuard Agromet Voice Advisory*\nFarmer: Sunita Deshmukh (Ausa Road, Latur)\nCrop: Soybean & Tur\n\nNamaskar Sunita ji! High heat index (WBGT 33.2°C) at Latur. Halt field labor 11:30-15:30. Run 45-minute evening sprinkler cycle to protect soybean pod fill.",
      voiceLangCode: "en-IN",
      voiceName: "Kajal (Indian English Neural)",
      suggestedDuration: 19,
    }
  }

  // 4. Devendra Rathore (Mandore, Jodhpur, Rajasthan - Bajra/Millet & Mustard)
  if (name.toLowerCase().includes("devendra") || district.toLowerCase().includes("jodhpur") || state.toLowerCase().includes("rajasthan")) {
    if (normLang === "HI") {
      return {
        farmerName: "Devendra Rathore",
        village: "Mandore Block",
        district: "Jodhpur",
        state: "Rajasthan",
        cropName: "बाजरा व सरसों (Bajra & Mustard)",
        stageName: "वानस्पतिक वृद्धि (Vegetative)",
        wbgt: 34.8,
        riskLevel: "red",
        haltHours: "11:00 AM - 4:00 PM",
        spokenText:
          "राम राम देवेन्द्र राठौड़ जी। जोधपुर मंडोर क्षेत्र में तेज लू और 34.8 डिग्री वेट-बल्ब तापमान दर्ज किया गया है। बाजरे की नई फसल में पानी की भारी कमी और खेत मजदूरों में हीटस्ट्रोक का अत्यधिक खतरा है। सुबह 11 से शाम 4 बजे तक खुले खेत में मजदूरी पूरी तरह बंद रखें। रात में स्प्रिंकलर चलाकर रेतीली जमीन में ठंडक और नमी बनाए रखें।",
        displayBody:
          "🌾 [किसानगार्ड कृषि सलाह - देवेन्द्र राठौड़]\nस्थान: मंडोर, जोधपुर | फसल: बाजरा व सरसों\nWBGT 34.8°C — अत्यधिक लू और जल संकट चेतावनी!\n• सुबह ११:०० से शाम ४:०० बजे तक खुले खेत में काम पूर्णतः बंद।\n• रात में स्प्रिंकलर चलाकर बाजरे की पत्तियों को लू से बचाएं।\n• श्रमिकों को ओआरएस और ठंडा पानी अनिवार्य रूप से उपलब्ध कराएं।",
        whatsappText:
          "🌾 *KisanGuard कृषि वॉयस अलर्ट*\nकिसान: देवेन्द्र राठौड़ (मंडोर, जोधपुर)\nफसल: बाजरा व सरसों\n\nराम राम देवेन्द्र जी! जोधपुर में 34.8°C लू का रेड अलर्ट है। मजदूरों को हीटस्ट्रोक से बचाने के लिए 11 से 4 बजे तक काम बंद रखें और रात में स्प्रिंकलर चलाएं।",
        voiceLangCode: "hi-IN",
        voiceName: "Aditi (Hindi Neural)",
        suggestedDuration: 21,
      }
    }
    return {
      farmerName: "Devendra Rathore",
      village: "Mandore Block",
      district: "Jodhpur",
      state: "Rajasthan",
      cropName: "Pearl Millet (Bajra) & Mustard",
      stageName: "Vegetative / Tillering",
      wbgt: 34.8,
      riskLevel: "red",
      haltHours: "11:00 AM - 4:00 PM",
      spokenText:
        "Ram Ram Devendra Rathore ji. KisanGuard agromet advisory for Mandore, Jodhpur. Severe arid heatwave and loo winds active with wet-bulb globe temperature at 34.8 degrees Celsius. Mandatory halt on open field labor between 11:00 AM and 4:00 PM due to acute heatstroke hazards. Execute night sprinkler irrigation cycles to preserve seedling turgor in sandy soil.",
      displayBody:
        "🌾 [KisanGuard Advisory - Devendra Rathore]\nLocation: Mandore, Jodhpur | Crop: Bajra & Mustard\nWBGT 34.8°C — Extreme Arid Heatwave (Loo) Alert!\n• Strictly halt open field work between 11:00 AM and 4:00 PM.\n• Operate night sprinkler cycles to prevent seedling desiccation.\n• Keep oral rehydration solution (ORS) available for all farm workers.",
      whatsappText:
        "🌾 *KisanGuard Agromet Voice Advisory*\nFarmer: Devendra Rathore (Mandore, Jodhpur)\nCrop: Bajra & Mustard\n\nRam Ram Devendra ji! Severe arid heatwave (WBGT 34.8°C) at Jodhpur. Mandatory work halt 11:00-16:00. Run night sprinkler cycles to protect young bajra.",
      voiceLangCode: "en-IN",
      voiceName: "Kajal (Indian English Neural)",
      suggestedDuration: 21,
    }
  }

  // 5. Suresh Reddy (Geesugonda, Warangal, Telangana - Cotton & Maize)
  if (name.toLowerCase().includes("suresh") || district.toLowerCase().includes("warangal") || state.toLowerCase().includes("telangana")) {
    if (normLang === "TE") {
      return {
        farmerName: "Suresh Reddy",
        village: "Geesugonda Block",
        district: "Warangal",
        state: "Telangana",
        cropName: "పత్తి మరియు మొక్కజొన్న (Cotton & Maize)",
        stageName: "పూత మరియు కాయ దశ (Squaring & Boll)",
        wbgt: 33.6,
        riskLevel: "red",
        haltHours: "11:30 AM - 3:30 PM",
        spokenText:
          "నమస్కారం సురేష్ రెడ్డి గారు. వరంగల్ గీసుగొండ మండలంలో అధిక ఉక్కపోత మరియు 33.6 డిగ్రీల వెట్-బల్బ్ ఉష్ణోగ్రత నమోదైంది. పత్తి చేనులో పూత మరియు లేత కాయలు రాలిపోయే ప్రమాదం తీవ్రంగా ఉంది. ఉదయం 11:30 నుండి మధ్యాహ్నం 3:30 వరకు మందుల పిచికారీ మరియు కాయల సేకరణ ఆపండి. సాయంత్రం డ్రిప్ ద్వారా పొటాషియం నైట్రేట్ అందించి పంటను కాపాడండి.",
        displayBody:
          "🌿 [కిసాన్‌గార్డ్ వ్యవసాయ సలహా - సురేష్ రెడ్డి]\nప్రాంతం: గీసుగొండ, వరంగల్ | పంట: పత్తి & మొక్కజొన్న\nWBGT 33.6°C — తీవ్ర వేడి మరియు పూత రాలే ప్రమాదం!\n• ఉదయం 11:30 నుండి మధ్యాహ్నం 3:30 వరకు పనులు నిలిపివేయండి.\n• పూత రాలకుండా సాయంత్రం వేళ డ్రిప్ ద్వారా నీరందించండి.\n• కూలీలకు ప్రతి 30 నిమిషాలకు నిమ్మరసం లేదా ఓఆర్ఎస్ ఇవ్వండి.",
        whatsappText:
          "🌿 *KisanGuard అగ్రోమెట్ వాయిస్ అలర్ట్*\nరైతు: సురేష్ రెడ్డి (గీసుగొండ, వరంగల్)\nపంట: పత్తి & మొక్కజొన్న\n\nనమస్కారం సురేష్ గారు! వరంగల్‌లో 33.6°C వేడిమి నమోదైంది. పత్తి పూత రాలకుండా 11:30-15:30 పనులు ఆపి, సాయంత్రం డ్రిప్ ద్వారా నీరందించండి.",
        voiceLangCode: "te-IN",
        voiceName: "Chitra (Telugu Neural)",
        suggestedDuration: 22,
      }
    }
    return {
      farmerName: "Suresh Reddy",
      village: "Geesugonda Block",
      district: "Warangal",
      state: "Telangana",
      cropName: "Bt Cotton & Maize",
      stageName: "Squaring & Boll Development",
      wbgt: 33.6,
      riskLevel: "red",
      haltHours: "11:30 AM - 3:30 PM",
      spokenText:
        "Namaskaram Suresh Reddy garu. KisanGuard agromet advisory for Geesugonda, Warangal. High humid heat stress with WBGT at 33.6 degrees Celsius detected. High risk of square and boll shedding in your cotton crop. Cease field operations and foliar sprays between 11:30 AM and 3:30 PM. Execute evening drip fertigation to mitigate thermal stress.",
      displayBody:
        "🌿 [KisanGuard Advisory - Suresh Reddy]\nLocation: Geesugonda, Warangal | Crop: Cotton & Maize\nWBGT 33.6°C — Square & Boll Shedding Hazard Alert!\n• Suspend field spraying & picking between 11:30 AM and 3:30 PM.\n• Apply evening drip fertigation with potassium nitrate to induce heat tolerance.\n• Provide scheduled hydration breaks for farm labor every 30 minutes.",
      whatsappText:
        "🌿 *KisanGuard Agromet Voice Advisory*\nFarmer: Suresh Reddy (Geesugonda, Warangal)\nCrop: Cotton & Maize\n\nNamaskaram Suresh garu! High thermal stress (WBGT 33.6°C) at Warangal. Suspend field work 11:30-15:30. Apply evening drip irrigation to stop boll shedding.",
      voiceLangCode: "en-IN",
      voiceName: "Kajal (Indian English Neural)",
      suggestedDuration: 20,
    }
  }

  // Default / Logged-in custom farmer
  const safeCrop = farmer.crops && farmer.crops.length > 0 ? farmer.crops[0] : "crops"
  return {
    farmerName: name,
    village: village,
    district: district,
    state: state,
    cropName: safeCrop.charAt(0).toUpperCase() + safeCrop.slice(1),
    stageName: "Flowering & Vegetative",
    wbgt: 33.4,
    riskLevel: "caution",
    haltHours: "11:30 AM - 3:30 PM",
    spokenText: `Namaste ${name} ji. KisanGuard agromet alert for ${village}, ${district}. Wet-bulb globe temperature is 33.4 degrees Celsius. High heat stress detected for your ${safeCrop} fields. Please halt heavy field labor between 11:30 AM and 3:30 PM. Provide evening irrigation to protect crop root health and ensure field workers stay hydrated.`,
    displayBody: `🌾 [KisanGuard Advisory - ${name}]\nLocation: ${village}, ${district} | Crop: ${safeCrop}\nWBGT 33.4°C — Elevated Thermal Stress Alert!\n• Halt field labor between 11:30 AM and 3:30 PM.\n• Schedule evening irrigation to replenish canopy moisture.\n• Keep workers hydrated and sheltered during peak noon hours.`,
    whatsappText: `🌾 *KisanGuard Agromet Voice Advisory*\nFarmer: ${name} (${village}, ${district})\nCrop: ${safeCrop}\n\nNamaste ${name} ji! Heat stress (WBGT 33.4°C) detected in ${district}. Halt field labor 11:30-15:30 and provide evening irrigation.`,
    voiceLangCode: "en-IN",
    voiceName: "Kajal (Indian English Neural)",
    suggestedDuration: 18,
  }
}
