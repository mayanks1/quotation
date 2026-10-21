const GAS_URL = "https://script.google.com/macros/s/AKfycbzbFiup_qy6QPd2ys9Ab90x_1sPa9lfYUidLSZPbBeyT8iAcUoHoQe5XeoEl9sOkSkEOA/exec?t=" + Date.now();

async function checkGAS() {
  console.log('Fetching directly from Google Apps Script...');
  try {
    const res = await fetch(GAS_URL);
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('GAS Success:', json?.success, 'Data length:', json?.data?.length);

    if (json?.data) {
      console.log('GAS Total rows:', json.data.length);
      // Let's inspect the first 5 and last 5 rows
      console.log('First 3 rows:', json.data.slice(0, 3));
      console.log('Last 5 rows:', json.data.slice(-5));
    }
  } catch (err) {
    console.error('GAS fetch error:', err.message);
  }
}

checkGAS();
