import json
import base64
import time
import os
import boto3

bedrock = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION', 'ap-south-1'))
polly = boto3.client('polly', region_name=os.environ.get('AWS_REGION', 'ap-south-1'))

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Content-Type": "application/json"
}

def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod", "POST")
    
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"status": "ok"})
        }

    try:
        raw_body = event.get("body", "{}")
        if event.get("isBase64Encoded", False):
            raw_body = base64.b64decode(raw_body).decode("utf-8")
        
        data = json.loads(raw_body) if isinstance(raw_body, str) else (raw_body or {})
        
        farmer_name = data.get("farmerName") or data.get("name") or "Farmer"
        village = data.get("village") or "Farm Block"
        district = data.get("district") or "District"
        state = data.get("state") or "India"
        crop = data.get("crop") or (data.get("crops")[0] if data.get("crops") else "Crop")
        stage = data.get("stage") or "Vegetative stage"
        soil = data.get("soilType") or data.get("soil") or "Medium-Black Vertisol"
        irrigation = data.get("irrigationMethod") or data.get("irrigation") or "evening drip irrigation"
        wbgt = data.get("wbgt") or 33.8
        halt_hours = data.get("haltHours") or "11:30 AM - 3:30 PM"
        severity = data.get("severity") or "red"
        lang = (data.get("language") or "hi").lower()
        
        # Deep ML Model Telemetry
        psi = data.get("psi") or 80
        cdhi = data.get("cdhi") or 68
        ndvi = data.get("ndvi") or 0.62
        heat_stress_days = data.get("heatStressDays") or 4
        soil_moisture = data.get("soilMoisture") or "18%"
        water_deficit = data.get("waterDeficitMm") or "25 mm"
        yield_loss = data.get("yieldLossRisk") or "18%"
        mitigated_loss = data.get("mitigatedYieldLoss") or "<4%"
        spray_directive = data.get("sprayDirective") or "Halt chemical spraying between 11:00 AM - 4:00 PM to avoid leaf burn"
        
        t0 = time.time()
        
        # Craft precise language instructions ensuring 100% adherence to all 4 ML models
        if lang == "en":
            system_inst = "Generate a comprehensive, authoritative spoken agromet advisory in clean, fluent English."
            prompt = f"""You are KisanGuard agromet AI. {system_inst}
Target Farmer: {farmer_name}
Location: {village}, {district}, {state}
[ML Model 1 - Human Heat Strain]: WBGT {wbgt}°C, Physiological Strain Index (PSI) {psi}/100. Mandatory field labor halt: {halt_hours}.
[ML Model 2 - Crop Drought & Heat Index]: {crop} at {stage}. CDHI Stress Score {cdhi}/100, Canopy NDVI {ndvi}, {heat_stress_days} consecutive days of heat.
[ML Model 3 - FAO-56 Soil Water Balance]: {soil} soil. Root-zone moisture {soil_moisture}, Water deficit {water_deficit}. Prescribed: {irrigation}.
[ML Model 4 - Compound Yield Loss Forecaster]: Projected yield loss {yield_loss} if untreated, drops to {mitigated_loss} with timely irrigation.
[Field Safety Directive]: {spray_directive}.

Requirements:
1. Greet {farmer_name} and state this is the KisanGuard agro-weather advisory for {district}.
2. State the severe heat risk: WBGT of {wbgt}°C and PSI score of {psi}/100, advising labor halt between {halt_hours}.
3. Explain crop impact: CDHI stress score of {cdhi}/100 on {crop} during {stage}, warning of {yield_loss} yield loss risk.
4. Prescribe smart irrigation: Apply {water_deficit} ({irrigation}) on {soil} to restore moisture and reduce yield loss to {mitigated_loss}.
5. State the spray warning: {spray_directive}.
6. Keep length between 55 to 70 words. Pure clear spoken English text only. No bullet points, markdown, or conversational filler."""

        elif lang == "mr":
            system_inst = "मराठी भाषेत (शुद्ध देवनागरी लिपीत) सखोल आणि स्पष्ट कृषी हवामान सुरक्षा सल्ला तयार करा."
            prompt = f"""You are KisanGuard agromet AI. {system_inst}
शेतकरी: {farmer_name}
गाव व जिल्हा: {village}, {district}, {state}
[ML मॉडेल १ - उष्णता ताण]: वेट-बल्ब तापमान (WBGT) {wbgt}°C, शारीरिक ताण निर्देशांक (PSI) {psi}/१००. शेतकाम बंदी वेळ: {halt_hours}.
[ML मॉडेल २ - पीक दुष्काळ-उष्णता ताण]: {crop} पीक, {stage}. CDHI ताण निर्देशांक {cdhi}/१००, सलग {heat_stress_days} दिवस उष्णतेची लाट.
[ML मॉडेल ३ - FAO-56 मृदा जल संतुलन]: {soil} माती. मुळांमधील ओलावा {soil_moisture}, पाण्याची तूट {water_deficit}. शिफारस: {irrigation}.
[ML मॉडेल ४ - उत्पन्न घट अंदाज]: दुर्लक्ष केल्यास {yield_loss} उत्पन्न घट धोका, वेळेवर सिंचनाने घट {mitigated_loss} पर्यंत मर्यादित.
[फवारणी निर्देश]: {spray_directive}.

सूचना:
१. {farmer_name} यांना नमस्कार करून {district} साठी किसानगार्ड कृषी बुलेटिन सांगा.
२. वेट-बल्ब तापमान {wbgt}°C आणि PSI {psi}/१०० सांगून दुपारी {halt_hours} दरम्यान शेतातील कामे थांबवा.
३. {crop} पिकाच्या {stage} दरम्यान CDHI ताण {cdhi}/१०० व {yield_loss} उत्पन्न घट धोक्याची स्पष्ट जाणीव द्या.
४. {soil} मातीतील {water_deficit} पाण्याची कमतरता भरून काढण्यासाठी सायंकाळी {irrigation} करा, ज्यामुळे नुकसान {mitigated_loss} पर्यंत घसरेल.
५. दुपारच्या उन्हात कोणतीही रासायनिक फवारणी करू नका.
६. ५५ ते ७० शब्दांत शुद्ध मराठीत लिहा. कोणतीही इंग्रजी अक्षरे वापरू नका. केवळ बोलण्यासाठी मजकूर द्या."""

        elif lang == "pa":
            system_inst = "ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਵਿੱਚ (ਗੁਰਮੁਖੀ ਲਿਪੀ ਵਿੱਚ) ਵਿਸਤ੍ਰਿਤ ਅਤੇ ਸਪੱਸ਼ਟ ਖੇਤੀਬਾੜੀ ਮੌਸਮ ਸਲਾਹ ਤਿਆਰ ਕਰੋ।"
            prompt = f"""You are KisanGuard agromet AI. {system_inst}
ਕਿਸਾਨ: {farmer_name}
ਪਿੰਡ ਅਤੇ ਜ਼ਿਲ੍ਹਾ: {village}, {district}, {state}
[ML ਮਾਡਲ 1 - ਗਰਮੀ ਦਾ ਤਣਾਅ]: ਵੈੱਟ-ਬਲਬ ਤਾਪਮਾਨ (WBGT) {wbgt}°C, ਤਣਾਅ ਸੂਚਕਾਂਕ (PSI) {psi}/100. ਕੰਮ ਬੰਦ ਰੱਖਣ ਦਾ ਸਮਾਂ: {halt_hours}.
[ML ਮਾਡਲ 2 - ਫ਼ਸਲੀ ਤਣਾਅ]: {crop} ਫ਼ਸਲ, {stage}. CDHI ਤਣਾਅ ਸੂਚਕਾਂਕ {cdhi}/100, ਲਗਾਤਾਰ {heat_stress_days} ਦਿਨ ਗਰਮੀ ਦੀ ਲਹਿਰ.
[ML ਮਾਡਲ 3 - FAO-56 ਸਿੰਚਾਈ ਸੰਤੁਲਨ]: {soil} ਮਿੱਟੀ. ਨਮੀ {soil_moisture}, ਪਾਣੀ ਦੀ ਕਮੀ {water_deficit}. ਸਿਫਾਰਸ਼: {irrigation}.
[ML ਮਾਡਲ 4 - ਝਾੜ ਨੁਕਸਾਨ ਅੰਦਾਜ਼ਾ]: ਬਿਨਾਂ ਸਿੰਚਾਈ {yield_loss} ਝਾੜ ਨੁਕਸਾਨ ਦਾ ਖਤਰਾ, ਸਮੇਂ ਸਿਰ ਸਿੰਚਾਈ ਨਾਲ ਨੁਕਸਾਨ {mitigated_loss} ਤੱਕ ਸੀਮਤ.
[ਸਪਰੇਅ ਹਦਾਇਤ]: {spray_directive}.

ਹਿਦਾਇਤਾਂ:
1. {farmer_name} ਜੀ ਨੂੰ ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਕਹੋ ਅਤੇ {district} ਲਈ ਕਿਸਾਨਗਾਰਡ ਬੁਲੇਟਿਨ ਦੱਸੋ।
2. ਤਾਪਮਾਨ {wbgt}°C ਅਤੇ PSI {psi}/100 ਦੱਸਦੇ ਹੋਏ ਦੁਪਹਿਰ {halt_hours} ਤੱਕ ਕੰਮ ਬੰਦ ਰੱਖਣ ਲਈ ਕਹੋ।
3. {crop} ਦੀ {stage} ਦੌਰਾਨ {yield_loss} ਝਾੜ ਘਟਣ ਦੇ ਖ਼ਤਰੇ ਬਾਰੇ ਚੇਤਾਵਨੀ ਦਿਓ।
4. {soil} ਮਿੱਟੀ ਲਈ {water_deficit} ਪਾਣੀ ਦੀ ਕਮੀ ਪੂਰੀ ਕਰਨ ਲਈ ਸ਼ਾਮ ਨੂੰ {irrigation} ਕਰੋ ਤਾਂ ਜੋ ਨੁਕਸਾਨ {mitigated_loss} ਰਹਿ ਜਾਵੇ।
5. ਤੇਜ਼ ਧੁੱਪ ਵਿੱਚ ਸਪਰੇਅ ਨਾ ਕਰੋ।
6. 55 ਤੋਂ 70 ਸ਼ਬਦਾਂ ਵਿੱਚ ਸ਼ੁੱਧ ਪੰਜਾਬੀ ਗੁਰਮੁਖੀ ਵਿੱਚ ਲਿਖੋ।"""

        elif lang == "te":
            system_inst = "తెలుగు భాషలో లోతైన మరియు ఖచ్చితమైన వ్యవసాయ వాతావరణ సలహాను రూపొందించండి."
            prompt = f"""You are KisanGuard agromet AI. {system_inst}
రైతు: {farmer_name}
గ్రామం, జిల్లా: {village}, {district}, {state}
[ML మోడల్ 1 - హీట్ స్ట్రెయిన్]: WBGT ఉష్ణోగ్రత {wbgt}°C, PSI {psi}/100. పని నిలిపివేత: {halt_hours}.
[ML మోడల్ 2 - పంట ఒత్తిడి]: {crop} ({stage}), CDHI {cdhi}/100, {heat_stress_days} రోజుల తీవ్ర వేడి.
[ML మోడల్ 3 - నీటిపారుదల]: {soil} నేల, తేమ {soil_moisture}, నీటి లోటు {water_deficit}. సలహా: {irrigation}.
[ML మోడల్ 4 - దిగుబడి నష్టం]: ఉపశమనం లేకపోతే {yield_loss} నష్టం, సకాలంలో నీరందిస్తే {mitigated_loss} కి తగ్గుతుంది.
[స్ప్రే హెచ్చరిక]: {spray_directive}.

సూచనలు:
1. {farmer_name} గారికి నమస్కారం.
2. {district} లో WBGT {wbgt}°C మరియు PSI {psi}/100 కాబట్టి {halt_hours} మధ్య పని ఆపండి.
3. {crop} పంటకు {yield_loss} దిగుబడి నష్టం రాకుండా {soil} కోసం సాయంత్రం {water_deficit} {irrigation} చేయండి.
4. మధ్యాహ్నం రసాయనాల పిచికారీ చేయవద్దు.
5. 55-70 పదాలలో స్పష్టమైన తెలుగులో రాయండి."""

        elif lang == "bn":
            system_inst = "বাংলায় গভীর ও সুনির্দিষ্ট কৃষি আবহাওয়া বার্তা তৈরি করুন।"
            prompt = f"""You are KisanGuard agromet AI. {system_inst}
কৃষক: {farmer_name}
স্থান: {village}, {district}, {state}
[ML মডেল ১ - তাপ চাপ]: WBGT {wbgt}°C, PSI {psi}/100. কাজ বন্ধ: {halt_hours}.
[ML মডেল ২ - ফসলের ক্ষতি]: {crop} ({stage}), CDHI {cdhi}/100, {heat_stress_days} দিন তাপপ্রবাহ.
[ML মডেল ৩ - সেচ ও মাটি]: {soil} মাটি, আর্দ্রতা {soil_moisture}, জলের ঘাটতি {water_deficit}. পরামর্শ: {irrigation}.
[ML মডেল ৪ - ফলন ঝুঁকি]: চিকিৎসা ছাড়া {yield_loss} ফলন ক্ষতি, সেচে ক্ষতি কমে {mitigated_loss}.
[স্প্রে নির্দেশিকা]: {spray_directive}.

নির্দেশনা:
১. {farmer_name} বাবুকে নমস্কার জানিয়ে {district}-এর জন্য কিষাণগার্ড পরামর্শ জানান।
২. WBGT {wbgt}°C এবং PSI {psi}/100 উল্লেখ করে {halt_hours} সময়ে মাঠে কাজ বন্ধ রাখুন।
৩. {crop}-এর {stage}-এ {yield_loss} ফলন ক্ষতির ঝুঁকি এড়াতে {soil} মাটিতে সন্ধ্যায় {water_deficit} {irrigation} করুন যাতে ক্ষতি কমে {mitigated_loss} হয়।
৪. রোদে কীটনাশক স্প্রে করবেন না।
৫. ৫৫ থেকে ৭০ শব্দের মধ্যে বাংলায় লিখুন।"""

        else: # Default Hindi (hi)
            system_inst = "शुद्ध देवनागरी हिंदी में सखोल, प्रामाणिक और स्पष्ट कृषि मौसम सुरक्षा सलाह तैयार करें।"
            prompt = f"""You are KisanGuard agromet AI. {system_inst}
किसान: {farmer_name}
स्थान: {village}, {district}, {state}
[ML मॉडल 1 - मानव हीट स्ट्रेन]: वेट-बल्ब तापमान (WBGT) {wbgt}°C, शारीरिक तनाव सूचकांक (PSI) {psi}/100। खेत कार्य बंदी: {halt_hours}।
[ML मॉडल 2 - फसल सूखा-ताप तनाव]: {crop} फसल, {stage}। CDHI तनाव स्कोर {cdhi}/100, NDVI {ndvi}, लगातार {heat_stress_days} दिनों से लू।
[ML मॉडल 3 - FAO-56 मृदा जल संतुलन]: {soil} मिट्टी। नमी {soil_moisture}, जल कमी {water_deficit}। सुझाई गई सिंचाई: {irrigation}।
[ML मॉडल 4 - उपज नुकसान पूर्वानुमान]: बिना उपचार {yield_loss} उपज नुकसान का गंभीर खतरा, शाम की सिंचाई से नुकसान घटकर {mitigated_loss} तक सीमित।
[फसल सुरक्षा निर्देश]: {spray_directive}।

आवश्यकताएँ:
1. {farmer_name} जी को नमस्ते कहें और {district} के लिए किसानगार्ड बुलेटिन बताएं।
2. वेट-बल्ब तापमान {wbgt}°C और PSI {psi}/100 बताते हुए दोपहर {halt_hours} तक खेत का काम बंद रखने का निर्देश दें।
3. {crop} की {stage} पर CDHI तनाव {cdhi}/100 और {yield_loss} उपज नुकसान के खतरे की स्पष्ट चेतावनी दें।
4. {soil} मिट्टी में {water_deficit} जल कमी पूरी करने हेतु शाम को {irrigation} करने की सलाह दें ताकि फसल नुकसान {mitigated_loss} तक सीमित रहे।
5. दोपहर की तेज धूप में कीटनाशक का छिड़काव बिल्कुल न करने की सख्त सलाह दें।
6. ५५ से ७० शब्दों में केवल शुद्ध देवनागरी हिंदी में लिखें। कोई अंग्रेजी या रोमन लिपि न हो। केवल बोलने वाला पाठ दें।"""

        res = bedrock.converse(
            modelId='meta.llama3-8b-instruct-v1:0',
            messages=[{'role': 'user', 'content': [{'text': prompt}]}],
            inferenceConfig={'maxTokens': 450, 'temperature': 0.15}
        )
        
        raw_text = res['output']['message']['content'][0]['text'].strip()
        clean_text = raw_text.replace('"', '').replace('**', '').replace('##', '').strip()
        t_bedrock = time.time() - t0
        
        t1 = time.time()
        # For Polly TTS: Kajal Neural reads Hindi, Marathi, Indian English with natural cadence
        audio_res = polly.synthesize_speech(
            Engine='neural',
            VoiceId='Kajal',
            OutputFormat='mp3',
            Text=clean_text
        )
        audio_bytes = audio_res['AudioStream'].read()
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
        t_polly = time.time() - t1
        
        calc_duration = max(18, int(len(audio_bytes) / 4800))
        
        payload = {
            "success": True,
            "farmerName": farmer_name,
            "district": district,
            "language": lang,
            "generatedText": clean_text,
            "audioBase64": audio_b64,
            "audioMimeType": "audio/mpeg",
            "audioSizeBytes": len(audio_bytes),
            "estimatedDuration": calc_duration,
            "metrics": {
                "wbgt": wbgt,
                "psi": psi,
                "cdhi": cdhi,
                "ndvi": ndvi,
                "heatStressDays": heat_stress_days,
                "crop": crop,
                "stage": stage,
                "soil": soil,
                "soilMoisture": soil_moisture,
                "waterDeficit": water_deficit,
                "irrigation": irrigation,
                "yieldLossRisk": yield_loss,
                "mitigatedLoss": mitigated_loss,
                "haltHours": halt_hours,
                "sprayDirective": spray_directive,
                "severity": severity
            },
            "meta": {
                "model": "meta.llama3-8b-instruct-v1:0 (Amazon Bedrock)",
                "voiceEngine": "Amazon Polly Neural (Kajal)",
                "bedrockTime": round(t_bedrock, 2),
                "pollyTime": round(t_polly, 2),
                "totalTime": round(time.time() - t0, 2)
            }
        }
        
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps(payload, ensure_ascii=False)
        }
        
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "success": False,
                "error": str(e)
            })
        }
