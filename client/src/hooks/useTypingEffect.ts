import { useState, useEffect } from 'react'

const words = ["Sales & Revenue", "Conversions", "Commissions", "Customers"]

export const useTypingEffect = () => {
  const [text, setText] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = words[wordIndex]
    let timeout: ReturnType<typeof setTimeout>

    if (!isDeleting) {
      timeout = setTimeout(() => {
        setText(currentWord.substring(0, charIndex + 1))
        setCharIndex(prev => prev + 1)
        if (charIndex + 1 === currentWord.length) {
          setIsDeleting(true)
        }
      }, 100)
    } else {
      timeout = setTimeout(() => {
        setText(currentWord.substring(0, charIndex - 1))
        setCharIndex(prev => prev - 1)
        if (charIndex - 1 === 0) {
          setIsDeleting(false)
          setWordIndex(prev => (prev + 1) % words.length)
        }
      }, 50)
    }
    return () => clearTimeout(timeout)
  }, [charIndex, isDeleting, wordIndex])

  return text
}
