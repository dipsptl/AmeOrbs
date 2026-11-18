import { BreathPhase, GuidedExerciseId, LanguageCode } from '../types/zen';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  locale: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', locale: 'en-US' },
  { code: 'hi', label: 'हिन्दी', locale: 'hi-IN' },
  { code: 'gu', label: 'ગુજરાતી', locale: 'gu-IN' },
  { code: 'es', label: 'Español', locale: 'es-ES' },
  { code: 'ja', label: '日本語', locale: 'ja-JP' },
];

export const LANGUAGE_LOCALE_MAP: Record<LanguageCode, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  gu: 'gu-IN',
  es: 'es-ES',
  ja: 'ja-JP',
};

export interface ExerciseTranslation {
  title: string;
  shortTitle: string;
  subtitle: string;
  introVoice: string;
  steps?: Record<BreathPhase, string>;
  periodicCues?: string[];
}

export interface LocaleStrings {
  brandName: string;
  brandSubtitle: string;
  badgeHandsFirst: string;
  landingTitle: string;
  landingDescription: string;
  tapPhoneToBegin: string;
  mobileViewSubtitle: string;
  cardAuraTitle: string;
  cardAuraBody: string;
  cardPalmTitle: string;
  cardPalmBody: string;
  cardStretchTitle: string;
  cardStretchBody: string;
  enterSanctuary: string;
  enterVR: string;
  exitVR: string;
  gestures: string;
  hideControls: string;
  showDock: string;
  auraGuidePrefix: string;
  placesLabel: string;
  chatPlaceholder: string;
  voiceBtn: string;
  listeningBtn: string;
  travelBtn: string;
  generatingBtn: string;
  voiceGuideOn: string;
  voiceGuideOff: string;
  autoGlideOn: string;
  autoGlideOff: string;
  wristBtn: string;
  resetBtn: string;
  loading360: string;
  cyclesLabel: string;
  freedLabel: string;
  dewdropBanner: string;
  focusStages: {
    morning: string;
    golden: string;
    twilight: string;
    paused: string;
    complete: string;
    pinchPause: string;
    pinchResume: string;
  };
  exercises: Record<GuidedExerciseId, ExerciseTranslation>;
  presets: Record<
    string,
    {
      shortName: string;
      placeName: string;
      welcomeLine: string;
    }
  >;
}

/**
 * Phonetic Devanagari equivalents for Gujarati exercise lines so that browsers
 * without a native `gu-IN` Web Speech voice speak gentle Gujarati seamlessly via `hi-IN`.
 */
export const GUJARATI_TO_HINDI_PHONETIC: Record<string, string> = {
  'ચાલો પતંગિયા પાંખ સ્ટ્રેચ શરૂ કરીએ... ખભા હળવા રાખો અને પ્રેમથી ઊંડો શ્વાસ અંદર લો.':
    'चालो पतंगिया पांख स्ट्रेच शरू करिए... खभा हळवा राखो अने प्रेमथी ऊंडो श्वास अंदर लो.',
  'ધીમેથી ઊંડો શ્વાસ અંદર લો... પતંગિયાની પાંખોની જેમ બંને હાથ પ્રેમથી ફેલાવો.':
    'धीमेथी ऊंडो श्वास अंदर लो... पतंगियानी पांखोनी जेम बन्ने हाथ प्रेमथी फेलावो.',
  'એક ક્ષણ શાંતિથી રોકાઓ... હૃદયમાં હળવો વિસામો અનુભવો.':
    'एक क्षण शांतिथी रोकाओ... हृदयमां हळवो विसामो अनुभवो.',
  'હવે કોમળતાથી શ્વાસ બહાર છોડો... હાથ અને ખભાને સંપૂર્ણ હળવા કરી દો.':
    'हवे कोमळताथी श्वास बहार छोडो... हाथ अने खभाने संपूर्ण हळवा करी दो.',

  'ખભાને ઢીલા છોડો... દૂર ક્ષિતિજ પર શાંતિથી ઉડતા સોનેરી પતંગિયાને પ્રેમથી જુઓ.':
    'खभाने ढीला छोडो... दूर क्षितिज पर शांतिथी उडता सोनेरी पतंगियाने प्रेमथी जुओ.',
  'ધીમો મધુર શ્વાસ લો... સોનેરી પતંગિયાની સાથે તમારી નજર હળવેથી ફેરવો.':
    'धीमो मधुर श्वास लो... सोनेरी पतंगियानी साथे तमारी नजर हळवेथी फेरवो.',
  'શાંતિથી એક પળ રોકાઓ... દૂરના કુદરતી દૃશ્ય પર આરામથી નજર ટકાવો.':
    'शांतिथी एक पळ रोकाओ... दूरना कुदरती दृश्य पर आरामथी नजर टकावो.',
  'ધીમેથી શ્વાસ છોડો... ગરદન અને ખભાનો બધો ભાર પ્રેમથી દૂર થવા દો.':
    'धीमेथी श्वास छोडो... गरदन अने खभानो बधो भार प्रेमथी दूर थवा दो.',

  'ઊંડો શ્વાસ લો અને તમારા બંને હાથ ધીમેથી ઉપર ઉઠાવો... શાંતિથી પ્રકાશને અનુભવો.':
    'ऊंडो श्वास लो अने तमारा बन्ने हाथ धीमेथी ऊपर उठावो... शांतिथी प्रकाशने अनुभवो.',
  'ઊંડો શ્વાસ લો અને તમારા બંને હાથ ધીમેથી ઉપર ઉઠાવો...':
    'ऊंडो श्वास लो अने तमारा बन्ने हाथ धीमेथी ऊपर उठावो...',
  'ઉપર એક મધુર ક્ષણ સ્થિર રહો... સોનેરી શાંતિને અનુભવો.':
    'ऊपर एक मधुर क्षण स्थिर रहो... सोनेरी शांतिने अनुभवो.',
  'હળવેથી શ્વાસ બહાર છોડો... અને હાથ કોમળતાથી નીચે લાવો.':
    'हळवेथी श्वास बहार छोडो... अने हाथ कोमळताथी नीचे लावो.',

  'સામે તરતા દરેક ચમકતા ટીપાંને હળવેથી સ્પર્શો... અને દરેક શ્વાસ સાથે મનને શાંત કરો.':
    'सामे तरता दरेक चमकता टीपांने हळवेथी स्पर्शो... अने दरेक श्वास साथे मनने शांत करो.',
  'નજીક તરતા સોનેરી ટીપાંને પ્રેમથી સ્પર્શો... અને ઊંડો શ્વાસ બહાર છોડો.':
    'नजीक तरता सोनेरी टीपांने प्रेमथी स्पर्शो... अने ऊंडो श्वास बहार छोडो.',
  'દરેક મુક્ત થતા પતંગિયા સાથે... તમારા ખભા વધુ હળવા થતા અનુભવો.':
    'दरेक मुक्त थता पतंगिया साथे... तमारा खभा वधु हळवा थता अनुभवो.',
  'ધીમો શ્વાસ અંદર લો... અને શાંતિથી બહાર છોડો.':
    'धीमो श्वास अंदर लो... अने शांतिथी बहार छोडो.',

  'આરામથી બેસી જાઓ... આવતી પાંચ મિનિટ માત્ર આ શાંત પ્રકૃતિ અને તમારા શ્વાસને નિહાળો.':
    'आरामथी बेसी जाओ... आवती पांच मिनिट मात्र आ शांत प्रकृति अने तमारा श्वासने निहाळो.',
  'કોઈ ઉતાવળ નથી... તમારા શ્વાસને કુદરતી રીતે વહેવા દો.':
    'कोई उतावळ नथी... तमारा श्वासने कुदरती रीते वहेवा दो.',
  'તમારા શરીરને સંપૂર્ણ સ્થિર... અને હળવું અનુભવો.':
    'तमारा शरीरने संपूर्ण स्थिर... अने हळवुं अनुभवो.',
  'ધીમે ધીમે છવાતી સંધ્યાની મધુર શાંતિમાં... પ્રેમથી વિશ્રામ કરો.':
    'धीमे धीमे छवाती संध्यानी मधुर शांतिमां... प्रेमथी विश्राम करो.',
};

