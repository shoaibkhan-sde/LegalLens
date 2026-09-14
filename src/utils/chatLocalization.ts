import { ChatMessage } from '../types/schemas';

const CANONICAL_MESSAGES: Record<string, { en: string; hi: string }> = {
  welcome_default: {
    en: 'Hi! I am your Legal Assistant. Ask any legal question (e.g. deposit rules, notice periods in Bengaluru), or upload a contract to analyze!',
    hi: 'नमस्ते! मैं आपका कानूनी AI सहायक हूँ। कोई भी कानूनी प्रश्न पूछें, या विश्लेषण करने के लिए अनुबंध अपलोड करें!',
  },
  greeting_generic: {
    en: "Hello! 👋 How can I help you today? If you have a contract or legal question, just let me know and I'll walk you through it.",
    hi: 'नमस्ते! 👋 मैं आज आपकी क्या सहायता कर सकता हूँ? यदि आपके पास कोई अनुबंध या कानूनी प्रश्न है, तो मुझे बताएं और मैं विवरण में आपकी सहायता करूँगा।',
  },
  review_offer: {
    en: "If you have a specific contract you'd like to review or a particular clause you're unsure about, feel free to share it and I can walk you through the details!",
    hi: 'यदि आपके पास समीक्षा के लिए कोई विशिष्ट अनुबंध है या किसी विशेष खंड के बारे में अनिश्चित हैं, तो बेझिझक साझा करें और मैं आपको विवरण समझाऊँगा!',
  },
  capabilities_overview: {
    en: 'Here is what I can do for you:\n\n• **General AI Q&A**: Answer general questions using high-speed LLMs.\n• **Clause Simplification**: Translate complex legal jargon into plain, everyday language.\n• **Risk Tagging**: Flag hidden penalties or high-risk terms with visual traffic-light indicators.\n• **Contract Comparison**: Compare two lease or employment counter-offers side-by-side.\n• **Action Checklists**: Export key deadlines directly to your calendar.\n• **Legal Aid Locator**: Find toll-free NALSA (15100) legal aid offices near you.',
    hi: 'मैं आपकी इन तरीकों से मदद कर सकता हूँ:\n\n• **सामान्य AI प्रश्नोत्तर**: सरल भाषा में कानूनी प्रश्नों का उत्तर देना।\n• **खंड सरलीकरण**: कठिन कानूनी शब्दावली का सरल हिंदी में अनुवाद।\n• **जोखिम टैगिंग**: छिपे हुए दंड या उच्च जोखिम वाली शर्तों को लाल/पीले संकेतकों से दिखाना।\n• **अनुबंध तुलना**: दो अनुबंधों (जैसे किराया या नौकरी पत्र) की साथ-साथ तुलना करना।\n• **कानूनी सहायता खोजक**: अपने पास निकटतम मुफ्त NALSA (15100) कानूनी सहायता कार्यालय खोजना।',
  },
  bot_identity: {
    en: 'I am LegalLens AI, your GenAI Legal Partner! ⚖️ I help you understand legal agreements in simple everyday language, flag hidden financial risks, compare contracts side-by-side, and find free Legal Aid (NALSA 15100) support.',
    hi: 'मैं लीगललेंस (LegalLens) AI हूँ, आपका कानूनी AI सहायक! ⚖️ मैं आपको आसान हिंदी भाषा में कानूनी समझौतों को समझने, छिपे हुए वित्तीय जोखिमों को पहचानने, अनुबंधों की तुलना करने और मुफ्त कानूनी सहायता (NALSA 15100) खोजने में मदद करता हूँ।',
  },
  thanks_acknowledgement: {
    en: "You're very welcome! Feel free to ask any other questions whenever you need.",
    hi: 'आपका बहुत स्वागत है! जब भी आपको आवश्यकता हो, बेझिझक कोई भी प्रश्न पूछें।',
  },
  gk_qa_capability: {
    en: 'I can answer general questions as well as legal questions! Feel free to ask about contracts, deposit returns, notice periods, or general topics.',
    hi: 'मैं सामान्य और कानूनी दोनों तरह के प्रश्नों का उत्तर दे सकता हूँ! अनुबंध, जमा राशि वापसी, नोटिस अवधि आदि के बारे में बेझिझक पूछें।',
  },
  error_generic: {
    en: 'Sorry, I encountered an error processing your query. Please try again.',
    hi: 'क्षमा करें, आपके प्रश्न को संसाधित करने में त्रुटि हुई। कृपया पुनः प्रयास करें।',
  },
  safety_refusal: {
    en: 'LegalLens safety guardrail activated: We cannot assist with illegal intent, document forgery, tax evasion, or fraud. Under the Advocates Act and DPDP Act guidelines, our service strictly promotes legal compliance and awareness.',
    hi: 'LegalLens सुरक्षा फ़िल्टर सक्रिय: हम अवैध इरादों, दस्तावेज़ जालसाजी, कर चोरी या धोखाधड़ी में सहायता नहीं कर सकते। हमारी सेवा कड़ाई से कानूनी अनुपालन और जागरूकता को बढ़ावा देती है।',
  },
};

export function localizeChatMessageText(text: string, targetLang: 'en' | 'hi'): string {
  if (!text) return text;

  // 1. Exact match check
  for (const key of Object.keys(CANONICAL_MESSAGES)) {
    const item = CANONICAL_MESSAGES[key];
    if (text.trim() === item.en || text.trim() === item.hi) {
      return item[targetLang];
    }
  }

  // 2. Hybrid string cleaning
  if (targetLang === 'hi') {
    let result = text;
    if (result.includes("Hello! 👋 How can I help you today?") || result.includes("How can I help you today?")) {
      result = CANONICAL_MESSAGES.greeting_generic.hi;
    } else if (result.includes("If you have a specific contract you'd like to review")) {
      result = CANONICAL_MESSAGES.review_offer.hi;
    } else {
      result = result
        .replace(/^Hello!\s*👋\s*/i, 'नमस्ते! 👋 ')
        .replace(/^Hello!\s*/i, 'नमस्ते! ')
        .replace(/^Hi!\s*/i, 'नमस्ते! ');
    }
    return result;
  } else {
    let result = text;
    if (result.includes("नमस्ते! 👋 मैं आज आपकी क्या सहायता कर सकता हूँ?")) {
      result = CANONICAL_MESSAGES.greeting_generic.en;
    } else if (result.includes("यदि आपके पास समीक्षा के लिए कोई विशिष्ट अनुबंध है")) {
      result = CANONICAL_MESSAGES.review_offer.en;
    } else {
      result = result
        .replace(/^नमस्ते!\s*👋\s*/i, 'Hello! 👋 ')
        .replace(/^नमस्ते!\s*/i, 'Hello! ');
    }
    return result;
  }
}

export function localizeChatMessage(msg: ChatMessage, targetLang: 'en' | 'hi'): ChatMessage {
  if (msg.sender !== 'assistant') return msg;
  return {
    ...msg,
    text: localizeChatMessageText(msg.text, targetLang),
  };
}
