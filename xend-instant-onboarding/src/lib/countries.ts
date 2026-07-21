export interface MobileMoneyProvider {
  id: string;
  name: string;
  logo?: string;
}

export interface BankTransferDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftCode?: string;
  bankCode?: string;
  branchCode?: string;
  branchName?: string;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  exchangeRate: number; // 1 USD = X local currency
  mobileMoneyProviders: MobileMoneyProvider[];
  bankTransferDetails?: BankTransferDetails;
  sendMethods?: ("bank" | "mobile_money" | "cash_pickup")[];
}

export const SUPPORTED_COUNTRIES: Country[] = [
  {
    code: "KE",
    name: "Kenya",
    flag: "🇰🇪",
    currency: "KES",
    currencySymbol: "Ksh",
    exchangeRate: 134.0,
    mobileMoneyProviders: [
      { id: "mpesa", name: "M-Pesa" },
      { id: "airtel", name: "Airtel Money" },
      { id: "sasapay", name: "SasaPay" },
      { id: "tkash", name: "T-Kash" },
    ],
    bankTransferDetails: {
      bankName: "Equity Bank (Kenya) Limited",
      accountName: "Wayapay Limited",
      accountNumber: "1400279189104",
      swiftCode: "EQBLKENA",
      bankCode: "068",
      branchCode: "140",
      branchName: "Westlands Supreme Center",
    },
    sendMethods: ["bank", "mobile_money", "cash_pickup"],
  },
  {
    code: "TZ",
    name: "Tanzania",
    flag: "🇹🇿",
    currency: "TZS",
    currencySymbol: "TSh",
    exchangeRate: 2650.0,
    mobileMoneyProviders: [
      { id: "mpesa_tz", name: "M-Pesa" },
      { id: "tigopesa", name: "Tigo Pesa" },
      { id: "airtel_tz", name: "Airtel Money" },
      { id: "halopesa", name: "HaloPesa" },
    ],
    sendMethods: ["bank", "mobile_money"],
  },
  {
    code: "UG",
    name: "Uganda",
    flag: "🇺🇬",
    currency: "UGX",
    currencySymbol: "USh",
    exchangeRate: 3750.0,
    mobileMoneyProviders: [
      { id: "mtn_ug", name: "MTN Mobile Money" },
      { id: "airtel_ug", name: "Airtel Money" },
    ],
    sendMethods: ["bank", "mobile_money"],
  },
  {
    code: "NG",
    name: "Nigeria",
    flag: "🇳🇬",
    currency: "NGN",
    currencySymbol: "₦",
    exchangeRate: 1580.0,
    mobileMoneyProviders: [
      { id: "opay", name: "OPay" },
      { id: "palmpay", name: "PalmPay" },
      { id: "moniepoint", name: "Moniepoint" },
    ],
    sendMethods: ["bank", "mobile_money"],
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    currency: "INR",
    currencySymbol: "₹",
    exchangeRate: 83.5,
    mobileMoneyProviders: [
      { id: "paytm", name: "Paytm" },
      { id: "phonepe", name: "PhonePe" },
      { id: "gpay_in", name: "Google Pay" },
    ],
    sendMethods: ["bank", "mobile_money"],
  },
  {
    code: "PH",
    name: "Philippines",
    flag: "🇵🇭",
    currency: "PHP",
    currencySymbol: "₱",
    exchangeRate: 56.5,
    mobileMoneyProviders: [
      { id: "gcash", name: "GCash" },
      { id: "maya", name: "Maya" },
    ],
    sendMethods: ["bank", "mobile_money", "cash_pickup"],
  },
  {
    code: "GH",
    name: "Ghana",
    flag: "🇬🇭",
    currency: "GHS",
    currencySymbol: "GH₵",
    exchangeRate: 15.5,
    mobileMoneyProviders: [
      { id: "mtn_gh", name: "MTN Mobile Money" },
      { id: "vodacash", name: "Vodafone Cash" },
      { id: "airteltigo", name: "AirtelTigo Money" },
    ],
    sendMethods: ["bank", "mobile_money"],
  },
  {
    code: "ZA",
    name: "South Africa",
    flag: "🇿🇦",
    currency: "ZAR",
    currencySymbol: "R",
    exchangeRate: 18.2,
    mobileMoneyProviders: [
      { id: "capitec", name: "Capitec Pay" },
      { id: "snapscan", name: "SnapScan" },
    ],
    sendMethods: ["bank"],
  },
];

export const WITHDRAW_BANKS: Record<string, string[]> = {
  KE: ["Equity Bank", "KCB Bank", "Co-operative Bank", "ABSA Bank", "Stanbic Bank", "NCBA Bank", "I&M Bank", "DTB Bank", "Family Bank"],
  TZ: ["CRDB Bank", "NMB Bank", "NBC Bank", "Stanbic Bank TZ"],
  UG: ["Stanbic Bank Uganda", "DFCU Bank", "Centenary Bank", "Bank of Africa"],
  NG: ["GTBank", "First Bank", "UBA", "Access Bank", "Zenith Bank", "Kuda Bank", "Wema Bank"],
  IN: ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra"],
  PH: ["BDO", "BPI", "Metrobank", "UnionBank", "RCBC"],
  GH: ["GCB Bank", "Ecobank Ghana", "Fidelity Bank Ghana", "CalBank"],
  ZA: ["FNB", "Standard Bank", "Nedbank", "Capitec Bank", "ABSA South Africa"],
};

export function getCountryByCode(code: string): Country | undefined {
  return SUPPORTED_COUNTRIES.find((c) => c.code === code);
}
