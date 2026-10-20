import { CompanyProfile, CatalogItem } from '../types/quotation';
import { OFFICIAL_TISHA_STAMP } from './officialStamp';

export const DEFAULT_COMPANY: CompanyProfile = {
  name: 'Tisha led walls',
  tagline: 'Professional LED Video Walls & Stage Setup Solutions',
  logo: '',
  address: 'Plot No 183, near Parshuram Bhavan\nJharsa, Sector 39, Gurugram, Haryana 122001',
  phone: '+91 7703948857',
  phoneAlt: '+91 9716681122',
  email: 'tishaledwalls@gmail.com',
  website: 'https://tishaledwalls.pages.dev/',
  gstin: '',
  pan: '',
  bankDetails: {
    accountName: 'Ankush Saini',
    bankName: 'State Bank Of India',
    accountNumber: '42410969250',
    ifscCode: 'SBIN0061222',
    branch: 'Sector 46, Gurugram',
    upiId: '9716681122@sbi',
  },
  signature: OFFICIAL_TISHA_STAMP,
};

export const DEFAULT_TERMS_AND_CONDITIONS = `1. Confirmation: 70% advance payment required to block equipment and confirm booking date.
2. Balance Payment: 30% balance to be cleared one day prior to or upon setup at the event venue.
3. Power Supply: Stable three-phase power supply (or dedicated generator) to be provided by client/venue at the setup site.
4. Setup Clearance: Minimum 4 to 6 hours required prior to event start for trussing, screen mounting, cabling, and calibration.
5. Content & Media: All display content (videos/graphics) should be provided in 16:9 1080p/4K format well in advance.
6. Damages: Client is responsible for on-site physical security of equipment against crowd disturbance, water leakage, or intentional damage.
7. Taxes: GST @ 18% extra as applicable. TDS deduction should not exceed statutory 1% for proprietorship/service.`;

export const DEFAULT_PAYMENT_TERMS = '70% Advance on Confirmation | 30% Before Event Delivery / Setup';

export const CATALOG_PRESETS: CatalogItem[] = [
  {
    id: 'cat-p2-indoor',
    title: 'P2 Indoor Ultra HD LED Video Wall',
    category: 'Screen',
    description: 'P2 High Refresh Rate Indoor LED Video Wall (Cabinet size 500x500mm / Die-cast Aluminum) for Corporate, Conferences & Indoor Galas',
    defaultRate: 140,
    unit: 'Sq.Ft',
    hsnSac: '9973',
  },
  {
    id: 'cat-p3-indoor',
    title: 'P3 Indoor/Outdoor LED Video Wall',
    category: 'Screen',
    description: 'P3 High Brightness LED Display screen with vivid color gamut, seamless locking mechanism, ideal for Weddings, Concerts & Exhibitions',
    defaultRate: 110,
    unit: 'Sq.Ft',
    hsnSac: '9973',
  },
  {
    id: 'cat-p4-outdoor',
    title: 'P4 Outdoor Waterproof LED Wall',
    category: 'Screen',
    description: 'P4 Outdoor IP65 Weatherproof LED Display (576×576mm Die-Cast Aluminum Cabinets) with 5500+ nits daylight brightness for Day & Night Outdoor Events',
    defaultRate: 95,
    unit: 'Sq.Ft',
    hsnSac: '9973',
  },
  {
    id: 'cat-tv-55-standee',
    title: '55" 4K Commercial LED TV / Standee',
    category: 'Screen',
    description: '55-inch 4K UHD Commercial Smart LED TV mounted on heavy-duty vertical floor trolley stand / standee for corporate presentations, exhibition stalls, registration desks, and stage monitoring',
    defaultRate: 2500,
    unit: 'Unit / Day',
    hsnSac: '9973',
  },
  {
    id: 'cat-processor-4k',
    title: 'Novastar 4K Video Processor & Switcher',
    category: 'Processor',
    description: 'Novastar VX600 / VX1000 All-in-One Controller with seamless HDMI/SDI multi-input switching, PIP and screen scaling',
    defaultRate: 3500,
    unit: 'Per Day',
    hsnSac: '9973',
  },
  {
    id: 'cat-truss-structure',
    title: 'Heavy Duty Aluminum Truss Structure',
    category: 'Truss & Rigging',
    description: 'Aluminum Box Truss / Goal Post structure with heavy base plates & safety chain hoists for ground-supported or hanging LED screen',
    defaultRate: 4000,
    unit: 'Set',
    hsnSac: '9973',
  },
  {
    id: 'cat-technician',
    title: 'Dedicated LED Technician & Video Operator',
    category: 'Crew & Logistics',
    description: 'Skilled on-site LED technician for complete rigging, live calibration, video playback management, and breakdown',
    defaultRate: 2000,
    unit: 'Per Day',
    hsnSac: '9987',
  },
  {
    id: 'cat-transportation',
    title: 'Transportation, Loading & Unloading (NCR)',
    category: 'Crew & Logistics',
    description: 'Two-way commercial vehicle logistics, loading and unloading of LED flight cases across Delhi NCR venue',
    defaultRate: 3500,
    unit: 'Round Trip',
    hsnSac: '9965',
  },
  {
    id: 'cat-audio-setup',
    title: 'JBL / RCF Sound System Setup with Mics',
    category: 'Sound & Lights',
    description: 'Professional 2-top + 2-bass sound setup with cordless microphones and digital mixer for audio clarity',
    defaultRate: 6000,
    unit: 'Per Day',
    hsnSac: '9973',
  },
];
