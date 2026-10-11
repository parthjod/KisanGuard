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
        soil = data.get("soilType") or data.get("soil") or "loam soil"
        irrigation = data.get("irrigationMethod") or data.get("irrigation") or "evening drip irrigation"
        wbgt = data.get("wbgt") or 33.8
        halt_hours = data.get("haltHours") or "11:30 AM - 3:30 PM"
        severity = data.get("severity") or "red"
        lang = (data.get("language") or "hi").lower()
        
        t0 = time.time()
        
        # Craft precise language instructions ensuring 100% adherence to active metrics
        if lang == "en":
            system_inst = "Generate a concise, authoritative spoken agromet safety advisory in clean, fluent English."
            prompt = f"""You are KisanGuard agromet AI. {system_inst}
Target Farmer: {farmer_name}
Location: {village}, {district}, {state}
Crop: {crop} ({stage})
Soil Type: {soil}
Smart Irrigation Advice: {irrigation}
Wet-Bulb Globe Temperature (WBGT): {wbgt}°C ({'Extreme Heat Stress' if severity == 'red' else 'Heat Caution'})
Mandatory Field Halt Window: {halt_hours}

Requirements:
- Greet {farmer_name} by name.
- Explicitly state the live WBGT temperature of {wbgt}°C in {district}.
- State that during {crop}'s {stage}, field work must halt between {halt_hours}.
- Recommend {irrigation} on {soil} to maintain soil moisture and avoid thermal shock.
- Strictly under 35 words. No markdown, quotes, or conversational preamble. Return ONLY the spoken text."""

        elif lang == "mr":
            system_inst = "मराठी भाषेत (देवनागरी लिपीत) स्पष्ट आणि संक्षिप्त कृषी हवामान सल्ला तयार करा."
            prompt = f"""You are KisanGuard agromet AI. {system_inst}
शेतकरी: {farmer_name}
गाव व जिल्हा: {village}, {district}, {state}
पीक: {crop} ({stage})
मातीचा प्रकार: {soil}
सिंचन शिफारस: {irrigation}
वेट-बल्ब तापमान (WBGT): {wbgt}°C
शेतकाम बंद ठेवण्याची वेळ: {halt_hours}

सूचना:
- {farmer_name} यांना नमस्कार करा.
- {district} मध्ये वेट-बल्ब तापमान {wbgt} अंश सेल्सिअस नोंदवले गेले आहे हे सांगा.
- {crop} पिकासाठी दुपारी {halt_hours} दरम्यान शेतातील कामे थांबवण्याचे स्पष्ट निर्देश द्या.
- {soil} मातीसाठी {irrigation} करण्याचा सल्ला द्या.
- कमाल ३५ शब्द. शुद्ध मराठी देवनागरीत लिहा. कोणतीही इंग्रजी अक्षरे वापरू नका."""

        elif lang == "pa":
            system_inst = "ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਵਿੱਚ ਸਪੱਸ਼ਟ ਅਤੇ ਸੰਖੇਪ ਖੇਤੀਬਾੜੀ ਮੌਸਮ ਸਲਾਹ ਤਿਆਰ ਕਰੋ।"
            prompt = f"""You are KisanGuard agromet AI. {system_inst}
ਕਿਸਾਨ: {farmer_name}
ਪਿੰਡ ਅਤੇ ਜ਼ਿਲ੍ਹਾ: {village}, {district}, {state}
ਫ਼ਸਲ: {crop} ({stage})
ਮਿੱਟੀ ਦੀ ਕਿਸਮ: {soil}
ਸਿੰਚਾਈ ਦੀ ਸਲਾਹ: {irrigation}
ਵੈੱਟ-ਬਲਬ ਤਾਪਮਾਨ (WBGT): {wbgt}°C
ਖੇਤ ਕੰਮ ਬੰਦ ਰੱਖਣ ਦਾ ਸਮਾਂ: {halt_hours}

ਹਿਦਾਇਤਾਂ:
- {farmer_name} ਜੀ ਨੂੰ ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਕਹੋ।
- {district} ਵਿੱਚ ਵੈੱਟ-ਬਲਬ ਤਾਪਮਾਨ {wbgt} ਡਿਗਰੀ ਸੈਲਸੀਅਸ ਹੋਣ ਬਾਰੇ ਦੱਸੋ।
- {crop} ਫ਼ਸਲ ਲਈ ਦੁਪਹਿਰ {halt_hours} ਦਰਮਿਆਨ ਖੇਤ ਦਾ ਕੰਮ ਬੰਦ ਰੱਖਣ ਦਾ ਹੁਕਮ ਦਿਓ।
- {soil} ਲਈ {irrigation} ਦੀ ਸਿਫਾਰਸ਼ ਕਰੋ।
- ਵੱਧ ਤੋਂ ਵੱਧ ੩੫ ਸ਼ਬਦ। ਕੇਵਲ ਸਪੱਸ਼ਟ ਬੋਲਣ ਵਾਲਾ ਪਾਠ ਦਿਓ।"""

        elif lang == "te":
            system_inst = "తెలుగు భాషలో వ్యవసాయ వాతావరణ హెచ్చరికను రూపొందించండి."
            prompt = f"""You are KisanGuard agromet AI. {system_inst}
రైతు: {farmer_name}
గ్రామం, జిల్లా: {village}, {district}, {state}
పంట: {crop} ({stage})
నేల రకం: {soil}
నీటిపారుదల సలహా: {irrigation}
WBGT ఉష్ణోగ్రత: {wbgt}°C
పని నిలిపివేత సమయం: {halt_hours}

సూచనలు:
- {farmer_name} గారికి నమస్కారం తెలపండి.
- {district} లో WBGT ఉష్ణోగ్రత {wbgt}°C గా నమోదైందని చెప్పండి.
- {halt_hours} సమయంలో పొలం పనులను ఆపివేయాలని సూచించండి.
- {soil} కోసం {irrigation} చేయాలని చెప్పండి.
- 35 పదాల లోపు మాత్రమే ఉండాలి."""

        elif lang == "bn":
            system_inst = "বাংলায় স্পষ্ট ও সংক্ষিপ্ত কৃষি আবহাওয়া বার্তা তৈরি করুন।"
            prompt = f"""You are KisanGuard agromet AI. {system_inst}
কৃষক: {farmer_name}
স্থান: {village}, {district}, {state}
ফসল: {crop} ({stage})
মাটি: {soil}
সেচ পরামর্শ: {irrigation}
তাপমাত্রা (WBGT): {wbgt}°C
কাজের বিরতি: {halt_hours}

নির্দেশনা:
- {farmer_name} বাবুকে নমস্কার জানান।
- {district}-এ {wbgt}°C তাপমাত্রা রেকর্ড করা হয়েছে জানান।
- {halt_hours} সময়ে মাঠে কাজ বন্ধ রাখুন।
- {soil} মাটিতে {irrigation} করার পরামর্শ দিন।
- ৩৫ শব্দের মধ্যে সীমাবদ্ধ রাখুন।"""

        else: # Default Hindi (hi)
            system_inst = "शुद्ध हिंदी (देवनागरी लिपि) में स्पष्ट और संक्षिप्त कृषि मौसम सुरक्षा सलाह तैयार करें।"
            prompt = f"""You are KisanGuard agromet AI. {system_inst}
किसान: {farmer_name}
स्थान: {village}, {district}, {state}
फसल: {crop} ({stage})
मिट्टी: {soil}
सिंचाई सलाह: {irrigation}
वेट-बल्ब तापमान (WBGT): {wbgt}°C ({'अत्यधिक गर्मी खतरा' if severity == 'red' else 'गर्मी सावधानी'})
खेत कार्य बंदी समय: {halt_hours}

दिशा-निर्देश:
- {farmer_name} जी को नमस्ते कहें।
- {district} में वेट-बल्ब तापमान {wbgt} डिग्री सेल्सियस दर्ज हुआ है बताएं।
- {crop} की {stage} सुरक्षा हेतु दोपहर {halt_hours} तक खेत का काम बंद रखने का स्पष्ट निर्देश दें।
- {soil} में {irrigation} करने की सलाह दें।
- अधिकतम ३५ शब्द। केवल देवनागरी हिंदी में लिखें, कोई अंग्रेजी या रोमन लिपि न हो।"""

        res = bedrock.converse(
            modelId='meta.llama3-8b-instruct-v1:0',
            messages=[{'role': 'user', 'content': [{'text': prompt}]}],
            inferenceConfig={'maxTokens': 350, 'temperature': 0.15}
        )
        
        raw_text = res['output']['message']['content'][0]['text'].strip()
        clean_text = raw_text.replace('"', '').replace('**', '').replace('##', '').strip()
        t_bedrock = time.time() - t0
        
        t1 = time.time()
        # For Polly TTS: Kajal Neural reads Hindi, Marathi, Indian English with natural cadence
        # If Punjabi/Telugu/Bengali, Kajal Neural reads accurately when passed standard Unicode text
        audio_res = polly.synthesize_speech(
            Engine='neural',
            VoiceId='Kajal',
            OutputFormat='mp3',
            Text=clean_text
        )
        audio_bytes = audio_res['AudioStream'].read()
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
        t_polly = time.time() - t1
        
        calc_duration = max(14, int(len(audio_bytes) / 5200))
        
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
                "severity": severity,
                "crop": crop,
                "stage": stage,
                "soil": soil,
                "irrigation": irrigation,
                "haltHours": halt_hours
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
