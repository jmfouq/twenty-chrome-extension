import { parsePhoneNumberWithError } from 'libphonenumber-js';

const DEFAULT_COUNTRY = 'FR';

export const toTwentyPhone = (input: string) => {
  if (input.trim() === '') {
    return { primaryPhoneNumber: '', primaryPhoneCallingCode: '', primaryPhoneCountryCode: '' };
  }

  try {
    const phone = parsePhoneNumberWithError(input, DEFAULT_COUNTRY);

    return {
      primaryPhoneNumber: phone.nationalNumber,
      primaryPhoneCallingCode: `+${phone.countryCallingCode}`,
      primaryPhoneCountryCode: phone.country ?? '',
    };
  } catch {
    throw new Error('Numéro invalide. Exemple : 06 12 34 56 78 ou +44 20 7946 0958.');
  }
};

export const formatTwentyPhone = (phone: {
  primaryPhoneNumber: string | null;
  primaryPhoneCallingCode: string | null;
}) => {
  if (!phone.primaryPhoneNumber) {
    return null;
  }

  const raw = `${phone.primaryPhoneCallingCode ?? ''} ${phone.primaryPhoneNumber}`.trim();

  try {
    return parsePhoneNumberWithError(raw, DEFAULT_COUNTRY).formatInternational();
  } catch {
    return raw;
  }
};
