// Converts an Indian Rupee amount to words in Indian Numbering System (Lakhs, Crores)

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';
  if (num < 20) return ONES[num];
  if (num < 100) {
    const unit = num % 10;
    return TENS[Math.floor(num / 10)] + (unit ? ' ' + ONES[unit] : '');
  }
  const rem = num % 100;
  return ONES[Math.floor(num / 100)] + ' Hundred' + (rem ? ' ' + convertLessThanThousand(rem) : '');
}

/**
 * Converts a numeric amount to Indian Currency in Words.
 * e.g. 10073 -> "Rupees Ten Thousand Seventy-Three Only"
 * e.g. 10500.50 -> "Rupees Ten Thousand Five Hundred and Fifty Paise Only"
 */
export function amountToWordsIndian(amount: number): string {
  if (amount === 0 || isNaN(amount)) return 'Rupees Zero Only';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let rupeesWords = '';

  if (rupees === 0) {
    rupeesWords = 'Zero';
  } else {
    const crore = Math.floor(rupees / 10000000);
    const lakh = Math.floor((rupees % 10000000) / 100000);
    const thousand = Math.floor((rupees % 100000) / 1000);
    const remaining = rupees % 1000;

    const parts: string[] = [];

    if (crore > 0) {
      parts.push(convertLessThanThousand(crore) + ' Crore');
    }
    if (lakh > 0) {
      parts.push(convertLessThanThousand(lakh) + ' Lakh');
    }
    if (thousand > 0) {
      parts.push(convertLessThanThousand(thousand) + ' Thousand');
    }
    if (remaining > 0) {
      parts.push(convertLessThanThousand(remaining));
    }

    rupeesWords = parts.join(' ');
  }

  let result = (isNegative ? 'Minus ' : '') + 'Rupees ' + rupeesWords;

  if (paise > 0) {
    result += ' and ' + convertLessThanThousand(paise) + ' Paise';
  }

  result += ' Only';

  return result.replace(/\s+/g, ' ').trim();
}
