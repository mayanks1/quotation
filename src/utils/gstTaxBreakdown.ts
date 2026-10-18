import { Quotation, getItemAmount } from '../types/quotation';

export interface HsnTaxRow {
  hsnSac: string;
  taxableAmount: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
  totalTax: number;
}

export interface GstTaxBreakdown {
  rows: HsnTaxRow[];
  totalTaxableAmount: number;
  totalCgstAmount: number;
  totalSgstAmount: number;
  totalIgstAmount: number;
  totalTaxAmount: number;
  isSplitTax: boolean;
  isIgst: boolean;
  hasTax: boolean;
}

export function computeGstTaxBreakdown(quotation: Quotation): GstTaxBreakdown {
  const isZeroTax = quotation.taxScheme === 'none';
  const effectiveTaxRate = isZeroTax ? 0 : (quotation.taxRate || 0);
  const isSplitTax = quotation.taxScheme === 'cgst_sgst' || (effectiveTaxRate > 0 && quotation.taxScheme !== 'igst');
  const isIgst = quotation.taxScheme === 'igst';

  const subtotal = quotation.lineItems.reduce((acc, item) => acc + getItemAmount(item), 0);
  const discount = Math.min(subtotal, quotation.discountAmount || 0);
  const discountRatio = subtotal > 0 ? (subtotal - discount) / subtotal : 1;

  // Group line items by HSN / SAC
  const hsnGroups: { [hsn: string]: number } = {};

  quotation.lineItems.forEach((item) => {
    const rawAmt = getItemAmount(item);
    const apportionedTaxable = rawAmt * discountRatio;
    const code = (item.hsnSac || '9973').trim();
    hsnGroups[code] = (hsnGroups[code] || 0) + apportionedTaxable;
  });

  const rows: HsnTaxRow[] = [];
  let totalTaxableAmount = 0;
  let totalCgstAmount = 0;
  let totalSgstAmount = 0;
  let totalIgstAmount = 0;
  let totalTaxAmount = 0;

  Object.entries(hsnGroups).forEach(([hsnSac, taxable]) => {
    const roundedTaxable = Math.round(taxable * 100) / 100;
    totalTaxableAmount += roundedTaxable;

    if (effectiveTaxRate === 0 || isZeroTax) {
      rows.push({
        hsnSac,
        taxableAmount: roundedTaxable,
        totalTax: 0,
      });
      return;
    }

    if (isSplitTax) {
      const halfRate = effectiveTaxRate / 2;
      const cgst = Math.round(((roundedTaxable * halfRate) / 100) * 100) / 100;
      const sgst = Math.round(((roundedTaxable * halfRate) / 100) * 100) / 100;
      const tax = cgst + sgst;

      totalCgstAmount += cgst;
      totalSgstAmount += sgst;
      totalTaxAmount += tax;

      rows.push({
        hsnSac,
        taxableAmount: roundedTaxable,
        cgstRate: halfRate,
        cgstAmount: cgst,
        sgstRate: halfRate,
        sgstAmount: sgst,
        totalTax: tax,
      });
    } else {
      const igst = Math.round(((roundedTaxable * effectiveTaxRate) / 100) * 100) / 100;
      totalIgstAmount += igst;
      totalTaxAmount += igst;

      rows.push({
        hsnSac,
        taxableAmount: roundedTaxable,
        igstRate: effectiveTaxRate,
        igstAmount: igst,
        totalTax: igst,
      });
    }
  });

  return {
    rows,
    totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
    totalCgstAmount: Math.round(totalCgstAmount * 100) / 100,
    totalSgstAmount: Math.round(totalSgstAmount * 100) / 100,
    totalIgstAmount: Math.round(totalIgstAmount * 100) / 100,
    totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
    isSplitTax,
    isIgst,
    hasTax: effectiveTaxRate > 0 && !isZeroTax,
  };
}
