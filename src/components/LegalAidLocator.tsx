import React, { useState } from 'react';
import { MapPin, Phone, Shield, ExternalLink, Search, Info, Clock, Globe } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

interface DLSACenter {
  state: string;
  state_hi: string;
  district: string;
  district_hi: string;
  name: string;
  name_hi: string;
  address: string;
  address_hi: string;
  helpline: string;
  email: string;
}

const SAMPLE_DLSA_CENTERS: DLSACenter[] = [
  {
    state: 'Karnataka',
    state_hi: 'कर्नाटक',
    district: 'Bengaluru Urban',
    district_hi: 'बेंगलुरु अर्बन',
    name: 'District Legal Services Authority (DLSA) Bengaluru Urban',
    name_hi: 'जिला कानूनी सेवा प्राधिकरण (DLSA) बेंगलुरु अर्बन',
    address: 'City Civil Court Complex, Opposite Kaveri Bhavan, K.G. Road, Bengaluru - 560001',
    address_hi: 'सिटी सिविल कोर्ट कॉम्प्लेक्स, कावेरी भवन के सामने, के.जी. रोड, बेंगलुरु - 560001',
    helpline: '080-22241600 / 15100',
    email: 'dlsa.bengaluru@karnataka.gov.in',
  },
  {
    state: 'Delhi',
    state_hi: 'दिल्ली',
    district: 'New Delhi',
    district_hi: 'नई दिल्ली',
    name: 'New Delhi District Legal Services Authority (NDDLSA)',
    name_hi: 'नई दिल्ली जिला कानूनी सेवा प्राधिकरण (NDDLSA)',
    address: 'Patiala House Courts Complex, New Delhi - 110001',
    address_hi: 'पटियाला हाउस कोर्ट परिसर, नई दिल्ली - 110001',
    helpline: '011-23073385 / 15100',
    email: 'nddlsa-phc@nic.in',
  },
  {
    state: 'Maharashtra',
    state_hi: 'महाराष्ट्र',
    district: 'Mumbai City',
    district_hi: 'मुंबई शहर',
    name: 'Mumbai District Legal Services Authority',
    name_hi: 'मुंबई जिला कानूनी सेवा प्राधिकरण',
    address: 'City Civil & Sessions Court, Fort, Mumbai - 400032',
    address_hi: 'सिटी सिविल एंड सेशंस कोर्ट, फोर्ट, मुंबई - 400032',
    helpline: '022-22624458 / 15100',
    email: 'mumbaidlsacourt@gmail.com',
  },
  {
    state: 'Haryana',
    state_hi: 'हरियाणा',
    district: 'Gurugram',
    district_hi: 'गुरुग्राम',
    name: 'District Legal Services Authority Gurugram',
    name_hi: 'जिला कानूनी सेवा प्राधिकरण गुरुग्राम',
    address: 'District Courts Complex, Near Rajiv Chowk, Gurugram - 122001',
    address_hi: 'जिला कोर्ट परिसर, राजीव चौक के पास, गुरुग्राम - 122001',
    helpline: '0124-2221220 / 15100',
    email: 'dlsa.gurugram@hry.gov.in',
  },
];