export const TRANSLATIONS: Record<LanguageCode, LocaleStrings> = {
  en: {
    brandName: 'AmeOrbs',
    brandSubtitle: '360° Real Nature Sanctuary',
    badgeHandsFirst: '100% Hands-First WebXR',
    landingTitle: 'Breathe Inside Real Peaceful Nature',
    landingDescription:
      'Immerse yourself in 360° real landscapes with gentle butterflies, golden orbs, smooth automatic glide, and a calm guided exercise voice.',
    tapPhoneToBegin: 'Tap inside to enter the calm 360° exercise',
    mobileViewSubtitle: '360° Nature · Guided Breath',
    cardAuraTitle: 'Aura Guide & Mic',
    cardAuraBody:
      'Describe any peaceful mountain, river, ocean, or forest to explore a matching 360° landscape.',
    cardPalmTitle: 'Left Palm Up',
    cardPalmBody:
      'Turn your left palm toward your face in VR (or press P) to open the wrist menu and tap with your right index finger.',
    cardStretchTitle: 'Guided Glide & Stretch',
    cardStretchBody:
      'Relax as the camera glides smoothly while you breathe, follow the golden butterfly, or release glowing dewdrops.',
    enterSanctuary: 'Enter Sanctuary',
    enterVR: 'Enter VR (WebXR)',
    exitVR: 'Exit VR',
    gestures: 'Gestures',
    hideControls: 'Hide Controls',
    showDock: 'Show Sanctuary Dock',
    auraGuidePrefix: 'Aura Guide:',
    placesLabel: 'Wonders:',
    chatPlaceholder:
      "Visit any natural wonder (e.g. 'Snowy mountain river', 'Ocean sunrise waves', 'Wildflower meadow')...",
    voiceBtn: 'Voice',
    listeningBtn: 'Listening',
    travelBtn: 'Explore',
    generatingBtn: 'Loading',
    voiceGuideOn: 'Voice Guide: ON',
    voiceGuideOff: 'Voice Guide: OFF',
    autoGlideOn: 'Slow Glide: ON',
    autoGlideOff: 'Slow Glide: OFF',
    wristBtn: 'Wrist (P)',
    resetBtn: 'Reset',
    loading360: 'Loading 360° view...',
    cyclesLabel: 'Cycles',
    freedLabel: 'freed',
    dewdropBanner: 'Dewdrop Release · Butterflies Freed',
    focusStages: {
      morning: 'Daylight Stillness',
      golden: 'Golden Light',
      twilight: 'Serene Twilight',
      paused: 'Paused',
      complete: '5m Scenic Focus Complete',
      pinchPause: 'Pinch Crystal to Pause',
      pinchResume: 'Pinch Crystal to Resume',
    },
    exercises: {
      butterfly_wing_stretch: {
        title: 'Butterfly Wing Stretch',
        shortTitle: 'Wing Stretch',
        subtitle: 'Open your arms wide as you inhale and softly release as you exhale',
        introVoice:
          'Let your shoulders soften... breathe in gently, and open both arms like peaceful wings.',
        steps: {
          inhale: 'Breathe in softly... open both arms wide like gentle wings.',
          hold: 'Rest for a quiet moment... feel your heart open in stillness.',
          exhale: 'Slowly breathe out... let your hands and shoulders melt softly down.',
        },
      },
      horizon_neck_gaze: {
        title: 'Horizon Neck Gaze',
        shortTitle: 'Neck Gaze',
        subtitle: 'Softly follow the glowing golden butterfly gliding across the horizon',
        introVoice:
          'Let your shoulders drop... and gently follow the golden butterfly across the quiet horizon.',
        steps: {
          inhale: 'Inhale gently... follow the golden butterfly as it glides across the view.',
          hold: 'Pause softly... let your eyes rest in the quiet distance.',
          exhale: 'Exhale slowly... release every trace of tension from your neck.',
        },
      },
      lotus_sky_reach: {
        title: 'Lotus Sky Reach',
        shortTitle: 'Sky Reach',
        subtitle: 'Breathe in deeply and slowly lift both hands toward the light',
        introVoice:
          'Take a slow, loving breath in... and gently lift both hands toward the warm light.',
        steps: {
          inhale: 'Breathe in deeply... and slowly lift both hands...',
          hold: 'Hold gently at the top... rest in warm golden peace.',
          exhale: 'Breathe out softly... and float your hands back down.',
        },
      },
      dewdrop_release: {
        title: 'Dewdrop Release',
        shortTitle: 'Dewdrops',
        subtitle: 'Pinch or tap glowing orbs to release golden motes and butterflies',
        introVoice:
          'Touch each floating dewdrop gently... and let your breath carry away every worry.',
        periodicCues: [
          'Notice a warm orb near you... touch it softly and breathe out.',
          'With every butterfly freed... let your shoulders sink even deeper.',
          'Take a gentle breath in... and softly let go.',
        ],
      },
      scenic_focus_5m: {
        title: '5m Scenic Focus',
        shortTitle: '5m Focus',
        subtitle: 'Rest effortlessly for five minutes as the light softens into calm twilight',
        introVoice:
          'Settle into stillness... just watch the peaceful landscape and breathe at your own pace.',
        periodicCues: [
          'Nothing to hurry... simply rest your eyes on the quiet light.',
          'Feel how deeply supported you are... with each slow exhale.',
          'Rest gently in the hush... as twilight settles softly around you.',
        ],
      },
    },
    presets: {
      moss_woods: {
        shortName: 'Moss Woods',
        placeName: 'Emerald Moss Woods',
        welcomeLine: 'Step inside an ancient mossy woodland bathed in soft emerald light.',
      },
      river_valley: {
        shortName: 'River Valley',
        placeName: 'Flowing River Valley',
        welcomeLine: 'Breathe in cool valley air beside a winding river and lush green cliffs.',
      },
      flower_meadow: {
        shortName: 'Flower Meadow',
        placeName: 'Sunlit Wildflower Meadow',
        welcomeLine: 'Rest in a sunlit meadow of wild blossoms and a soft warm breeze.',
      },
      rainforest_canopy: {
        shortName: 'Rainforest',
        placeName: 'Lush Rainforest Canopy',
        welcomeLine: 'Breathe deeply beneath sunlit forest leaves and tranquil woodland shade.',
      },
      sunset_lagoon: {
        shortName: 'Sunset Lagoon',
        placeName: 'Golden Sunset Lagoon',
        welcomeLine: 'Rest beside calm waters as warm amber sunset reflections glow softly.',
      },
      pine_mist: {
        shortName: 'Pine Cloud',
        placeName: 'Misty Pine Cloud Forest',
        welcomeLine: 'Welcome to a quiet mountain forest of tall pines drifting through silver mist.',
      },
      dawn_lake: {
        shortName: 'Dawn Lake',
        placeName: 'Pastel Dawn Lake',
        welcomeLine: 'Take in cool rose-gold dawn light above tranquil mirror-still waters.',
      },
      alpine_meadow: {
        shortName: 'Mountain Valley',
        placeName: 'Alpine Mountain Meadow',
        welcomeLine: 'Breathe crisp mountain air in an open wildflower valley under clear skies.',
      },
      coastal_cliffs: {
        shortName: 'Ocean Horizon',
        placeName: 'Sunlit Ocean Cliffs',
        welcomeLine: 'Feel the warm sea breeze drifting gently across sunlit coastal hills.',
      },
      misty_highlands: {
        shortName: 'Emerald Hills',
        placeName: 'Misty Highland Sanctuary',
        welcomeLine: 'Rest effortlessly among cool emerald hills and drifting morning mist.',
      },
    },
  },

  hi: {
    brandName: 'AmeOrbs',
    brandSubtitle: '360° प्राकृतिक शांति अभयारण्य',
    badgeHandsFirst: '100% हैंड्स-फर्स्ट WebXR',
    landingTitle: 'असली शांत प्रकृति में गहरी सांस लें',
    landingDescription:
      'असली 360° प्राकृतिक दृश्यों, प्यारी तितलियों, सुनहरे प्रकाश, धीमे चलने वाले ग्लाइड और कोमल शांत आवाज़ के मार्गदर्शन का अनुभव करें।',
    tapPhoneToBegin: 'शांति का अभ्यास शुरू करने के लिए टैप करें',
    mobileViewSubtitle: '360° प्रकृति · शांत श्वास',
    cardAuraTitle: 'ऑरा गाइड और माइक',
    cardAuraBody:
      'किसी भी पर्वत, नदी, समुद्र, जंगल या फूलों की घाटी का नाम लिखें या बोलें।',
    cardPalmTitle: 'बायां हाथ ऊपर',
    cardPalmBody:
      'VR में बाईं हथेली ऊपर करें (या P दबाएं) और दाईं उंगली से मेनू चुनें।',
    cardStretchTitle: 'शांत ग्लाइड और स्ट्रेच',
    cardStretchBody:
      'धीमे चलते कैमरे के साथ कंधों को ढीला छोड़ें, सुनहरी तितली को देखें या चमकते मोती छूएं।',
    enterSanctuary: 'अभयारण्य में प्रवेश करें',
    enterVR: 'VR शुरू करें (WebXR)',
    exitVR: 'VR बंद करें',
    gestures: 'संकेत',
    hideControls: 'नियंत्रण छुपाएं',
    showDock: 'मेनू दिखाएं',
    auraGuidePrefix: 'ऑरा गाइड:',
    placesLabel: 'प्रकृति:',
    chatPlaceholder: "कोई प्राकृतिक दृश्य लिखें (जैसे 'बहती पर्वत नदी', 'समुद्र सूर्योदय', 'फूलों का मैदान')...",
    voiceBtn: 'आवाज़',
    listeningBtn: 'सुन रहा हूँ',
    travelBtn: 'जाएं',
    generatingBtn: 'खुल रहा है',
    voiceGuideOn: 'वॉइस गाइड: चालू',
    voiceGuideOff: 'वॉइस गाइड: बंद',
    autoGlideOn: 'धीमा ग्लाइड: चालू',
    autoGlideOff: 'धीमा ग्लाइड: बंद',
    wristBtn: 'रिस्ट (P)',
    resetBtn: 'रीसेट',
    loading360: '360° दृश्य लोड हो रहा है...',
    cyclesLabel: 'चक्र',
    freedLabel: 'मुक्त',
    dewdropBanner: 'ओस विमोचन · मुक्त तितलियाँ',
    focusStages: {
      morning: 'सुनहरा प्रकाश',
      golden: 'मधुर संध्या',
      twilight: 'शांत गोधूलि',
      paused: 'रुका हुआ',
      complete: '5 मिनट का ध्यान पूर्ण',
      pinchPause: 'रोकने के लिए क्रिस्टल छूएं',
      pinchResume: 'जारी रखने के लिए क्रिस्टल छूएं',
    },
    exercises: {
      butterfly_wing_stretch: {
        title: 'तितली पंख स्ट्रेच',
        shortTitle: 'पंख स्ट्रेच',
        subtitle: 'सांस लेते हुए दोनों बांहें धीरे से फैलाएं और छोड़ते हुए विश्राम करें',
        introVoice:
          'अपने कंधों को कोमलता से ढीला छोड़ें... धीरे से गहरी सांस लें और तितली की तरह हाथ फैलाएं।',
        steps: {
          inhale: 'प्रेम से गहरी सांस लें... तितली के पंखों की तरह बांहें धीरे-धीरे खोलें।',
          hold: 'एक शांत पल ठहरें... हृदय में हल्की मधुर शांति महसूस करें।',
          exhale: 'अब धीरे से सांस छोड़ें... हाथों और कंधों को पूरी तरह विश्राम दें।',
        },
      },
      horizon_neck_gaze: {
        title: 'क्षितिज गर्दन दृष्टि',
        shortTitle: 'गर्दन दृष्टि',
        subtitle: 'क्षितिज पर उड़ती सुनहरी तितली को कोमलता से देखें',
        introVoice:
          'कंधों को बिल्कुल शांत रखें... और दूर क्षितिज पर उड़ती सुनहरी तितली को प्यार से देखें।',
        steps: {
          inhale: 'मधुर धीमी सांस लें... सुनहरी तितली के साथ अपनी नज़र धीरे से घुमाएं।',
          hold: 'पल भर शांत ठहरें... दूर की प्राकृतिक शांति पर आराम से देखें।',
          exhale: 'कोमलता से सांस छोड़ें... गर्दन और कंधों का सारा बोझ छोड़ दें।',
        },
      },
      lotus_sky_reach: {
        title: 'कमल आकाश स्पर्श',
        shortTitle: 'आकाश स्पर्श',
        subtitle: 'गहरी सांस लें और अपने दोनों हाथ धीरे-धीरे ऊपर उठाएं',
        introVoice:
          'प्यार से गहरी सांस लें... और अपने दोनों हाथ धीरे-धीरे सुनहरे प्रकाश की ओर उठाएं।',
        steps: {
          inhale: 'गहरी सांस लें... और अपने दोनों हाथ धीरे-धीरे ऊपर उठाएं...',
          hold: 'ऊपर एक शांत पल ठहरें... सुनहरी शांति को महसूस करें।',
          exhale: 'धीरे-धीरे सांस छोड़ें... और हाथों को कोमलता से नीचे लाएं।',
        },
      },
      dewdrop_release: {
        title: 'ओस विमोचन',
        shortTitle: 'ओस बूंदें',
        subtitle: 'तनाव छोड़ने के लिए चमकती ओस की बूंदों को छूएं या पिंच करें',
        introVoice:
          'सामने तैरती हर चमकती बूंद को प्यार से छूएं... और हर सांस के साथ मन को हल्का करें।',
        periodicCues: [
          'अपने पास तैरती सुनहरी बूंद को कोमलता से छूएं... और गहरी सांस छोड़ें।',
          'हर मुक्त होती तितली के साथ... अपने कंधों को और भी ढीला महसूस करें।',
          'धीरे से सांस अंदर लें... और शांत मन से बाहर छोड़ें।',
        ],
      },
      scenic_focus_5m: {
        title: '5 मिनट शांत ध्यान',
        shortTitle: '5 मिनट ध्यान',
        subtitle: 'पांच मिनट तक बिना किसी प्रयास के दृश्य और संध्या की शांति का अनुभव करें',
        introVoice:
          'आराम से बैठ जाएं... अगले पांच मिनट केवल इस शांत प्रकृति और अपनी सांसों को निहारें।',
        periodicCues: [
          'कोई जल्दबाज़ी नहीं... अपनी सांसों को स्वाभाविक रूप से बहने दें।',
          'अपने शरीर को पूरी तरह शांत... और स्थिर महसूस करें।',
          'धीरे-धीरे ढलती संध्या की मधुर शांति में... आराम से विश्राम करें।',
        ],
      },
    },
    presets: {
      moss_woods: {
        shortName: 'काई वन',
        placeName: 'हरित काई वन',
        welcomeLine: 'कोमल सुनहरी रोशनी से सजे शांत हरे-भरे काई और फ़र्न वन में सांस लें।',
      },
      river_valley: {
        shortName: 'नदी घाटी',
        placeName: 'कलकल नदी घाटी',
        welcomeLine: 'बहती हुई निर्मल नदी और हरी-भरी पहाड़ी घाटी की ताज़ी हवा में विश्राम करें।',
      },
      flower_meadow: {
        shortName: 'फूल मैदान',
        placeName: 'सूरजमुखी फूल मैदान',
        welcomeLine: 'खिली हुई जंगली फूलों की धूप भरी वादियों और मंद हवा का आनंद लें।',
      },
      rainforest_canopy: {
        shortName: 'वर्षावन',
        placeName: 'घना वर्षावन शिखर',
        welcomeLine: 'हरे-भरे पेड़ों की छांव और सुनहरी धूप के बीच गहरी शांति महसूस करें।',
      },
      sunset_lagoon: {
        shortName: 'सूर्यास्त झील',
        placeName: 'स्वर्णिम सूर्यास्त झील',
        welcomeLine: 'शांत जल पर चमकती सुनहरी संध्या की मधुर रोशनी में खो जाएं।',
      },
      pine_mist: {
        shortName: 'देवदार वन',
        placeName: 'धुंधला देवदार वन',
        welcomeLine: 'चांदी जैसी धुंध में लिपटे ऊंचे शांत देवदार वृक्षों के बीच सांस लें।',
      },
      dawn_lake: {
        shortName: 'भोर सरोवर',
        placeName: 'गुलाबी भोर सरोवर',
        welcomeLine: 'शांत झील के ऊपर फैली गुलाबी-सुनहरी सुबह की कोमल शांति का अनुभव करें।',
      },
      alpine_meadow: {
        shortName: 'पर्वत घाटी',
        placeName: 'हिमशिखर फूल घाटी',
        welcomeLine: 'खुले पहाड़ी फूलों के मैदान और शुद्ध ताज़ी हवा में गहरी सांस लें।',
      },
      coastal_cliffs: {
        shortName: 'सागर तट',
        placeName: 'सुनहरा सागर तट',
        welcomeLine: 'समुद्र की लहरों के ऊपर बहती मीठी सुनहरी सुबह की हवा महसूस करें।',
      },
      misty_highlands: {
        shortName: 'हरित पहाड़ियां',
        placeName: 'धुंधली हरित पहाड़ियां',
        welcomeLine: 'सुबह की हल्की धुंध से ढकी हरी पहाड़ियों की गोद में विश्राम करें।',
      },
    },
  },

  gu: {
    brandName: 'AmeOrbs',
    brandSubtitle: '360° કુદરતી શાંતિ અભયારણ્ય',
    badgeHandsFirst: '100% હેન્ડ્સ-ફર્સ્ટ WebXR',
    landingTitle: 'અસલી શાંત પ્રકૃતિમાં ઊંડો શ્વાસ લો',
    landingDescription:
      'અસલી 360° કુદરતી દૃશ્યો, સુંદર પતંગિયા, સોનેરી પ્રકાશ, ધીમી ચાલ સાથેના ગ્લાઇડ અને તમારી પોતાની ભાષામાં પ્રેમાળ શાંત અવાજનો અનુભવ કરો.',
    tapPhoneToBegin: 'શાંતિનો અભ્યાસ શરૂ કરવા અહીં ટેપ કરો',
    mobileViewSubtitle: '360° પ્રકૃતિ · શાંત શ્વાસ',
    cardAuraTitle: 'ઓરા ગાઇડ અને માઇક',
    cardAuraBody:
      'કોઈપણ પર્વત, નદી, સમુદ્ર, જંગલ કે ફૂલોની ખીણનું નામ લખો અથવા બોલો.',
    cardPalmTitle: 'ડાબો હાથ ઉપર',
    cardPalmBody:
      'VR માં ડાબી હથેળી ઉપર ફેરવો (અથવા P દબાવો) અને જમણી આંગળીથી મેનૂ પસંદ કરો.',
    cardStretchTitle: 'ધીમો ગ્લાઇડ અને સ્ટ્રેચ',
    cardStretchBody:
      'ધીમે સરકતા કેમેરા સાથે ખભા હળવા કરો, સોનેરી પતંગિયાને નિહાળો અથવા ચમકતા ટીપાંને સ્પર્શો.',
    enterSanctuary: 'અભયારણ્યમાં પ્રવેશો',
    enterVR: 'VR શરૂ કરો (WebXR)',
    exitVR: 'VR બંધ કરો',
    gestures: 'સંકેતો',
    hideControls: 'નિયંત્રણો છુપાવો',
    showDock: 'મેનૂ બતાવો',
    auraGuidePrefix: 'ઓરા ગાઇડ:',
    placesLabel: 'પ્રકૃતિ:',
    chatPlaceholder: "કોઈપણ કુદરતી દૃશ્ય લખો (જેમ કે 'વહેતી પર્વતીય નદી', 'સમુદ્ર સૂર્યોદય', 'ફૂલોનું મેદાન')...",
    voiceBtn: 'અવાજ',
    listeningBtn: 'સાંભળી રહ્યું છે',
    travelBtn: 'જાઓ',
    generatingBtn: 'ખૂલી રહ્યું છે',
    voiceGuideOn: 'વોઇસ ગાઇડ: ચાલુ',
    voiceGuideOff: 'વોઇસ ગાઇડ: બંધ',
    autoGlideOn: 'ધીમો ગ્લાઇડ: ચાલુ',
    autoGlideOff: 'ધીમો ગ્લાઇડ: બંધ',
    wristBtn: 'રિસ્ટ (P)',
    resetBtn: 'રીસેટ',
    loading360: '360° દૃશ્ય લોડ થઈ રહ્યું છે...',
    cyclesLabel: 'ચક્ર',
    freedLabel: 'મુક્ત',
    dewdropBanner: 'ઝાકળ મુક્તિ · પતંગિયા મુક્ત',
    focusStages: {
      morning: 'સોનેરી પ્રકાશ',
      golden: 'મધુર સાંજ',
      twilight: 'શાંત સંધ્યા',
      paused: 'થોભેલું',
      complete: '5 મિનિટનું ધ્યાન પૂર્ણ',
      pinchPause: 'રોકવા માટે ક્રિસ્ટલ પિંચ કરો',
      pinchResume: 'ચાલુ કરવા ક્રિસ્ટલ પિંચ કરો',
    },
    exercises: {
      butterfly_wing_stretch: {
        title: 'પતંગિયા પાંખ સ્ટ્રેચ',
        shortTitle: 'પાંખ સ્ટ્રેચ',
        subtitle: 'શ્વાસ અંદર લેતા બંને હાથ ધીમેથી ફેલાવો અને શ્વાસ છોડતા આરામ કરો',
        introVoice:
          'ચાલો પતંગિયા પાંખ સ્ટ્રેચ શરૂ કરીએ... ખભા હળવા રાખો અને પ્રેમથી ઊંડો શ્વાસ અંદર લો.',
        steps: {
          inhale: 'ધીમેથી ઊંડો શ્વાસ અંદર લો... પતંગિયાની પાંખોની જેમ બંને હાથ પ્રેમથી ફેલાવો.',
          hold: 'એક ક્ષણ શાંતિથી રોકાઓ... હૃદયમાં હળવો વિસામો અનુભવો.',
          exhale: 'હવે કોમળતાથી શ્વાસ બહાર છોડો... હાથ અને ખભાને સંપૂર્ણ હળવા કરી દો.',
        },
      },
      horizon_neck_gaze: {
        title: 'ક્ષિતિજ ગરદન દૃષ્ટિ',
        shortTitle: 'ગરદન દૃષ્ટિ',
        subtitle: 'ક્ષિતિજ પર ઉડતા સોનેરી પતંગિયાને શાંતિથી નજરથી અનુસરો',
        introVoice:
          'ખભાને ઢીલા છોડો... દૂર ક્ષિતિજ પર શાંતિથી ઉડતા સોનેરી પતંગિયાને પ્રેમથી જુઓ.',
        steps: {
          inhale: 'ધીમો મધુર શ્વાસ લો... સોનેરી પતંગિયાની સાથે તમારી નજર હળવેથી ફેરવો.',
          hold: 'શાંતિથી એક પળ રોકાઓ... દૂરના કુદરતી દૃશ્ય પર આરામથી નજર ટકાવો.',
          exhale: 'ધીમેથી શ્વાસ છોડો... ગરદન અને ખભાનો બધો ભાર પ્રેમથી દૂર થવા દો.',
        },
      },
      lotus_sky_reach: {
        title: 'કમળ આકાશ સ્પર્શ',
        shortTitle: 'આકાશ સ્પર્શ',
        subtitle: 'ઊંડો શ્વાસ લો અને તમારા બંને હાથ ધીમેથી ઉપર ઉઠાવો',
        introVoice:
          'ઊંડો શ્વાસ લો અને તમારા બંને હાથ ધીમેથી ઉપર ઉઠાવો... શાંતિથી પ્રકાશને અનુભવો.',
        steps: {
          inhale: 'ઊંડો શ્વાસ લો અને તમારા બંને હાથ ધીમેથી ઉપર ઉઠાવો...',
          hold: 'ઉપર એક મધુર ક્ષણ સ્થિર રહો... સોનેરી શાંતિને અનુભવો.',
          exhale: 'હળવેથી શ્વાસ બહાર છોડો... અને હાથ કોમળતાથી નીચે લાવો.',
        },
      },
      dewdrop_release: {
        title: 'ઝાકળ ટીપાં મુક્તિ',
        shortTitle: 'ઝાકળ ટીપાં',
        subtitle: 'તણાવ મુક્ત કરવા તરતા સોનેરી ટીપાંને પિંચ કરો અથવા સ્પર્શો',
        introVoice:
          'સામે તરતા દરેક ચમકતા ટીપાંને હળવેથી સ્પર્શો... અને દરેક શ્વાસ સાથે મનને શાંત કરો.',
        periodicCues: [
          'નજીક તરતા સોનેરી ટીપાંને પ્રેમથી સ્પર્શો... અને ઊંડો શ્વાસ બહાર છોડો.',
          'દરેક મુક્ત થતા પતંગિયા સાથે... તમારા ખભા વધુ હળવા થતા અનુભવો.',
          'ધીમો શ્વાસ અંદર લો... અને શાંતિથી બહાર છોડો.',
        ],
      },
      scenic_focus_5m: {
        title: '5 મિનિટ શાંત ધ્યાન',
        shortTitle: '5 મિનિટ ધ્યાન',
        subtitle: 'પાંચ મિનિટ સુધી કોઈ પણ પ્રયત્ન વિના દૃશ્ય અને સંધ્યાની શાંતિ માણો',
        introVoice:
          'આરામથી બેસી જાઓ... આવતી પાંચ મિનિટ માત્ર આ શાંત પ્રકૃતિ અને તમારા શ્વાસને નિહાળો.',
        periodicCues: [
          'કોઈ ઉતાવળ નથી... તમારા શ્વાસને કુદરતી રીતે વહેવા દો.',
          'તમારા શરીરને સંપૂર્ણ સ્થિર... અને હળવું અનુભવો.',
          'ધીમે ધીમે છવાતી સંધ્યાની મધુર શાંતિમાં... પ્રેમથી વિશ્રામ કરો.',
        ],
      },
    },
    presets: {
      moss_woods: {
        shortName: 'શેવાળ વન',
        placeName: 'લીલાછમ શેવાળ વન',
        welcomeLine: 'કોમળ લીલા પ્રકાશથી ભરેલા શાંત શેવાળ અને વૃક્ષોના વનમાં ઊંડો શ્વાસ લો.',
      },
      river_valley: {
        shortName: 'નદી ખીણ',
        placeName: 'વહેતી નદીની ખીણ',
        welcomeLine: 'વહેતી નદી અને લીલીછમ ખીણની તાજી હવામાં હળવો શ્વાસ લો.',
      },
      flower_meadow: {
        shortName: 'ફૂલ મેદાન',
        placeName: 'સૂર્યપ્રકાશિત ફૂલોનું મેદાન',
        welcomeLine: 'ખીલેલા ફૂલો અને મધુર પવનથી ભરેલા શાંત મેદાનમાં વિશ્રામ કરો.',
      },
      rainforest_canopy: {
        shortName: 'વર્ષાવન',
        placeName: 'લીલાછમ વર્ષાવન વૃક્ષો',
        welcomeLine: 'ઘેઘૂર વૃક્ષોના પાંદડા વચ્ચે છવાયેલી તાજી શાંતિમાં શ્વાસ લો.',
      },
      sunset_lagoon: {
        shortName: 'સૂર્યાસ્ત સરોવર',
        placeName: 'સોનેરી સૂર્યાસ્ત સરોવર',
        welcomeLine: 'શાંત પાણી પર ચમકતા સોનેરી સૂર્યાસ્તની મધુર શાંતિ માણો.',
      },
      pine_mist: {
        shortName: 'દેવદાર વન',
        placeName: 'ધુમ્મસભર્યું દેવદાર વન',
        welcomeLine: 'ચાંદી જેવા ધુમ્મસમાં ઢંકાયેલા ઊંચા દેવદાર વૃક્ષોની વચ્ચે વિશ્રામ કરો.',
      },
      dawn_lake: {
        shortName: 'પરોઢ સરોવર',
        placeName: 'પરોઢનું શાંત સરોવર',
        welcomeLine: 'શાંત સરોવર પર ફેલાયેલા પરોઢના ગુલાબી-સોનેરી પ્રકાશનો અનુભવ કરો.',
      },
      alpine_meadow: {
        shortName: 'પર્વત ખીણ',
        placeName: 'પર્વતીય ફૂલોની ખીણ',
        welcomeLine: 'ખુલ્લા પર્વતીય ફૂલોના મેદાન અને શુદ્ધ ઠંડી હવામાં ઊંડો શ્વાસ લો.',
      },
      coastal_cliffs: {
        shortName: 'સમુદ્ર કિનારો',
        placeName: 'સોનેરી સમુદ્ર કિનારો',
        welcomeLine: 'સમુદ્રની લહેરો પરથી આવતી તાજી સોનેરી સવારની લહેર માણો.',
      },
      misty_highlands: {
        shortName: 'લીલી ટેકરીઓ',
        placeName: 'ધુમ્મસભરી લીલી ટેકરીઓ',
        welcomeLine: 'સવારના કોમળ ધુમ્મસથી સજેલી લીલી ટેકરીઓમાં મનને શાંત કરો.',
      },
    },
  },

  es: {
    brandName: 'AmeOrbs',
    brandSubtitle: 'Santuario Natural Real en 360°',
    badgeHandsFirst: 'WebXR 100% Con Tus Manos',
    landingTitle: 'Respira en Paisajes Reales de Paz',
    landingDescription:
      'Sumérgete en naturaleza real en 360° con mariposas suaves, orbes dorados, paseo automático y una voz tranquila para tus ejercicios.',
    tapPhoneToBegin: 'Toca dentro para iniciar tu momento de calma',
    mobileViewSubtitle: 'Naturaleza 360° · Calma Guiada',
    cardAuraTitle: 'Guía Aura y Micrófono',
    cardAuraBody:
      'Describe una montaña, río, bosque o costa tranquila para abrir un paisaje real en 360°.',
    cardPalmTitle: 'Palma Izquierda Arriba',
    cardPalmBody:
      'Gira tu palma izquierda hacia tu rostro en VR (o pulsa P) para abrir el menú de muñeca.',
    cardStretchTitle: 'Deslizamiento y Estiramiento',
    cardStretchBody:
      'Relájate mientras la vista se desliza suavemente y sigues la mariposa dorada o tocas gotas de luz.',
    enterSanctuary: 'Entrar al Santuario',
    enterVR: 'Entrar en VR (WebXR)',
    exitVR: 'Salir de VR',
    gestures: 'Gestos',
    hideControls: 'Ocultar Controles',
    showDock: 'Mostrar Panel',
    auraGuidePrefix: 'Guía Aura:',
    placesLabel: 'Maravillas:',
    chatPlaceholder: "Explora un paisaje natural (ej. 'Río de montaña', 'Olas del amanecer', 'Pradera floral')...",
    voiceBtn: 'Voz',
    listeningBtn: 'Escuchando',
    travelBtn: 'Explorar',
    generatingBtn: 'Cargando',
    voiceGuideOn: 'Guía de Voz: SÍ',
    voiceGuideOff: 'Guía de Voz: NO',
    autoGlideOn: 'Paseo Suave: SÍ',
    autoGlideOff: 'Paseo Suave: NO',
    wristBtn: 'Muñeca (P)',
    resetBtn: 'Reiniciar',
    loading360: 'Cargando vista 360°...',
    cyclesLabel: 'Ciclos',
    freedLabel: 'libres',
    dewdropBanner: 'Liberación de Rocío · Mariposas Libres',
    focusStages: {
      morning: 'Luz Clara',
      golden: 'Hora Dorada',
      twilight: 'Crepúsculo Sereno',
      paused: 'En Pausa',
      complete: 'Enfoque de 5m Completo',
      pinchPause: 'Pellizca el Cristal para Pausar',
      pinchResume: 'Pellizca el Cristal para Seguir',
    },
    exercises: {
      butterfly_wing_stretch: {
        title: 'Estiramiento Alas de Mariposa',
        shortTitle: 'Alas',
        subtitle: 'Abre los brazos suavemente al inhalar y suelta los hombros al exhalar',
        introVoice:
          'Suaviza tus hombros... inhala con ternura y abre ambos brazos como alas tranquilas.',
        steps: {
          inhale: 'Inhala profundamente... abre ambos brazos como alas suaves de mariposa.',
          hold: 'Mantén en paz... siente cómo se expande tu pecho con suavidad.',
          exhale: 'Exhala despacio... deja caer suavemente tus manos y hombros.',
        },
      },
      horizon_neck_gaze: {
        title: 'Mirada al Horizonte',
        shortTitle: 'Cuello',
        subtitle: 'Sigue con suavidad a la mariposa dorada a través del horizonte',
        introVoice:
          'Relaja el cuello... y sigue con dulzura el vuelo de la mariposa dorada en el horizonte.',
        steps: {
          inhale: 'Inhala con calma... acompaña con tu mirada el vuelo de la mariposa dorada.',
          hold: 'Pausa un instante... descansa la vista en el horizonte tranquilo.',
          exhale: 'Exhala lento... suelta toda tensión en tu cuello y nuca.',
        },
      },
      lotus_sky_reach: {
        title: 'Alcance al Cielo',
        shortTitle: 'Alcance',
        subtitle: 'Inhala profundamente y eleva suavemente ambas manos hacia la luz',
        introVoice:
          'Inhala suave y profundo... y eleva con calma ambas manos hacia la luz dorada.',
        steps: {
          inhale: 'Inhala profundamente... y eleva suavemente ambas manos...',
          hold: 'Sostén en paz... siente la calidez dorada a tu alrededor.',
          exhale: 'Exhala suavemente... y deja bajar tus manos en calma.',
        },
      },
      dewdrop_release: {
        title: 'Liberación de Rocío',
        shortTitle: 'Rocío',
        subtitle: 'Toca o pellizca los orbes brillantes para liberar tensión y mariposas',
        introVoice:
          'Toca suavemente cada gota de luz... y deja que tu respiración libere el cansancio.',
        periodicCues: [
          'Observa un orbe cálido cerca de ti... tócalo suavemente y exhala.',
          'Con cada mariposa libre... deja que tus hombros descansen más abajo.',
          'Respira hondo con dulzura... y suelta en paz.',
        ],
      },
      scenic_focus_5m: {
        title: 'Enfoque Escénico 5m',
        shortTitle: 'Enfoque 5m',
        subtitle: 'Descansa cinco minutos sin esfuerzo mientras la luz pasa a crepúsculo',
        introVoice:
          'Acomódate en calma... contempla el paisaje real y respira sin ninguna prisa.',
        periodicCues: [
          'No hay prisa... deja que tu mirada descanse en la luz lejana.',
          'Siente el apoyo tranquilo bajo tu cuerpo... al exhalar despacio.',
          'Descansa en silencio suave... mientras cae el crepúsculo dorado.',
        ],
      },
    },
    presets: {
      moss_woods: {
        shortName: 'Bosque Musgo',
        placeName: 'Bosque de Musgo Esmeralda',
        welcomeLine: 'Adéntrate en un antiguo bosque de musgo iluminado por suave luz verde.',
      },
      river_valley: {
        shortName: 'Valle del Río',
        placeName: 'Valle del Río Sereno',
        welcomeLine: 'Respira el aire fresco junto al río sereno y las verdes laderas.',
      },
      flower_meadow: {
        shortName: 'Pradera Floral',
        placeName: 'Pradera de Flores Silvestres',
        welcomeLine: 'Descansa entre flores bañadas por el sol y una brisa tranquila.',
      },
      rainforest_canopy: {
        shortName: 'Selva Verde',
        placeName: 'Dosel de Selva Verde',
        welcomeLine: 'Respira profundo bajo las hojas soleadas del bosque tranquilo.',
      },
      sunset_lagoon: {
        shortName: 'Laguna Ocaso',
        placeName: 'Laguna del Ocaso Dorado',
        welcomeLine: 'Contempla las aguas serenas brillando con tonos dorados del atardecer.',
      },
      pine_mist: {
        shortName: 'Bosque Pinos',
        placeName: 'Bosque de Pinos y Niebla',
        welcomeLine: 'Respira aire puro de montaña entre altos pinos y niebla plateada.',
      },
      dawn_lake: {
        shortName: 'Lago del Alba',
        placeName: 'Lago del Alba Sereno',
        welcomeLine: 'Siente la luz rosada del amanecer sobre aguas tranquilas como un espejo.',
      },
      alpine_meadow: {
        shortName: 'Valle Montaña',
        placeName: 'Prado de Alta Montaña',
        welcomeLine: 'Respira el aire limpio de un valle florido bajo cielos abiertos.',
      },
      coastal_cliffs: {
        shortName: 'Mar Dorado',
        placeName: 'Acantilados del Mar Dorado',
        welcomeLine: 'Siente la cálida brisa marina acariciando colinas soleadas frente al mar.',
      },
      misty_highlands: {
        shortName: 'Colinas Niebla',
        placeName: 'Santuario de Colinas Verdes',
        welcomeLine: 'Descansa entre colinas esmeralda envueltas en suave niebla matinal.',
      },
    },
  },

  ja: {
    brandName: 'AmeOrbs',
    brandSubtitle: '360° 自然リラクゼーション空間',
    badgeHandsFirst: '100% ハンドトラッキング WebXR',
    landingTitle: '実在する豊かな自然の中で深呼吸を',
    landingDescription:
      '美しい360°の自然風景、舞う蝶、黄金の光のオーブ、穏やかな自動グライド、そして優しいエクササイズ音声ガイドで心を解きほぐしましょう。',
    tapPhoneToBegin: 'タップして穏やかな呼吸と風景をはじめましょう',
    mobileViewSubtitle: '360° 自然風景 · 優しい呼吸',
    cardAuraTitle: 'オーラガイド＆音声入力',
    cardAuraBody:
      '山・川・海・森など思い浮かぶ自然の風景を伝えると、360°の絶景へ案内します。',
    cardPalmTitle: '左手パームメニュー',
    cardPalmBody:
      'VR内で左手のひらを顔に向ける（または P キー）と、手首メニューが開きます。',
    cardStretchTitle: '自動グライド＆ストレッチ',
    cardStretchBody:
      'ゆったりと風景を巡りながら、腕を広げたり黄金の蝶を目で追って首や肩をほぐしましょう。',
    enterSanctuary: '空間に入る',
    enterVR: 'VRに入る (WebXR)',
    exitVR: 'VRを終了',
    gestures: '操作ガイド',
    hideControls: 'パネルを隠す',
    showDock: '操作パネルを表示',
    auraGuidePrefix: 'オーラガイド:',
    placesLabel: '自然絶景:',
    chatPlaceholder: '自然の風景を入力 (例: 「清流の山谷」「朝焼けの海」「花咲く草原」)...',
    voiceBtn: '音声',
    listeningBtn: '聴き取り中',
    travelBtn: '移動',
    generatingBtn: '読込中',
    voiceGuideOn: '音声ガイド: ON',
    voiceGuideOff: '音声ガイド: OFF',
    autoGlideOn: '自動グライド: ON',
    autoGlideOff: '自動グライド: OFF',
    wristBtn: 'リスト (P)',
    resetBtn: 'リセット',
    loading360: '360°風景を読み込み中...',
    cyclesLabel: '回数',
    freedLabel: '羽',
    dewdropBanner: '光のしずく · 羽ばたいた蝶',
    focusStages: {
      morning: '柔らかな光',
      golden: '黄金色の時間',
      twilight: '静かな夕暮れ',
      paused: '一時停止',
      complete: '5分間の瞑想が完了しました',
      pinchPause: 'クリスタルをつまんで停止',
      pinchResume: 'クリスタルをつまんで再開',
    },
    exercises: {
      butterfly_wing_stretch: {
        title: '蝶の羽ストレッチ',
        shortTitle: '羽ストレッチ',
        subtitle: '息を吸いながら両腕をゆっくり広げ、吐きながら肩の力を抜きます',
        introVoice:
          '肩の力をやさしく抜いて... ゆっくり息を吸いながら両腕を広げましょう。',
        steps: {
          inhale: '深くやさしく息を吸いながら... 蝶の羽のように両腕を広げましょう。',
          hold: 'そのまま穏やかに息を止めて... 胸の広がりを感じます。',
          exhale: 'ゆっくり息を吐きながら... 腕と肩をやさしく下ろしましょう。',
        },
      },
      horizon_neck_gaze: {
        title: 'ホライゾン首ストレッチ',
        shortTitle: '首ストレッチ',
        subtitle: '地平線をゆったりと横切る黄金の蝶を目で追います',
        introVoice:
          '肩をリラックスさせて... 穏やかに舞う黄金の蝶をやさしく目で追ってみましょう。',
        steps: {
          inhale: 'ゆっくり吸いながら... 黄金の蝶に合わせて視線を横へ移します。',
          hold: '遠くの景色に目を留めて... 首の力をふっと抜きましょう。',
          exhale: '静かに息を吐きながら... 首や肩のこわばりを手放します。',
        },
      },
      lotus_sky_reach: {
        title: 'ロータス・スカイリーチ',
        shortTitle: 'スカイリーチ',
        subtitle: '深く息を吸いながら、両手をゆっくりと光へ向かって上げます',
        introVoice:
          '深くやさしい息を吸いながら... 両手をゆっくりと光へ伸ばしましょう。',
        steps: {
          inhale: '深く息を吸いながら... 両手をゆっくりと上げていきましょう...',
          hold: '上で静かに一呼吸... 温かな光に包まれます。',
          exhale: 'やさしく息を吐きながら... 両手をゆっくり下ろしましょう。',
        },
      },
      dewdrop_release: {
        title: 'しずくの解放',
        shortTitle: 'しずく解放',
        subtitle: '浮かぶ光のしずくをつまんで、穏やかな蝶を空へ放ちます',
        introVoice:
          '目の前に浮かぶ光のしずくにそっと触れて... 心の緊張をやさしくほどきましょう。',
        periodicCues: [
          '近くの光のしずくにそっと触れて... ゆっくり息を吐きましょう。',
          '蝶が羽ばたくたびに... 肩の重みがすっと軽くなっていきます。',
          '深く吸って... 静かに息を吐き出しましょう。',
        ],
      },
      scenic_focus_5m: {
        title: '5分間風景瞑想',
        shortTitle: '5分瞑想',
        subtitle: '夕暮れへ移ろう風景を眺めながら、5分間ただ呼吸に身を委ねます',
        introVoice:
          '心地よく力を抜いて... 目の前の豊かな自然と穏やかな呼吸を味わいましょう。',
        periodicCues: [
          '急ぐ必要はありません... ただ美しい景色に心を委ねてください。',
          '息を吐くたびに... 体がやさしく支えられているのを感じましょう。',
          '夕暮れの柔らかな光の中で... 穏やかに呼吸を続けます。',
        ],
      },
    },
    presets: {
      moss_woods: {
        shortName: '苔の森',
        placeName: '苔むす深緑の森',
        welcomeLine: '柔らかな緑の光が差し込む、静かな苔と樹木の森へようこそ。',
      },
      river_valley: {
        shortName: '清流渓谷',
        placeName: '清流と緑の渓谷',
        welcomeLine: '澄んだ川と緑の崖に囲まれた爽やかな渓谷で、ゆったり深呼吸を。',
      },
      flower_meadow: {
        shortName: '野花草原',
        placeName: '陽光と野花の草原',
        welcomeLine: '暖かな太陽と野の花に満ちた穏やかな草原でくつろぎましょう。',
      },
      rainforest_canopy: {
        shortName: '緑の樹海',
        placeName: '木漏れ日の深い森',
        welcomeLine: '木々の葉がそよぐ木漏れ日の森で、深く心を休めましょう。',
      },
      sunset_lagoon: {
        shortName: '夕暮れ入江',
        placeName: '黄金色の夕暮れの入江',
        welcomeLine: '黄金色に輝く静かな水辺の夕暮れを眺めながら過ごしましょう。',
      },
      pine_mist: {
        shortName: '霧の松林',
        placeName: '朝霧の松林',
        welcomeLine: '銀色の霧がやさしく漂う背の高い松の森へようこそ。',
      },
      dawn_lake: {
        shortName: '朝焼け湖',
        placeName: '朝焼けの静かな湖',
        welcomeLine: '鏡のように静かな湖畔に広がる淡い朝焼けの光を感じましょう。',
      },
      alpine_meadow: {
        shortName: '山岳草原',
        placeName: '高山と花々の谷',
        welcomeLine: '澄み渡る山の空気と花咲く谷の中で、深く呼吸しましょう。',
      },
      coastal_cliffs: {
        shortName: '海辺の丘',
        placeName: '朝光きらめく海辺の丘',
        welcomeLine: '心地よい海風と朝の光がきらめく穏やかな海岸の景色をご堪能ください。',
      },
      misty_highlands: {
        shortName: '霧の丘陵',
        placeName: '朝霧の緑の丘',
        welcomeLine: '朝霧がやさしく漂う深い緑の丘で心を静かに休めましょう。',
      },
    },
  },
};
