export function speakKorean(text: string, slow = false) {
  if (typeof window === 'undefined') return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ko-KR'
  utterance.rate = slow ? 0.45 : 0.85
  utterance.pitch = 1
  const voices = window.speechSynthesis.getVoices()
  const koreanVoice = voices.find(v => v.lang.startsWith('ko'))
  if (koreanVoice) utterance.voice = koreanVoice
  window.speechSynthesis.speak(utterance)
}
