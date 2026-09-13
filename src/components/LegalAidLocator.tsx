import React, { useState } from 'react';
import { MapPin, Phone, Shield, ExternalLink, Search, Info, Clock, Globe } from 'lucide-react';

interface DLSACenter {
  state: string;
  district: string;
  name: string;
  address: string;
  helpline: string;
  email: string;
}

const SAMPLE_DLSA_CENTERS: DLSACenter[] = [
  {
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    name: 'District Legal Services Authority (DLSA) Bengaluru Urban',
    address: 'City Civil Court Complex, Opposite Kaveri Bhavan, K.G. Road, Bengaluru - 560001',
    helpline: '080-22241600 / 15100',
    email: 'dlsa.bengaluru@karnataka.gov.in',
  },
  {
    state: 'Delhi',
    district: 'New Delhi',
    name: 'New Delhi District Legal Services Authority (NDDLSA)',
    address: 'Patiala House Courts Complex, New Delhi - 110001',
    helpline: '011-23073385 / 15100',
    email: 'nddlsa-phc@nic.in',
  },
  {
    state: 'Maharashtra',
    district: 'Mumbai City',
    name: 'Mumbai District Legal Services Authority',
    address: 'City Civil & Sessions Court, Fort, Mumbai - 400032',
    helpline: '022-22624458 / 15100',
    email: 'mumbaidlsacourt@gmail.com',
  },
  {
    state: 'Haryana',
    district: 'Gurugram',
    name: 'District Legal Services Authority Gurugram',
    address: 'District Courts Complex, Near Rajiv Chowk, Gurugram - 122001',
    helpline: '0124-2221220 / 15100',
    email: 'dlsa.gurugram@hry.gov.in',
  },
];

export const LegalAidLocator: React.FC = () => {
  const [selectedState, setSelectedState] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredCenters = SAMPLE_DLSA_CENTERS.filter((center) => {
    const matchesState = selectedState === 'All' || center.state === selectedState;
    const matchesQuery =
      center.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.name.toLowerCase().includes(searchQuery.toLowerCase());
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
                  Free Legal Aid Services (NALSA / DLSA)
                </h2>
                <p className="text-xs text-[#6E6659] leading-relaxed">
                  Connect with licensed Advocates & Legal Aid Authorities across India under Section 12 of the Legal Services Authorities Act, 1987.
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
                  <div className="text-[10px] font-bold uppercase text-[#6EE7B7] tracking-wider">NALSA National Toll-Free Helpline</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wide">15100</div>
                  <p className="text-[11px] text-slate-300">Toll-free 24/7 legal assistance provided by National Legal Services Authority</p>
                </div>
              </div>

              <a
                href="tel:15100"
                className="px-4 py-2 bg-[#6EE7B7] hover:bg-[#A7F3D0] text-[#065F46] font-bold text-xs rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors shrink-0"
              >
                <Phone className="w-3.5 h-3.5 animate-pulse" />
                <span>Call 15100 Now</span>
              </a>
            </div>

            {/* Supporting Feature Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-[11px] font-medium text-[#1E1B17] bg-[#FBF8F1] px-2.5 py-1 rounded border border-[#E7E1D3] flex items-center space-x-1">
                <Shield className="w-3 h-3 text-[#B85C38]" />
                <span>Free Representation</span>
              </span>
              <span className="text-[11px] font-medium text-[#1E1B17] bg-[#FBF8F1] px-2.5 py-1 rounded border border-[#E7E1D3] flex items-center space-x-1">
                <Clock className="w-3 h-3 text-[#065F46]" />
                <span>24/7 Availability</span>
              </span>
              <span className="text-[11px] font-medium text-[#1E1B17] bg-[#FBF8F1] px-2.5 py-1 rounded border border-[#E7E1D3] flex items-center space-x-1">
                <Globe className="w-3 h-3 text-[#B85C38]" />
                <span>All India Coverage</span>
              </span>
            </div>
          </div>

          {/* Right Column: Illustration (Vertically centered against Left Column Stack on Desktop) */}
          <div className="w-full md:w-[38%] justify-center items-center self-center hidden min-[380px]:flex">
            <img
              src="/assets/legal-aid-illustration.png"
              alt="Illustration of a person being guided toward legal help"
              loading="lazy"
              className="w-full h-auto max-w-xs sm:max-w-sm object-contain mx-auto"
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
              placeholder="Search district or court office..."
              className="w-full bg-[#F6F1E7] border border-[#E7E1D3] rounded-lg pl-8 pr-3.5 py-2 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38]"
            />
          </div>

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-[#F6F1E7] border border-[#E7E1D3] rounded-lg px-3 py-2 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38]"
          >
            <option value="All">All States (Karnataka, Delhi, Maharashtra, Haryana)</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Delhi">Delhi</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Haryana">Haryana</option>
          </select>
        </div>
      </div>

      {/* DLSA Center Cards */}
      {filteredCenters.length === 0 ? (
        <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <img
            src="/assets/empty-state-illustration.png"
            alt="Illustration of a magnifying glass examining a document"
            loading="lazy"
            className="w-24 h-24 object-contain mx-auto"
          />
          <div>
            <h3 className="text-xs font-bold text-[#1E1B17]">No Legal Aid Offices Found</h3>
            <p className="text-xs text-[#6E6659] mt-1 max-w-sm mx-auto">
              No legal aid office found for "{searchQuery}". Try searching for a different district name or select "All States".
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCenters.map((center, idx) => (
          <div
            key={idx}
            className="bg-[#FBF8F1] border border-[#E7E1D3] hover:border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between border-b border-[#E7E1D3] pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B85C38] bg-[#B85C38]/10 px-2.5 py-0.5 rounded border border-[#B85C38]/20">
                {center.state} • {center.district}
              </span>
              <Shield className="w-4 h-4 text-[#065F46]" />
            </div>

            <h3 className="text-xs font-bold text-[#1E1B17] leading-snug">{center.name}</h3>

            <div className="text-xs text-[#6E6659] space-y-1 font-sans">
              <p className="flex items-start space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#6E6659] shrink-0 mt-0.5" />
                <span>{center.address}</span>
              </p>
              <p className="flex items-center space-x-1.5 text-[#B85C38] font-medium">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>Helpline: {center.helpline}</span>
              </p>
            </div>

            <div className="pt-2 border-t border-[#E7E1D3] flex items-center justify-between text-xs">
              <span className="text-[#6E6659] text-[11px]">Free representation for eligible citizens</span>
              <a
                href="https://nalsa.gov.in"
                target="_blank"
                rel="noreferrer"
                className="text-[#B85C38] hover:text-[#9C4B2B] font-semibold flex items-center space-x-1 text-[11px]"
              >
                <span>Official NALSA</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Statutory Eligibility Info Box */}
      <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-4 text-xs text-[#1E1B17] space-y-1.5">
        <div className="flex items-center space-x-2 text-[#B85C38] font-bold">
          <Info className="w-3.5 h-3.5" />
          <span>Who is Eligible for Free Legal Services? (Section 12, Legal Services Authorities Act, 1987)</span>
        </div>
        <p className="leading-relaxed text-[#6E6659]">
          Free legal representation, advocacy, and court fee assistance are granted to Women, Children, Members of SC/ST, Industrial Workmen, Persons with Disabilities, Victims of Disasters/Violence, and individuals with annual income below prescribed state limits.
        </p>
      </div>
    </div>
  );
};
