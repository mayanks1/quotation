export interface TermsPreset {
  id: string;
  title: string;
  category: 'events' | 'corporate' | 'wedding' | 'rental';
  description: string;
  terms: string;
}

export const TERMS_PRESETS: TermsPreset[] = [
  {
    id: 'standard_events',
    title: 'Standard Live Events & Concerts',
    category: 'events',
    description: 'Standard terms for public events, concerts, festivals, and stage setups.',
    terms: `1. Payment: 70% advance with work order confirmation; remaining 30% strictly prior to event setup handover.
2. Power Supply: Continuous, stable 3-phase power supply (with earthing and uninterrupted backup generator) to be provided by the client/venue.
3. Setup & Access: Venue access must be provided at least 6 hours prior to event start for seamless rigging, alignment, and signal calibration.
4. Content & Playback: High-resolution media content (16:9 ratio, MP4/MOV) must be provided to our technical console team at least 4 hours before the event.
5. Safety & Security: On-ground security and weather protection (roof/canopy covering for outdoor setups) are the sole responsibility of the organizer.
6. Cancellation: In case of event cancellation within 48 hours of scheduled setup, advance payment will be forfeited to cover logistical dispatch and crew staging costs.`
  },
  {
    id: 'corporate_conferences',
    title: 'Corporate Conferences & Exhibitions',
    category: 'corporate',
    description: 'Formal corporate setup terms including technical rehearsals and presentation management.',
    terms: `1. Payment Terms: 50% advance along with formal Purchase Order (PO); 50% balance upon successful setup completion and technical dry-run.
2. Technical Rehearsal: Complimentary technical run-through provided up to 2 hours prior to conference commencement.
3. AV Feeds & Connectivity: Standard HDMI / SDI switcher inputs provided at stage console. Special video matrixing or custom resolutions must be informed in advance.
4. Logistics & Approvals: Venue permissions, gate passes, freight elevator access, and municipal/fire NOCs to be arranged by the client.
5. Overtime / Delay: Additional operational hours beyond the contracted schedule will be billed at standard hourly crew and console rates.
6. Taxes: All rates quoted are subject to applicable GST (18%) with standard tax invoice.`
  },
  {
    id: 'wedding_private',
    title: 'Wedding & Social Celebrations',
    category: 'wedding',
    description: 'Designed for wedding receptions, sangeet stages, and private VIP social gatherings.',
    terms: `1. Booking & Advance: 50% advance booking amount required to block LED wall panels and technical crew; balance 50% strictly on event day before event starts.
2. Installation Window: Venue management must permit setup ingress at least 8 hours prior to banquet / guest arrival.
3. Power & Rigging: 63A 3-phase power connection and required trussing/stage platform to be provided by client/decorator.
4. Custom Visuals: Live camera feeds, wedding live graphics, and VJ visual loops will be operated as agreed in the quotation scope.
5. Liquid & Fire Safety: Fog machines, pyro sparks, or liquids must maintain a mandatory 8-foot safe clearance from LED wall modules.`
  },
  {
    id: 'dry_hire_rental',
    title: 'Dry Hire / Equipment Rental Only',
    category: 'rental',
    description: 'Terms when renting cabinets and processors without operators or full rigging service.',
    terms: `1. Payment & Deposit: 100% rental payment plus refundable security deposit required prior to dispatch/warehouse pickup.
2. Transit & Handover: Transit insurance and transportation are the responsibility of the hirer unless specifically quoted.
3. Equipment Inspection: Hirer must test and acknowledge working condition of all modules, receiving cards, and processors at the time of pickup.
4. Damage & Loss: Any physical pixel damage, water ingress, burnt ICs, or missing cabling will be billed at full replacement cost.
5. Late Return: Equipment returned past the agreed hire period will incur standard daily rental charges per 24-hour cycle.`
  }
];
