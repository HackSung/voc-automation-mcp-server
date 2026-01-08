export interface PIIMatch {
  type: 'email' | 'phone' | 'ssn' | 'name' | 'address' | 'card' | 'birthDate';
  original: string;
  placeholder: string;
  position: { start: number; end: number };
}

export interface PIIMapping {
  placeholder: string;
  original: string;
  type: string;
}

export class PIIDetector {
  private patterns = {
    // Email pattern
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

    // Korean phone numbers (010-1234-5678, 01012345678, +82-10-1234-5678, 6344-9445, 6344 9445)
    phone: /(?:(?:\+82[-\s]?|0)?(?:10|11|16|17|18|19)[-\s]?\d{3,4}[-\s]?\d{4}|\d{4}[\s-]\d{4})/g,

    // Korean SSN (주민번호: 123456-1234567 or 1234561234567)
    ssn: /\b\d{6}[-\s]?[1-4]\d{6}\b/g,

    // Credit card numbers (1234-5678-9012-3456 or 1234567890123456)
    card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

    // Birth date (YYYYMMDD: 19721206)
    birthDate: /\b(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\b/g,
  };

  detect(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const counter: Record<string, number> = {
      email: 0,
      phone: 0,
      ssn: 0,
      card: 0,
      birthDate: 0,
    };

    for (const [type, pattern] of Object.entries(this.patterns)) {
      // Reset regex state
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;

      while ((match = regex.exec(text)) !== null) {
        counter[type]++;
        matches.push({
          type: type as PIIMatch['type'],
          original: match[0],
          placeholder: `[${type.toUpperCase()}_${String(counter[type]).padStart(3, '0')}]`,
          position: { start: match.index, end: regex.lastIndex },
        });
      }
    }

    // Sort by position (descending) for safe replacement
    return matches.sort((a, b) => b.position.start - a.position.start);
  }

  anonymize(
    text: string,
    piiMatches: PIIMatch[]
  ): {
    anonymizedText: string;
    mappings: PIIMapping[];
  } {
    let anonymizedText = text;
    const mappings: PIIMapping[] = [];

    // Replace from end to start to preserve indices
    for (const match of piiMatches) {
      anonymizedText =
        anonymizedText.slice(0, match.position.start) +
        match.placeholder +
        anonymizedText.slice(match.position.end);

      mappings.push({
        placeholder: match.placeholder,
        original: match.original,
        type: match.type,
      });
    }

    return { anonymizedText, mappings };
  }

  restore(anonymizedText: string, mappings: PIIMapping[]): string {
    let restoredText = anonymizedText;

    for (const mapping of mappings) {
      // Escape special regex characters in placeholder
      const escapedPlaceholder = mapping.placeholder.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );
      restoredText = restoredText.replace(
        new RegExp(escapedPlaceholder, 'g'),
        mapping.original
      );
    }

    return restoredText;
  }
}