export const LegalAidLocator: React.FC = () => {
  const { language, t } = useLanguage();
  const isHi = language === 'hi';
  const [selectedState, setSelectedState] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isIllustrationLoaded, setIsIllustrationLoaded] = useState(false);
  const [isEmptyStateLoaded, setIsEmptyStateLoaded] = useState(false);

  const filteredCenters = SAMPLE_DLSA_CENTERS.filter((center) => {
    const matchesState = selectedState === 'All' || center.state === selectedState;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      center.district.toLowerCase().includes(q) ||
      center.name.toLowerCase().includes(q) ||
      center.address.toLowerCase().includes(q) ||
      center.district_hi.toLowerCase().includes(q) ||
      center.name_hi.toLowerCase().includes(q) ||
      center.address_hi.toLowerCase().includes(q);
    return matchesState && matchesQuery;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header & High-Contrast Helpline Hero Module */}
      <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
        {/* Split Header Row: Left Column Stack (58%) & Right Column Illustration (38%) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
          {/* Left Column Stack: Title → Description → Helpline Card → Supporting Pills */}
          <div className="w-full md:w-[58%] space-y-4 text-left">
            {/* Title & Description */}
            <div className="flex items-center space-x-3 border-b border-[#E7E1D3] pb-3">
              <div className="w-9 h-9 rounded-lg bg-[#F6F1E7] text-[#B85C38] flex items-center justify-center border border-[#E7E1D3] shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold font-heading text-[#1E1B17]">
                  {t('legal_aid.title')}
                </h2>
                <p className="text-xs text-[#6E6659] leading-relaxed">
                  {t('legal_aid.subtitle')}
                </p>
              </div>
            </div>

            {/* Visually Dominating Helpline Card (Scaled to Column Width) */}
            <div className="bg-[#17140F] p-4 sm:p-5 rounded-xl border border-[#17140F] text-[#FBF8F1] flex flex-wrap items-center justify-between gap-3.5 shadow-md">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-full bg-[#D1FAE5]/20 text-[#6EE7B7] flex items-center justify-center border border-[#6EE7B7]/40 shrink-0">
                  <Phone className="w-5.5 h-5.5 animate-pulse" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#6EE7B7] tracking-wider">{t('legal_aid.helpline_tag')}</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide">15100</div>
                  <p className="text-[11px] text-slate-300">{t('legal_aid.helpline_sub')}</p>
                </div>
              </div>

              <a
                href="tel:15100"
                className="px-4 py-2 bg-[#6EE7B7] hover:bg-[#A7F3D0] text-[#065F46] font-bold text-xs rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors shrink-0"
              >
                <Phone className="w-3.5 h-3.5 animate-pulse" />
                <span>{t('legal_aid.call_now')}</span>
              </a>
            </div>

            {/* Supporting Feature Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-[11px] font-medium text-[#1E1B17] bg-[#FBF8F1] px-2.5 py-1 rounded border border-[#E7E1D3] flex items-center space-x-1">
                <Shield className="w-3 h-3 text-[#B85C38]" />
                <span>{t('legal_aid.badge_rep')}</span>
              </span>
              <span className="text-[11px] font-medium text-[#1E1B17] bg-[#FBF8F1] px-2.5 py-1 rounded border border-[#E7E1D3] flex items-center space-x-1">
                <Clock className="w-3 h-3 text-[#065F46]" />
                <span>{t('legal_aid.badge_247')}</span>
              </span>
              <span className="text-[11px] font-medium text-[#1E1B17] bg-[#FBF8F1] px-2.5 py-1 rounded border border-[#E7E1D3] flex items-center space-x-1">
                <Globe className="w-3 h-3 text-[#B85C38]" />
                <span>{t('legal_aid.badge_coverage')}</span>
              </span>
            </div>
          </div>

          <div
            className="w-full md:w-[38%] justify-center items-center self-center hidden min-[380px]:flex relative min-h-[180px] sm:min-h-[220px] select-none pointer-events-none"
            onDragStart={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {!isIllustrationLoaded && (
              <div className="absolute inset-0 bg-[#F6F1E7] border border-[#E7E1D3] rounded-2xl animate-pulse flex items-center justify-center">
                <MapPin className="w-6 h-6 text-[#B85C38]/40 animate-pulse" />
              </div>
            )}
            <img
              src="/assets/legal-aid-illustration.png"
              alt="Illustration of a person being guided toward legal help"
              loading="eager"
              onLoad={() => setIsIllustrationLoaded(true)}
              draggable="false"
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              onDoubleClick={(e) => e.preventDefault()}
              className={`w-full h-auto max-w-xs sm:max-w-sm object-contain mx-auto select-none pointer-events-none transition-opacity duration-300 ${
                isIllustrationLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>
        </div>

        {/* Search & Filter Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6E6659] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('legal_aid.search_placeholder')}
              className="w-full bg-[#F6F1E7] border border-[#E7E1D3] rounded-lg pl-8 pr-3.5 py-2 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38]"
            />
          </div>

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-[#F6F1E7] border border-[#E7E1D3] rounded-lg px-3 py-2 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38]"
          >
            <option value="All">{t('legal_aid.all_states')}</option>
            <option value="Karnataka">{t('legal_aid.state_karnataka')}</option>
            <option value="Delhi">{t('legal_aid.state_delhi')}</option>
            <option value="Maharashtra">{t('legal_aid.state_maharashtra')}</option>
            <option value="Haryana">{t('legal_aid.state_haryana')}</option>
          </select>
        </div>
      </div>

      {/* DLSA Center Cards */}
      {filteredCenters.length === 0 ? (
        <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <div className="relative w-24 h-24 mx-auto">
            {!isEmptyStateLoaded && (
              <div className="absolute inset-0 bg-[#F6F1E7] border border-[#E7E1D3] rounded-xl animate-pulse" />
            )}
            <img
              src="/assets/empty-state-illustration.png"
              alt="Illustration of a magnifying glass examining a document"
              loading="eager"
              onLoad={() => setIsEmptyStateLoaded(true)}
              draggable="false"
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              onDoubleClick={(e) => e.preventDefault()}
              className={`w-24 h-24 object-contain mx-auto select-none pointer-events-none transition-opacity duration-300 ${
                isEmptyStateLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1E1B17]">{t('legal_aid.no_offices_title')}</h3>
            <p className="text-xs text-[#6E6659] mt-1 max-w-sm mx-auto">
              {t('legal_aid.no_offices_sub', { query: searchQuery })}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCenters.map((center, idx) => {
            const stateDisplay = isHi ? center.state_hi : center.state;
            const districtDisplay = isHi ? center.district_hi : center.district;
            const nameDisplay = isHi ? center.name_hi : center.name;
            const addressDisplay = isHi ? center.address_hi : center.address;

            return (
              <div
                key={idx}
                className="bg-[#FBF8F1] border border-[#E7E1D3] hover:border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between border-b border-[#E7E1D3] pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#B85C38] bg-[#B85C38]/10 px-2.5 py-0.5 rounded border border-[#B85C38]/20">
                    {stateDisplay} • {districtDisplay}
                  </span>
                  <Shield className="w-4 h-4 text-[#065F46]" />
                </div>

                <h3 className="text-xs font-bold text-[#1E1B17] leading-snug">{nameDisplay}</h3>

                <div className="text-xs text-[#6E6659] space-y-1 font-sans">
                  <p className="flex items-start space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#6E6659] shrink-0 mt-0.5" />
                    <span>{addressDisplay}</span>
                  </p>
                  <p className="flex items-center space-x-1.5 text-[#B85C38] font-medium">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('legal_aid.helpline_label')}: {center.helpline}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E7E1D3] flex items-center justify-between text-xs">
                  <span className="text-[#6E6659] text-[11px]">{t('legal_aid.free_rep_eligible')}</span>
                  <a
                    href="https://nalsa.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#B85C38] hover:text-[#9C4B2B] font-semibold flex items-center space-x-1 text-[11px]"
                  >
                    <span>{t('legal_aid.official_nalsa')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Statutory Eligibility Info Box */}
      <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-4 text-xs text-[#1E1B17] space-y-1.5">
        <div className="flex items-center space-x-2 text-[#B85C38] font-bold">
          <Info className="w-3.5 h-3.5" />
          <span>{t('legal_aid.eligibility_title')}</span>
        </div>
        <p className="leading-relaxed text-[#6E6659]">
          {t('legal_aid.eligibility_desc')}
        </p>
      </div>
    </div>
  );
};
