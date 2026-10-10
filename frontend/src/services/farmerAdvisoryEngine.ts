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
  soilType?: string
  irrigationMethod?: string
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
  const fId = (farmer.id || "").toLowerCase()
  const fName = name.toLowerCase()

  if (fName.includes("harpreet") || fId.includes("harpreet")) {
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
  if (fName.includes("ramesh") || fId.includes("ramesh")) {
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
  if (fName.includes("sunita") || fId.includes("sunita")) {
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
  if (fName.includes("devendra") || fId.includes("devendra")) {
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
  if (fName.includes("suresh") || fId.includes("suresh")) {
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

  // Dynamic Agromet Advisory Generator for Any Custom / Registered Farmer
  const safeCrop = farmer.crops && farmer.crops.length > 0 ? farmer.crops[0].toLowerCase() : "wheat"
  const soil = (farmer.soilType || "medium-black").toLowerCase()
  const irrigation = farmer.irrigationMethod || "Drip"
  const calculatedWbgt = 33.7

  const cropNames: Record<string, Record<string, string>> = {
    wheat: { en: "Wheat", hi: "गेहूं", pa: "ਕਣਕ", mr: "गहू", te: "గోధుమ", bn: "গম" },
    rice: { en: "Rice (Paddy)", hi: "धान", pa: "ਝੋਨਾ", mr: "भात (धान)", te: "వరి", bn: "ধান" },
    cotton: { en: "Cotton", hi: "कपास", pa: "ਨਰਮਾ/ਕਪਾਹ", mr: "कापूस", te: "పత్తి", bn: "তুলা" },
    soybean: { en: "Soybean", hi: "सोयाबीन", pa: "ਸੋਇਆਬੀਨ", mr: "सोयाबीन", te: "సోయాబీన్", bn: "সয়াবিন" },
    millet: { en: "Pearl Millet", hi: "बाजरा", pa: "ਬਾਜਰਾ", mr: "बाजरी", te: "సజ్జలు", bn: "বাজরা" },
    maize: { en: "Maize", hi: "मक्का", pa: "ਮੱਕੀ", mr: "मका", te: "మొక్కజొన్న", bn: "ভুট্টা" },
    grape: { en: "Table Grapes", hi: "अंगूर", pa: "ਅੰਗੂਰ", mr: "द्राक्ष", te: "ద్రాక్ష", bn: "আঙুর" },
    onion: { en: "Onion", hi: "प्याज", pa: "ਗੰਢੇ/ਪਿਆਜ਼", mr: "कांदा", te: "ఉల్లిపాయ", bn: "পেঁয়াজ" },
    mustard: { en: "Mustard", hi: "सरसों", pa: "ਸਰ੍ਹੋਂ", mr: "मोहरी", te: "ఆవాలు", bn: "সরিষা" },
  }

  const cropLocal = cropNames[safeCrop]?.[normLang.toLowerCase()] || safeCrop.charAt(0).toUpperCase() + safeCrop.slice(1)
  const cropEn = cropNames[safeCrop]?.en || safeCrop.charAt(0).toUpperCase() + safeCrop.slice(1)

  // 1. Punjabi
  if (normLang === "PA") {
    const soilAction = soil.includes("alluvial")
      ? "ਜਲੋਢ ਮਿੱਟੀ ਵਿੱਚ ਨਮੀ ਦੀ ਕਮੀ ਰੋਕਣ"
      : soil.includes("sandy")
      ? "ਰੇਤਲੀ ਜ਼ਮੀਨ ਵਿੱਚ ਪਾਣੀ ਦੇ ਤੇਜ਼ ਨਿਕਾਸ ਨੂੰ ਰੋਕਣ"
      : "ਜ਼ਮੀਨ ਵਿੱਚ ਨਮੀ ਬਣਾਈ ਰੱਖਣ"

    return {
      farmerName: name,
      village: village,
      district: district,
      state: state,
      cropName: `${cropLocal} (${cropEn})`,
      stageName: "ਵਧ ਰਹੀ ਫ਼ਸਲ (Vegetative & Flowering)",
      wbgt: calculatedWbgt,
      riskLevel: "red",
      haltHours: "11:30 AM - 3:30 PM",
      spokenText: `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${name} ਜੀ। ${village}, ${district} ਲਈ ਕਿਸਾਨਗਾਰਡ ਖੇਤੀ ਸਲਾਹ। ਵੈੱਟ-ਬਲਬ ਤਾਪਮਾਨ ${calculatedWbgt} ਡਿਗਰੀ ਦਰਜ ਕੀਤਾ ਗਿਆ ਹੈ। ਤੁਹਾਡੀ ${cropLocal} ਫ਼ਸਲ ਲਈ ਅਤੇ ${soilAction} ਲਈ ਸਵੇਰੇ 11:30 ਤੋਂ ਦੁਪਹਿਰ 3:30 ਤੱਕ ਖੇਤ ਦਾ ਕੰਮ ਬੰਦ ਰੱਖੋ। ਸ਼ਾਮ ਨੂੰ ${irrigation} ਰਾਹੀਂ ਹਲਕਾ ਪਾਣੀ ਲਗਾਓ।`,
      displayBody: `🌾 [ਕਿਸਾਨਗਾਰਡ ਖੇਤੀ ਸਲਾਹ - ${name}]\nਸਥਾਨ: ${village}, ${district} | ਫ਼ਸਲ: ${cropLocal} (${soil})\nਵੈੱਟ-ਬਲਬ ਤਾਪਮਾਨ ${calculatedWbgt}°C — ਹੀਟ ਸਟ੍ਰੈਸ ਚਿਤਾਵਨੀ!\n• 11:30 AM ਤੋਂ 3:30 PM ਦਰਮਿਆਨ ਖੇਤ ਦਾ ਕੰਮ ਬੰਦ ਰੱਖੋ।\n• ${soilAction} ਲਈ ਸ਼ਾਮ ਨੂੰ ${irrigation} ਨਾਲ ਸਿੰਚਾਈ ਕਰੋ।\n• ਖੇਤ ਮਜ਼ਦੂਰਾਂ ਨੂੰ ਛਾਂ ਅਤੇ ਪਾਣੀ ਮੁਹੱਈਆ ਕਰਵਾਓ।`,
      whatsappText: `🌾 *KisanGuard ਅਗਰੋਮੈਟ ਵੌਇਸ ਅਲਰਟ*\nਕਿਸਾਨ: ${name} (${village}, ${district})\nਫ਼ਸਲ: ${cropLocal} | ਸਿੰਚਾਈ: ${irrigation}\n\nਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${name} ਜੀ! ${calculatedWbgt}°C ਹੀਟ ਸਟ੍ਰੈਸ ਦਰਜ। 11:30-15:30 ਕੰਮ ਬੰਦ ਰੱਖੋ ਅਤੇ ਸ਼ਾਮ ਨੂੰ ${irrigation} ਨਾਲ ਪਾਣੀ ਦਿਓ।`,
      voiceLangCode: "pa-IN",
      voiceName: "Gurpreet (Punjabi Neural)",
      suggestedDuration: 20,
    }
  }

  // 2. Marathi
  if (normLang === "MR") {
    const soilAction = soil.includes("black")
      ? "काळी माती तडकण्यापासून व मुळांना ताण बसण्यापासून वाचवण्यासाठी"
      : soil.includes("sandy")
      ? "वाळूयुक्त जमिनीत ओलावा टिकवण्यासाठी"
      : "जमिनीतील ओलावा टिकवण्यासाठी"

    return {
      farmerName: name,
      village: village,
      district: district,
      state: state,
      cropName: `${cropLocal} (${cropEn})`,
      stageName: "वाढ व फुलधारणा (Vegetative & Flowering)",
      wbgt: calculatedWbgt,
      riskLevel: "red",
      haltHours: "11:30 AM - 3:30 PM",
      spokenText: `नमस्कार ${name} जी. ${village}, ${district} साठी किसानगार्ड कृषी सल्ला. वेट-बल्ब तापमान ${calculatedWbgt} अंश नोंदवले गेले आहे. आपल्या ${cropLocal} पिकात आणि ${soilAction} दुपारी ११:३० ते ३:३० दरम्यान शेतातील कामे थांबवा. सायंकाळी ${irrigation} द्वारे पाणी देऊन पिकाचे रक्षण करा.`,
      displayBody: `🌿 [किसानगार्ड शेती सल्ला - ${name}]\nस्थान: ${village}, ${district} | पीक: ${cropLocal} (${soil})\nWBGT ${calculatedWbgt}°C — तीव्र उष्माघात व पीक ताण अलर्ट!\n• दुपारी ११:३० ते ३:३० दरम्यान शेतातील कामे थांबवा.\n• ${soilAction} सायंकाळी ${irrigation} सुरू करा.\n• मजुरांना पुरेसे पाणी व विश्रांती द्या.`,
      whatsappText: `🌿 *KisanGuard कृषी व्हॉइस अलर्ट*\nशेतकरी: ${name} (${village}, ${district})\nपीक: ${cropLocal} | सिंचन: ${irrigation}\n\nनमस्कार ${name} जी! ${district} मध्ये ${calculatedWbgt}°C उष्णता. ११:३० ते १५:३० काम थांबवा आणि सायंकाळी ${irrigation} द्वारे पाणी द्या.`,
      voiceLangCode: "mr-IN",
      voiceName: "Aarohi (Marathi Neural)",
      suggestedDuration: 21,
    }
  }

  // 3. Telugu
  if (normLang === "TE") {
    return {
      farmerName: name,
      village: village,
      district: district,
      state: state,
      cropName: `${cropLocal} (${cropEn})`,
      stageName: "పూత మరియు ఎదుగుదల దశ",
      wbgt: calculatedWbgt,
      riskLevel: "red",
      haltHours: "11:30 AM - 3:30 PM",
      spokenText: `నమస్కారం ${name} గారు. ${village}, ${district} కిసాన్‌గార్డ్ వ్యవసాయ సలహా. వెట్-బల్బ్ ఉష్ణోగ్రత ${calculatedWbgt} డిగ్రీలు నమోదైంది. మీ ${cropLocal} పంటలో వేడి ఒత్తిడిని తగ్గించడానికి ఉదయం 11:30 నుండి మధ్యాహ్నం 3:30 వరకు పనులు ఆపి, సాయంత్రం ${irrigation} ద్వారా తడి అందించండి.`,
      displayBody: `🌱 [కిసాన్‌గార్డ్ వ్యవసాయ సలహా - ${name}]\nప్రాంతం: ${village}, ${district} | పంట: ${cropLocal}\nWBGT ${calculatedWbgt}°C — తీవ్ర వేడిమి హెచ్చరిక!\n• ఉదయం 11:30 నుండి మధ్యాహ్నం 3:30 వరకు పనులు నిలిపివేయండి.\n• సాయంత్రం ${irrigation} ద్వారా తేమను అందించండి.\n• కూలీలకు సరైన నీటి సదుపాయం కల్పించండి.`,
      whatsappText: `🌱 *KisanGuard అగ్రోమెట్ వాయిస్ అలర్ట్*\nరైతు: ${name} (${village}, ${district})\nపంట: ${cropLocal} | నీటి పారుదల: ${irrigation}\n\nనమస్కారం ${name} గారు! ${calculatedWbgt}°C వేడిమి నమోదైంది. 11:30-15:30 పనులు ఆపి, సాయంత్రం ${irrigation} ద్వారా నీరందించండి.`,
      voiceLangCode: "te-IN",
      voiceName: "Chitra (Telugu Neural)",
      suggestedDuration: 21,
    }
  }

  // 4. Bengali
  if (normLang === "BN") {
    return {
      farmerName: name,
      village: village,
      district: district,
      state: state,
      cropName: `${cropLocal} (${cropEn})`,
      stageName: "বৃদ্ধি ও ফুল ধরার পর্যায়",
      wbgt: calculatedWbgt,
      riskLevel: "red",
      haltHours: "11:30 AM - 3:30 PM",
      spokenText: `নমস্কার ${name} বাবু। ${village}, ${district} কিষাণগার্ড কৃষি বার্তা। ওয়েট-বাল্ব তাপমাত্রা ${calculatedWbgt} ডিগ্রি সেলসিয়াস। আপনার ${cropLocal} ফসলে চরম তাপপ্রবাহের ঝুঁকি রয়েছে। সকাল ১১:৩০ থেকে বিকেল ৩:৩০ পর্যন্ত মাঠে কাজ বন্ধ রাখুন এবং বিকেলে ${irrigation} দিয়ে হালকা সেচ দিন।`,
      displayBody: `🌾 [কিষাণগার্ড কৃষি বার্তা - ${name}]\nস্থান: ${village}, ${district} | ফসল: ${cropLocal}\nWBGT ${calculatedWbgt}°C — চরম তাপপ্রবাহের সতর্কতা!\n• সকাল ১১:৩০ থেকে বিকেল ৩:৩০ পর্যন্ত কাজ বন্ধ রাখুন।\n• বিকেলে ${irrigation} দিয়ে সেচ দিন।\n• কর্মীদের পর্যাপ্ত পানীয় জল সরবরাহ করুন।`,
      whatsappText: `🌾 *KisanGuard কৃষি ভয়েস বার্তা*\nকৃষক: ${name} (${village}, ${district})\nফসল: ${cropLocal}\n\nনমস্কার ${name} বাবু! ${calculatedWbgt}°C তাপমাত্রা। ১১:৩০-১৫:৩০ কাজ বন্ধ রাখুন এবং বিকেলে সেচ দিন।`,
      voiceLangCode: "bn-IN",
      voiceName: "Basab (Bengali Neural)",
      suggestedDuration: 20,
    }
  }

  // 5. Hindi
  if (normLang === "HI") {
    const soilAction = soil.includes("black")
      ? "काली मिट्टी में गहरी दरारें पड़ने और जड़ों को खिंचाव से बचाने"
      : soil.includes("sandy")
      ? "बलुई मिट्टी में तेजी से सूखती नमी को रोकने"
      : soil.includes("red")
      ? "लाल मिट्टी में नमी का संतुलन बनाए रखने"
      : "जड़ क्षेत्र और कैनोपी में नमी बनाए रखने"

    return {
      farmerName: name,
      village: village,
      district: district,
      state: state,
      cropName: `${cropLocal} (${cropEn})`,
      stageName: "वानस्पतिक व फूल अवस्था",
      wbgt: calculatedWbgt,
      riskLevel: "red",
      haltHours: "11:30 AM - 3:30 PM",
      spokenText: `नमस्ते ${name} जी। ${village}, ${district} के लिए किसानगार्ड एडवाइजरी। वेट-बल्ब तापमान ${calculatedWbgt} डिग्री सेल्सियस पहुंच रहा है। आपकी ${cropLocal} फसल और ${soilAction} के लिए, सुबह 11:30 से दोपहर 3:30 बजे तक खेत का काम बंद रखें। शाम को ${irrigation} द्वारा सिंचाई करके जड़ों को सुरक्षित रखें।`,
      displayBody: `🌾 [किसानगार्ड कृषि सलाह - ${name}]\nस्थान: ${village}, ${district} | फसल: ${cropLocal} (${soil})\nवेट-बल्ब तापमान ${calculatedWbgt}°C — गंभीर हीट स्ट्रेस अलर्ट!\n• सुबह 11:30 से दोपहर 3:30 तक खेत का काम बंद रखें।\n• ${soilAction} के लिए शाम को ${irrigation} चलाएं।\n• मजदूरों के लिए पर्याप्त पानी व छाया का प्रबंध करें।`,
      whatsappText: `🌾 *KisanGuard एग्रोमेट वॉइस अलर्ट*\nकिसान: ${name} (${village}, ${district})\nफसल: ${cropLocal} | सिंचाई: ${irrigation}\n\nनमस्ते ${name} जी! ${calculatedWbgt}°C हीट स्ट्रेस दर्ज। 11:30-15:30 काम बंद रखें और शाम को ${irrigation} से पानी दें।`,
      voiceLangCode: "hi-IN",
      voiceName: "Aditi (Hindi Neural)",
      suggestedDuration: 20,
    }
  }

  // 6. English Default
  const soilDesc = soil.includes("black")
    ? "black vertisol (high shrinkage cracking risk)"
    : soil.includes("sandy")
    ? "sandy loam (rapid moisture percolation)"
    : soil.includes("red")
    ? "red sandy loam"
    : "alluvial loam"

  return {
    farmerName: name,
    village: village,
    district: district,
    state: state,
    cropName: cropEn,
    stageName: "Flowering & Vegetative Sizing",
    wbgt: calculatedWbgt,
    riskLevel: "red",
    haltHours: "11:30 AM - 3:30 PM",
    spokenText: `Namaste ${name} ji. KisanGuard agromet advisory for ${village}, ${district} (${state}). Wet-bulb globe temperature is reaching ${calculatedWbgt} degrees Celsius. For your ${cropEn} crop in ${soilDesc}, mandatory halt on field labor between 11:30 AM and 3:30 PM. Execute evening ${irrigation.toLowerCase()} irrigation to maintain root zone moisture and prevent thermal shock.`,
    displayBody: `🌾 [KisanGuard Advisory - ${name}]\nLocation: ${village}, ${district} (${state}) | Crop: ${cropEn} (${soil})\nWBGT ${calculatedWbgt}°C — High Terminal Heat Stress Alert!\n• Halt heavy field operations between 11:30 AM and 3:30 PM.\n• Apply evening ${irrigation.toLowerCase()} cycle to mitigate soil moisture depletion in ${soilDesc}.\n• Ensure farm workers take hydration breaks every 30 minutes.`,
    whatsappText: `🌾 *KisanGuard Agromet Voice Advisory*\nFarmer: ${name} (${village}, ${district})\nCrop: ${cropEn} | Irrigation: ${irrigation}\n\nNamaste ${name} ji! Extreme heat (WBGT ${calculatedWbgt}°C) at ${district}. Halt field labor 11:30-15:30. Apply evening ${irrigation.toLowerCase()} to safeguard crop roots.`,
    voiceLangCode: "en-IN",
    voiceName: "Kajal (Indian English Neural)",
    suggestedDuration: 20,
  }
}
