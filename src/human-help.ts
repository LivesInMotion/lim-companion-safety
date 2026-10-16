// Human help first (16 Oct 2026, Founder + user feedback: many people do not want an AI to counsel them).
// Every companion offers "Talk to a real person": local, free, human services for the visitor's country.
// Numbers are checked against official or long-standing sources before they are added (see LESSONS: verified
// phone numbers only). Where a national line is unreliable (Ghana's toll-free MHA line was reported out of service),
// we show emergency + local care instead of a number that may not answer.

export type HelpLine = { name: string; how: string; tel?: string; sms?: string; url?: string; note?: string };
export type CountryHelp = { country: string; emergency: string; lines: HelpLine[] };

const HELP: Record<string, CountryHelp> = {
  GB: { country: "United Kingdom", emergency: "999", lines: [
    { name: "Samaritans", how: "Call free, any time, day or night", tel: "116123", note: "116 123" },
    { name: "Shout", how: "Text if you'd rather not talk", sms: "85258", note: "Text SHOUT to 85258" },
    { name: "NHS 111", how: "Urgent mental health help (choose the mental health option)", tel: "111", note: "111" },
  ] },
  IE: { country: "Ireland", emergency: "112 or 999", lines: [
    { name: "Samaritans", how: "Call free, any time", tel: "116123", note: "116 123" },
  ] },
  NG: { country: "Nigeria", emergency: "112 (Lagos: 767)", lines: [
    { name: "Mentally Aware Nigeria Initiative (MANI)", how: "Talk to someone about how you feel", tel: "+2348091116264", note: "0809 111 6264" },
    { name: "Lagos Domestic & Sexual Violence Agency", how: "Free 24-hour line if someone is hurting you", tel: "08000333333", note: "0800 0333 333" },
    { name: "Cece Yara child helpline", how: "For children and worried parents", tel: "08008008001", note: "0800 800 8001" },
  ] },
  KE: { country: "Kenya", emergency: "999 or 112", lines: [
    { name: "Kenya Red Cross counselling", how: "Free, 24 hours", tel: "1199", note: "1199" },
    { name: "Befrienders Kenya", how: "Free and confidential (phone, SMS or WhatsApp)", tel: "+254722178177", note: "+254 722 178 177" },
  ] },
  ZA: { country: "South Africa", emergency: "10111 or 112", lines: [
    { name: "SADAG Suicide Crisis Helpline", how: "Free, 24 hours", tel: "0800567567", note: "0800 567 567" },
    { name: "Lifeline South Africa", how: "Counselling line", tel: "0861322322", note: "0861 322 322" },
  ] },
  GH: { country: "Ghana", emergency: "112", lines: [] },
  US: { country: "United States", emergency: "911", lines: [
    { name: "988 Suicide & Crisis Lifeline", how: "Call or text, free, 24 hours", tel: "988", sms: "988", note: "988" },
  ] },
};

const WORLD: HelpLine = { name: "Find A Helpline", how: "Free, confidential helplines in your country", url: "https://findahelpline.com" };

export function humanHelp(country: string | null | undefined): CountryHelp & { world: HelpLine } {
  const c = (country || "").toUpperCase();
  const known = HELP[c];
  if (known) return { ...known, world: WORLD };
  return { country: "", emergency: "your local emergency number (112 works in many countries)", lines: [], world: WORLD };
}
