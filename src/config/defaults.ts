import { CompanyProfile } from '../types/quotation';
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
