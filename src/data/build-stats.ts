/**
 * Large figures for «By the numbers» on home (under LJ RPG) and playbook intro.
 * Do not round differently than specified.
 */

export interface BuildStat {
  /** Final display string (also the no-JS fallback). */
  value: string;
  /** Numeric part used for count-up (prefix/suffix applied separately). */
  numeric: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
}

export const buildStatsAsOf = 'November 2026';

export const buildStats: BuildStat[] = [
  {
    value: '4.0B',
    numeric: 4.0,
    suffix: 'B',
    decimals: 1,
    label:
      'tokens through Cursor while building Life Journey RPG and its site. 250M fresh input, 16.7M written by the models, the rest cached context re-read by the assistant.',
  },
  {
    value: '$390',
    numeric: 390,
    prefix: '$',
    decimals: 0,
    label: 'paid for Cursor over 12 months, subscription plus usage.',
  },
  {
    value: '84K',
    numeric: 84,
    suffix: 'K',
    decimals: 0,
    label:
      'lines of code in the web client, server and Android part. Translations and docs not counted.',
  },
];
