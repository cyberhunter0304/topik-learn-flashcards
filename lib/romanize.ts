// Simple Korean romanization using Web Speech API (pronunciation handled by browser)
// For display romanization we do a basic syllable-by-syllable breakdown

const INITIALS = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h']
const VOWELS   = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i']
const FINALS   = ['','g','kk','gs','n','nj','nh','d','l','lg','lm','lb','ls','lt','lp','lh','m','b','bs','s','ss','ng','j','ch','k','t','p','h']

export function romanize(text: string): string {
  let result = ''
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const offset = code - 0xAC00
      const finalIdx   = offset % 28
      const vowelIdx   = Math.floor(offset / 28) % 21
      const initialIdx = Math.floor(offset / 28 / 21)
      result += INITIALS[initialIdx] + VOWELS[vowelIdx] + FINALS[finalIdx]
    } else {
      result += char
    }
  }
  return result
}

export function syllabify(text: string): string[] {
  const syllables: string[] = []
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code >= 0xAC00 && code <= 0xD7A3) {
      syllables.push(char)
    } else if (char !== ' ') {
      // group non-hangul together with previous or as new
      if (syllables.length > 0 && !/[\uAC00-\uD7A3]/.test(syllables[syllables.length - 1])) {
        syllables[syllables.length - 1] += char
      } else {
        syllables.push(char)
      }
    } else {
      syllables.push(' ')
    }
  }
  return syllables
}
